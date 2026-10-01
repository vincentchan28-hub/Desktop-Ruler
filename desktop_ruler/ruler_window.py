"""Ruler Window implementation using PySide6 (Qt).

Provides a frameless, floating, semi-transparent ruler with physical mm/cm markings,
mouse dragging, resize handles, reading guide mode, toast alerts, click-through mode,
embedded brand logo rendering, configurable whole-ruler vertical movement,
and integration with the dedicated tabbed Settings Dialog.
"""

import sys
import os
from typing import Optional
from PySide6.QtCore import Qt, QPoint, QRect, QSize, QTimer
from PySide6.QtGui import (
    QPainter,
    QColor,
    QPen,
    QFont,
    QPixmap,
    QMouseEvent,
    QPaintEvent,
    QAction,
    QCursor,
)
from PySide6.QtWidgets import (
    QWidget,
    QMenu,
    QApplication,
)
from desktop_ruler.settings import SettingsManager
from desktop_ruler.settings_dialog import SettingsDialog
from desktop_ruler.calculator_widget import CalculatorWindow


class DesktopRuler(QWidget):
    """Frameless, floating, draggable on-screen ruler with logo branding & settings."""

    RESIZE_MARGIN = 14

    def __init__(self, settings_manager: Optional[SettingsManager] = None):
        super().__init__()
        self.settings = settings_manager or SettingsManager()
        self.hotkey_manager = None
        self._settings_dialog: Optional[SettingsDialog] = None
        self._calc_window = None

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setMouseTracking(True)

        win_cfg = self.settings.data.get("window", {})
        self.setGeometry(
            win_cfg.get("x", 200),
            win_cfg.get("y", 200),
            win_cfg.get("width", 600),
            win_cfg.get("height", 85),
        )
        self.setMinimumSize(QSize(180, 45))

        app_cfg = self.settings.data.get("appearance", {})
        self.ruler_color = QColor(app_cfg.get("color", "#FBBF24"))
        self.opacity = float(app_cfg.get("opacity", 0.85))
        self.text_color = QColor(app_cfg.get("text_color", "#1F2937"))
        self.tick_color = QColor(app_cfg.get("tick_color", "#374151"))
        self._update_text_contrast()

        guide_cfg = self.settings.data.get("reading_guide", {})
        self.reading_guide_enabled = guide_cfg.get("enabled", False)
        self.line_height = int(guide_cfg.get("line_height", 28))

        # Vertical movement step per line (configurable in settings for packing lists)
        self.move_step = int(self.settings.get("behavior", "move_step", 28))

        # Embedded Logo configuration
        self.logo_pixmap: Optional[QPixmap] = None
        self._load_logo()

        self._dragging = False
        self._resizing = False
        self._drag_start_pos = QPoint()
        self._start_geometry = QRect()
        self._click_through_active = False

        self._toast_message: str = ""
        self._toast_is_error: bool = False
        self._toast_timer = QTimer(self)
        self._toast_timer.setSingleShot(True)
        self._toast_timer.timeout.connect(self._clear_toast)

        self._save_timer = QTimer(self)
        self._save_timer.setSingleShot(True)
        self._save_timer.timeout.connect(self._save_geometry_now)

        self._cached_scaled_logo: Optional[QPixmap] = None
        self._load_logo()

    def _update_cached_logo(self) -> None:
        if self.logo_pixmap and not self.logo_pixmap.isNull():
            self._cached_scaled_logo = self.logo_pixmap.scaled(
                self.logo_size,
                self.logo_size,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
        else:
            self._cached_scaled_logo = None

    def _load_logo(self) -> None:
        """Load logo image from embedded bytecode or filesystem and cache scaled version."""
        logo_cfg = self.settings.data.get("logo", {})
        self.logo_enabled = logo_cfg.get("enabled", True)
        self.logo_x = int(logo_cfg.get("x", 10))
        self.logo_y = int(logo_cfg.get("y", 28))
        self.logo_size = int(logo_cfg.get("size", 34))

        pixmap: Optional[QPixmap] = None

        # 1. Primary: Load from embedded python bytecode (compiled into executable)
        try:
            from desktop_ruler.embedded_logo import get_embedded_logo
            pixmap = get_embedded_logo()
            if pixmap and pixmap.isNull():
                pixmap = None
        except Exception:
            pixmap = None

        # 2. Secondary fallback: check local disk paths
        if pixmap is None or pixmap.isNull():
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidates = [
                os.path.join(base_dir, "x03.png"),
                os.path.join(base_dir, "assets", "logo.png"),
            ]
            logo_path = logo_cfg.get("path", "")
            if logo_path:
                full_path = os.path.join(base_dir, logo_path) if not os.path.isabs(logo_path) else logo_path
                candidates.insert(0, full_path)

            for p in candidates:
                if os.path.exists(p):
                    pm = QPixmap(p)
                    if not pm.isNull():
                        pixmap = pm
                        break

        self.logo_pixmap = pixmap
        self._update_cached_logo()

    def reload_logo(self) -> None:
        """Reload logo settings and image from disk."""
        self._load_logo()
        self.update()

    def set_hotkey_manager(self, manager) -> None:
        self.hotkey_manager = manager

    def set_move_step(self, step: int) -> None:
        self.move_step = max(5, step)
        self.settings.set("behavior", "move_step", self.move_step)
        self.show_toast(f"Move Step: {self.move_step}px per line")

    def show_toast(self, message: str, is_error: bool = False, duration_ms: int = 2500) -> None:
        self._toast_message = message
        self._toast_is_error = is_error
        self.update()
        self._toast_timer.start(duration_ms)

    def _clear_toast(self) -> None:
        self._toast_message = ""
        self.update()

    def pixels_per_millimeter(self) -> float:
        screen = self.screen()
        dpi = screen.physicalDotsPerInch() if screen else 96.0
        if dpi < 30 or dpi > 600:
            dpi = 96.0
        return dpi / 25.4

    def handle_global_action(self, action: str) -> None:
        if action == "move_down":
            self.move_relative(0, self.move_step)
        elif action == "move_up":
            self.move_relative(0, -self.move_step)
        elif action == "toggle_visibility":
            self.toggle_visibility()
        elif action == "toggle_always_on_top":
            self.toggle_always_on_top()
        elif action == "increase_length":
            self.adjust_length(30)
        elif action == "decrease_length":
            self.adjust_length(-30)
        elif action == "move_left":
            self.move_relative(-25, 0)
        elif action == "move_right":
            self.move_relative(25, 0)
        elif action == "increase_thickness":
            self.adjust_thickness(10)
        elif action == "decrease_thickness":
            self.adjust_thickness(-10)
        elif action == "decrease_transparency":
            self.adjust_opacity(0.08)
        elif action == "increase_transparency":
            self.adjust_opacity(-0.08)
        elif action == "toggle_click_through":
            self.toggle_click_through()

    def toggle_visibility(self) -> None:
        if self.isVisible():
            self.hide()
        else:
            self.show()
            self.raise_()
            self.activateWindow()

    def move_relative(self, dx: int, dy: int) -> None:
        self.move(self.x() + dx, self.y() + dy)
        self._schedule_save_geometry()

        if dy > 0:
            self.show_toast(f"▼ Moved Down {dy}px")
        elif dy < 0:
            self.show_toast(f"▲ Moved Up {abs(dy)}px")
        elif dx != 0:
            self.show_toast(f"Moved {'Right' if dx > 0 else 'Left'} {abs(dx)}px")

    def adjust_length(self, delta: int) -> None:
        new_w = max(self.minimumWidth(), min(2500, self.width() + delta))
        self.resize(new_w, self.height())
        self._schedule_save_geometry()
        self.update()
        self.show_toast(f"Length: {self.width()}px")

    def adjust_thickness(self, delta: int) -> None:
        new_h = max(self.minimumHeight(), min(600, self.height() + delta))
        self.resize(self.width(), new_h)
        self._schedule_save_geometry()
        self.update()
        self.show_toast(f"Thickness: {self.height()}px")

    def adjust_opacity(self, delta: float) -> None:
        self.opacity = max(0.20, min(1.0, self.opacity + delta))
        self.settings.set("appearance", "opacity", self.opacity)
        self.update()
        self.show_toast(f"Opacity: {int(self.opacity * 100)}%")

    def toggle_click_through(self) -> None:
        if sys.platform != "win32":
            self.show_toast("Click-through is supported on Windows", is_error=True)
            return

        import ctypes
        user32 = ctypes.windll.user32
        hwnd = int(self.winId())

        GWL_EXSTYLE = -20
        WS_EX_TRANSPARENT = 0x00000020
        WS_EX_LAYERED = 0x00080000

        current_style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)

        if not self._click_through_active:
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, current_style | WS_EX_TRANSPARENT | WS_EX_LAYERED)
            self._click_through_active = True
            self.show_toast("Click-Through ON (Win+Shift+C to exit)", duration_ms=4500)
        else:
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, current_style & ~WS_EX_TRANSPARENT)
            self._click_through_active = False
            self.show_toast("Click-Through OFF")

    def open_settings_dialog(self) -> None:
        if self._settings_dialog is None:
            self._settings_dialog = SettingsDialog(parent=None, settings_manager=self.settings)
            self._settings_dialog.appearance_changed.connect(self._on_appearance_changed)
            self._settings_dialog.calculator_changed.connect(self.update)
            self._settings_dialog.reading_guide_changed.connect(self._on_guide_changed)
            self._settings_dialog.move_step_changed.connect(self.set_move_step)
            self._settings_dialog.logo_changed.connect(self.reload_logo)
            self._settings_dialog.always_on_top_changed.connect(self._on_always_on_top_changed)
            self._settings_dialog.reset_geometry_requested.connect(self.reset_default_size)
            self._settings_dialog.reset_defaults_requested.connect(self._on_defaults_restored)
            if self.hotkey_manager:
                self._settings_dialog.hotkey_rebound.connect(self.hotkey_manager.rebind_hotkey)

        self._settings_dialog.show()
        self._settings_dialog.raise_()
        self._settings_dialog.activateWindow()

    def _on_appearance_changed(self, hex_color: str, opacity: float):
        self.ruler_color = QColor(hex_color)
        self.opacity = opacity
        self._update_text_contrast()
        self.update()

    def _on_guide_changed(self, enabled: bool, line_height: int):
        self.reading_guide_enabled = enabled
        self.line_height = line_height
        self.update()

    def _on_always_on_top_changed(self, enabled: bool):
        current_flags = self.windowFlags()
        if enabled:
            self.setWindowFlags(current_flags | Qt.WindowType.WindowStaysOnTopHint)
        else:
            self.setWindowFlags(current_flags & ~Qt.WindowType.WindowStaysOnTopHint)
        self.show()

    def _on_defaults_restored(self):
        self.ruler_color = QColor("#FBBF24")
        self.opacity = 0.85
        self.reading_guide_enabled = False
        self.line_height = 28
        self.move_step = 28
        self._load_logo()
        self._update_text_contrast()
        self.show_toast("All settings restored to defaults")
        self.update()

    def _update_text_contrast(self):
        lum = (self.ruler_color.red() * 0.299 + self.ruler_color.green() * 0.587 + self.ruler_color.blue() * 0.114)
        if lum < 128:
            self.text_color = QColor("#F9FAFB")
            self.tick_color = QColor("#D1D5DB")
        else:
            self.text_color = QColor("#1F2937")
            self.tick_color = QColor("#374151")

    def paintEvent(self, event: QPaintEvent) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        w = self.width()
        h = self.height()

        # 1. Ruler Body Background
        bg_color = QColor(self.ruler_color)
        bg_color.setAlphaF(self.opacity)
        painter.setBrush(bg_color)

        border_pen = QPen(self.tick_color)
        border_pen.setWidth(1)
        border_pen.setColor(QColor(self.tick_color.red(), self.tick_color.green(), self.tick_color.blue(), 190))
        painter.setPen(border_pen)
        painter.drawRoundedRect(0, 0, w - 1, h - 1, 6, 6)

        # 2. Reading Guide Mode
        if self.reading_guide_enabled:
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QColor(0, 0, 0, 75))
            guide_y = max(8, (h - self.line_height) // 2)
            painter.drawRect(1, 1, w - 2, guide_y)
            bottom_y = guide_y + self.line_height
            if bottom_y < h:
                painter.drawRect(1, bottom_y, w - 2, h - bottom_y - 1)

            guide_edge_pen = QPen(QColor(239, 68, 68, 220), 1.5, Qt.PenStyle.DashLine)
            painter.setPen(guide_edge_pen)
            painter.drawLine(4, guide_y, w - 4, guide_y)
            painter.drawLine(4, bottom_y, w - 4, bottom_y)

        # 3. Draw Embedded Logo on the Left
        if self.logo_enabled and self._cached_scaled_logo and not self._cached_scaled_logo.isNull():
            painter.drawPixmap(self.logo_x, self.logo_y, self._cached_scaled_logo)

        # 4. Ticks and Centimetre Numbers
        px_per_mm = self.pixels_per_millimeter()
        # Origin starts gracefully; if logo is placed at the top tick line, shift origin
        origin_x = 16.0
        if self.logo_enabled and self.logo_pixmap and self.logo_y < 24:
            origin_x = max(16.0, float(self.logo_x + self.logo_size + 8))

        max_x = float(w - 20)

        font = QFont("Segoe UI", 8)
        font.setBold(True)
        painter.setFont(font)
        tick_pen = QPen(self.tick_color, 1)

        mm_idx = 0
        while True:
            cur_x = origin_x + (mm_idx * px_per_mm)
            if cur_x > max_x:
                break

            is_cm = (mm_idx % 10 == 0)
            is_half_cm = (mm_idx % 5 == 0)

            if is_cm:
                tick_len = min(22, h * 0.32)
                tick_pen.setWidth(2)
                tick_pen.setColor(self.tick_color)
                painter.setPen(tick_pen)
            elif is_half_cm:
                tick_len = min(15, h * 0.22)
                tick_pen.setWidth(1)
                tick_pen.setColor(self.tick_color)
                painter.setPen(tick_pen)
            else:
                tick_len = min(9, h * 0.14)
                tick_pen.setWidth(1)
                faint = QColor(self.tick_color)
                faint.setAlpha(150)
                tick_pen.setColor(faint)
                painter.setPen(tick_pen)

            painter.drawLine(int(cur_x), 1, int(cur_x), int(1 + tick_len))

            if is_cm:
                cm_val = mm_idx // 10
                painter.setPen(self.text_color)
                text_rect = QRect(int(cur_x - 15), int(1 + tick_len + 3), 30, 16)
                painter.drawText(text_rect, Qt.AlignmentFlag.AlignCenter, str(cm_val))

            mm_idx += 1

        self._draw_calc_icon(painter)

        # 5. Right-side resize grip dots
        painter.setPen(Qt.PenStyle.NoPen)
        grip_color = QColor(self.tick_color)
        grip_color.setAlpha(130)
        painter.setBrush(grip_color)
        grip_x = w - 8
        mid_y = h // 2
        for offset in (-8, 0, 8):
            painter.drawEllipse(grip_x, mid_y + offset, 3, 3)

        # 6. Toast Notification Banner
        if self._toast_message:
            font_toast = QFont("Segoe UI", 8)
            font_toast.setBold(True)
            painter.setFont(font_toast)

            toast_text = self._toast_message
            text_metrics = painter.fontMetrics()
            toast_w = text_metrics.horizontalAdvance(toast_text) + 24
            toast_h = 24
            toast_x = max(10, (w - toast_w) // 2)
            toast_y = h - toast_h - 6

            pill_bg = QColor(220, 38, 38, 220) if self._toast_is_error else QColor(30, 41, 59, 230)
            painter.setBrush(pill_bg)
            painter.setPen(QPen(QColor(245, 158, 11, 220) if self._toast_is_error else QColor(148, 163, 184, 180), 1))
            painter.drawRoundedRect(toast_x, toast_y, toast_w, toast_h, 12, 12)

            painter.setPen(QColor("#FFFFFF"))
            painter.drawText(QRect(toast_x, toast_y, toast_w, toast_h), Qt.AlignmentFlag.AlignCenter, toast_text)

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            if self._calc_rect().contains(event.position().toPoint()):
                self.open_calculator()
            elif event.position().x() >= (self.width() - self.RESIZE_MARGIN):
                self._resizing = True
                self._drag_start_pos = event.globalPosition().toPoint()
                self._start_geometry = self.geometry()
            else:
                self._dragging = True
                self._drag_start_pos = event.position().toPoint()
        elif event.button() == Qt.MouseButton.RightButton:
            self._show_context_menu(event.globalPosition().toPoint())

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        x_pos = event.position().x()
        if not self._dragging and not self._resizing:
            if x_pos >= (self.width() - self.RESIZE_MARGIN):
                self.setCursor(QCursor(Qt.CursorShape.SizeHorCursor))
            else:
                self.setCursor(QCursor(Qt.CursorShape.SizeAllCursor))

        if self._resizing:
            delta_x = event.globalPosition().toPoint().x() - self._drag_start_pos.x()
            new_width = max(self.minimumWidth(), self._start_geometry.width() + delta_x)
            self.resize(new_width, self.height())
        elif self._dragging:
            new_pos = event.globalPosition().toPoint() - self._drag_start_pos
            self.move(new_pos.x(), new_pos.y())

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._dragging = False
            self._resizing = False
            self._save_geometry_now()

    def _schedule_save_geometry(self) -> None:
        """Debounce geometry saving so rapid movements don't thrash disk I/O."""
        self._save_timer.start(400)

    def _save_geometry_now(self) -> None:
        """Save geometry in a single batch write instead of multiple blocking disk writes."""
        self.settings.data.setdefault("window", {})
        self.settings.data["window"].update({
            "x": self.x(),
            "y": self.y(),
            "width": self.width(),
            "height": self.height(),
        })
        self.settings.save()

    def _save_geometry(self) -> None:
        self._save_geometry_now()

    def keyPressEvent(self, event) -> None:
        key = event.key()
        modifiers = event.modifiers()

        if modifiers & Qt.KeyboardModifier.AltModifier:
            if key == Qt.Key.Key_Up:
                self.adjust_thickness(5)
                return
            elif key == Qt.Key.Key_Down:
                self.adjust_thickness(-5)
                return

        # Up and Down: MOVE the ENTIRE ruler vertically (packing list navigation)
        if key in (Qt.Key.Key_Down, Qt.Key.Key_J):
            self.move_relative(0, self.move_step)
        elif key in (Qt.Key.Key_Up, Qt.Key.Key_K):
            self.move_relative(0, -self.move_step)
        elif key in (Qt.Key.Key_Right, Qt.Key.Key_L):
            self.move_relative(20, 0)
        elif key in (Qt.Key.Key_Left, Qt.Key.Key_H):
            self.move_relative(-20, 0)
        elif key in (Qt.Key.Key_Plus, Qt.Key.Key_Equal):
            self.adjust_length(20)
        elif key in (Qt.Key.Key_Minus, Qt.Key.Key_Underscore):
            self.adjust_length(-20)
        elif key == Qt.Key.Key_G:
            self.toggle_reading_guide()
        elif key == Qt.Key.Key_S:
            self.open_settings_dialog()
        elif key == Qt.Key.Key_Escape:
            self.hide()
        else:
            super().keyPressEvent(event)
            return

        self._save_geometry()
        self.update()

    def _show_context_menu(self, global_pos: QPoint) -> None:
        menu = QMenu(self)

        settings_act = QAction("⚙ Settings (Preferences, Logo & Hotkeys)...", self)
        font = settings_act.font()
        font.setBold(True)
        settings_act.setFont(font)
        settings_act.triggered.connect(self.open_settings_dialog)
        menu.addAction(settings_act)

        menu.addSeparator()

        down_act = QAction(f"▼ Move Down 1 Line ({self.move_step}px)", self)
        down_act.triggered.connect(lambda: self.move_relative(0, self.move_step))
        menu.addAction(down_act)

        up_act = QAction(f"▲ Move Up 1 Line ({self.move_step}px)", self)
        up_act.triggered.connect(lambda: self.move_relative(0, -self.move_step))
        menu.addAction(up_act)

        menu.addSeparator()

        guide_act = QAction("Reading Guide Mode", self)
        guide_act.setCheckable(True)
        guide_act.setChecked(self.reading_guide_enabled)
        guide_act.triggered.connect(self.toggle_reading_guide)
        menu.addAction(guide_act)

        top_act = QAction("Always on Top", self)
        top_act.setCheckable(True)
        top_act.setChecked(bool(self.windowFlags() & Qt.WindowType.WindowStaysOnTopHint))
        top_act.triggered.connect(self.toggle_always_on_top)
        menu.addAction(top_act)

        click_act = QAction("Click-Through Mode (Win+Shift+C)", self)
        click_act.setCheckable(True)
        click_act.setChecked(self._click_through_active)
        click_act.triggered.connect(self.toggle_click_through)
        menu.addAction(click_act)

        menu.addSeparator()

        reset_act = QAction("Reset to Default Size (600×85)", self)
        reset_act.triggered.connect(self.reset_default_size)
        menu.addAction(reset_act)

        exit_act = QAction("Exit Desktop Ruler", self)
        exit_act.triggered.connect(QApplication.instance().quit)
        menu.addAction(exit_act)

        menu.exec(global_pos)

    def toggle_reading_guide(self) -> None:
        self.reading_guide_enabled = not self.reading_guide_enabled
        self.settings.set("reading_guide", "enabled", self.reading_guide_enabled)
        self.update()
        self.show_toast("Reading Guide " + ("ON" if self.reading_guide_enabled else "OFF"))

    def toggle_always_on_top(self) -> None:
        current_flags = self.windowFlags()
        if current_flags & Qt.WindowType.WindowStaysOnTopHint:
            self.setWindowFlags(current_flags & ~Qt.WindowType.WindowStaysOnTopHint)
            self.settings.set("behavior", "always_on_top", False)
            self.show_toast("Always on Top: Disabled")
        else:
            self.setWindowFlags(current_flags | Qt.WindowType.WindowStaysOnTopHint)
            self.settings.set("behavior", "always_on_top", True)
            self.show_toast("Always on Top: Enabled")
        self.show()

    def _calc_rect(self) -> QRect:
        if not self.settings.get("calculator", "enabled", True):
            return QRect()
        size, margin = 16, 6
        if self.settings.get("calculator", "corner", "bottom_right") == "bottom_left":
            x = margin
            if self.logo_enabled and self._cached_scaled_logo is not None:
                x = self.logo_x + self.logo_size + 4
        else:
            x = self.width() - size - self.RESIZE_MARGIN - 4
        return QRect(x, self.height() - size - margin, size, size)

    def _draw_calc_icon(self, painter) -> None:
        r = self._calc_rect()
        if r.isNull():
            return
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(QPen(QColor(0, 0, 0), 1))
        painter.drawRoundedRect(r.adjusted(0, 0, -1, -1), 2, 2)
        painter.drawRect(r.x() + 3, r.y() + 3, r.width() - 7, 3)
        for i in range(3):
            for j in range(3):
                painter.drawPoint(r.x() + 4 + i * 3, r.y() + 8 + j * 3)

    def open_calculator(self) -> None:
        w = int(self.settings.get("calculator", "width", 240))
        h = int(self.settings.get("calculator", "height", 330))
        self._calc_window = CalculatorWindow(w, h)
        self._calc_window.size_changed.connect(self._save_calc_size)
        r = self._calc_rect()
        pos = self.mapToGlobal(r.topLeft())
        y = pos.y() - h - 10
        if y < 0:
            y = pos.y() + r.height() + 10
        self._calc_window.move(pos.x(), y)
        self._calc_window.show()
        self._calc_window.raise_()
        self._calc_window.activateWindow()

    def _save_calc_size(self, w: int, h: int) -> None:
        self.settings.set("calculator", "width", w)
        self.settings.set("calculator", "height", h)

    def reset_default_size(self) -> None:
        self.setGeometry(self.x(), self.y(), 600, 85)
        self._save_geometry()
        self.update()
        self.show_toast("Reset to 600×85 px")
