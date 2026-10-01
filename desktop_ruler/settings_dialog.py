"""Settings Dialog for Desktop Ruler.

Provides a responsive, scrollable tabbed settings window with:
- General Tab: Window behaviors, configurable line move step (for packing lists), reading guide, reset dimensions.
- Appearance Tab: Preset colors, transparency, and Logo & Branding controls (upload file, position X/Y, size).
- Shortcuts Tab: Comprehensive global shortcut list, interactive key recording, and preset switching.
"""

import os
import shutil
from typing import Optional, Dict
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtGui import QColor, QKeySequence, QPixmap
from PySide6.QtWidgets import (
    QDialog,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QTabWidget,
    QLabel,
    QPushButton,
    QCheckBox,
    QSlider,
    QScrollArea,
    QFrame,
    QColorDialog,
    QFileDialog,
    QMessageBox,
)
from desktop_ruler.settings import SettingsManager, DEFAULT_SETTINGS


class KeyRecordButton(QPushButton):
    """Button that listens for a key combination when clicked."""
    key_recorded = Signal(int, int, str)

    def __init__(self, current_text: str = ""):
        super().__init__(current_text or "Record Key")
        self.is_recording = False
        self._default_text = current_text
        self.setCheckable(True)
        self.clicked.connect(self._toggle_recording)
        self.setStyleSheet("""
            QPushButton {
                background-color: #1E293B;
                color: #F8FAFC;
                border: 1px solid #475569;
                border-radius: 4px;
                padding: 4px 10px;
                font-family: Consolas, monospace;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #334155;
                border-color: #F59E0B;
            }
            QPushButton:checked {
                background-color: #F59E0B;
                color: #0F172A;
                font-weight: bold;
                border-color: #D97706;
            }
        """)

    def _toggle_recording(self, checked: bool):
        self.is_recording = checked
        if checked:
            self.setText("Press shortcut keys...")
            self.grabKeyboard()
        else:
            self.setText(self._default_text)
            self.releaseKeyboard()

    def set_key_text(self, text: str):
        self._default_text = text
        self.setText(text)
        self.setChecked(False)
        self.is_recording = False

    def keyPressEvent(self, event):
        if not self.is_recording:
            super().keyPressEvent(event)
            return

        key = event.key()
        modifiers = event.modifiers()

        if key in (Qt.Key.Key_Control, Qt.Key.Key_Shift, Qt.Key.Key_Alt, Qt.Key.Key_Meta):
            return

        mod_win32 = 0x4000  # MOD_NOREPEAT
        parts = []

        if modifiers & Qt.KeyboardModifier.MetaModifier:
            mod_win32 |= 0x0008
            parts.append("Win")
        if modifiers & Qt.KeyboardModifier.ControlModifier:
            mod_win32 |= 0x0002
            parts.append("Ctrl")
        if modifiers & Qt.KeyboardModifier.AltModifier:
            mod_win32 |= 0x0001
            parts.append("Alt")
        if modifiers & Qt.KeyboardModifier.ShiftModifier:
            mod_win32 |= 0x0004
            parts.append("Shift")

        key_str = QKeySequence(key).toString()
        parts.append(key_str)
        combo_text = " + ".join(parts)

        vk_code = event.nativeVirtualKey() if hasattr(event, "nativeVirtualKey") else key

        self.releaseKeyboard()
        self.setChecked(False)
        self.is_recording = False
        self.set_key_text(combo_text)
        self.key_recorded.emit(mod_win32, vk_code, combo_text)


class SettingsDialog(QDialog):
    """Tabbed dialog for managing Desktop Ruler settings with scrollable content."""

    appearance_changed = Signal(str, float)
    reading_guide_changed = Signal(bool, int)
    move_step_changed = Signal(int)
    logo_changed = Signal()
    always_on_top_changed = Signal(bool)
    reset_geometry_requested = Signal()
    hotkey_rebound = Signal(str, int, int, str)
    reset_defaults_requested = Signal()

    def __init__(self, parent=None, settings_manager: Optional[SettingsManager] = None):
        super().__init__(parent)
        self.settings = settings_manager or SettingsManager()

        self.setWindowTitle("Desktop Ruler Settings")
        self.resize(500, 460)
        self.setMinimumSize(QSize(380, 320))
        self.setSizeGripEnabled(True)

        self.setStyleSheet("""
            QDialog {
                background-color: #0F172A;
                color: #F8FAFC;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }
            QTabWidget::pane {
                border: 1px solid #334155;
                background-color: #1E293B;
                border-radius: 8px;
                top: -1px;
            }
            QTabBar::tab {
                background-color: #0F172A;
                color: #94A3B8;
                padding: 7px 14px;
                margin-right: 3px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                border: 1px solid #1E293B;
                font-weight: 600;
                font-size: 11px;
            }
            QTabBar::tab:selected {
                background-color: #1E293B;
                color: #F59E0B;
                border: 1px solid #334155;
                border-bottom: 1px solid #1E293B;
            }
            QTabBar::tab:hover:!selected {
                background-color: #1E293B;
                color: #F1F5F9;
            }
            QLabel {
                color: #E2E8F0;
                font-size: 12px;
            }
            QCheckBox {
                color: #E2E8F0;
                font-size: 12px;
                spacing: 8px;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
                border-radius: 4px;
                border: 1px solid #475569;
                background-color: #0F172A;
            }
            QCheckBox::indicator:checked {
                background-color: #F59E0B;
                border-color: #D97706;
            }
            QSlider::groove:horizontal {
                height: 6px;
                background: #334155;
                border-radius: 3px;
            }
            QSlider::sub-page:horizontal {
                background: #F59E0B;
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: #F8FAFC;
                border: 1px solid #CBD5E1;
                width: 16px;
                margin-top: -5px;
                margin-bottom: -5px;
                border-radius: 8px;
            }
            QSlider::handle:horizontal:hover {
                background: #FFFFFF;
                border-color: #F59E0B;
            }
            QScrollArea {
                border: none;
                background-color: transparent;
            }
            QScrollBar:vertical {
                background: #0F172A;
                width: 8px;
                margin: 0px;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical {
                background: #475569;
                min-height: 20px;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical:hover {
                background: #F59E0B;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
        """)

        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(12, 12, 12, 12)
        main_layout.setSpacing(10)

        self.tabs = QTabWidget(self)
        main_layout.addWidget(self.tabs)

        self._build_general_tab()
        self._build_appearance_tab()
        self._build_shortcuts_tab()

        # Bottom Bar: Always pinned and fully visible
        bottom_bar = QHBoxLayout()
        self.btn_restore = QPushButton("Restore All Defaults", self)
        self.btn_restore.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #EF4444;
                border: 1px solid #7F1D1D;
                border-radius: 6px;
                padding: 6px 14px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #450A0A;
                border-color: #DC2626;
            }
        """)
        self.btn_restore.clicked.connect(self._restore_defaults)
        bottom_bar.addWidget(self.btn_restore)

        bottom_bar.addStretch()

        self.btn_close = QPushButton("Close", self)
        self.btn_close.setStyleSheet("""
            QPushButton {
                background-color: #F59E0B;
                color: #0F172A;
                border: none;
                border-radius: 6px;
                padding: 6px 18px;
                font-weight: bold;
                font-size: 12px;
            }
            QPushButton:hover { background-color: #FBBF24; }
        """)
        self.btn_close.clicked.connect(self.accept)
        bottom_bar.addWidget(self.btn_close)

        main_layout.addLayout(bottom_bar)

    def _build_general_tab(self):
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)

        content = QWidget()
        layout = QVBoxLayout(content)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        # 1. Configurable Move Step for Packing Lists
        lbl_sec1 = QLabel("<b>Vertical Move Step (Packing List)</b>")
        lbl_sec1.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_sec1)

        desc_step = QLabel("Distance the entire ruler shifts up or down per key press:")
        desc_step.setStyleSheet("color: #94A3B8; font-size: 11px;")
        layout.addWidget(desc_step)

        row_step = QHBoxLayout()
        self.slider_move_step = QSlider(Qt.Orientation.Horizontal)
        self.slider_move_step.setRange(5, 120)
        current_step = int(self.settings.get("behavior", "move_step", 28))
        self.slider_move_step.setValue(current_step)
        self.lbl_move_step_val = QLabel(f"{current_step} px / step")
        self.lbl_move_step_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; color: #F59E0B; min-width: 85px;")
        self.slider_move_step.valueChanged.connect(self._on_move_step_slider)
        row_step.addWidget(self.slider_move_step)
        row_step.addWidget(self.lbl_move_step_val)
        layout.addLayout(row_step)

        # 2. Window Behavior
        layout.addSpacing(6)
        lbl_sec2 = QLabel("<b>Window Behavior</b>")
        lbl_sec2.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_sec2)

        self.cb_always_on_top = QCheckBox("Keep Ruler Always on Top of other windows")
        is_top = self.settings.get("behavior", "always_on_top", True)
        self.cb_always_on_top.setChecked(is_top)
        self.cb_always_on_top.toggled.connect(self._on_always_on_top_toggled)
        layout.addWidget(self.cb_always_on_top)

        # 3. Reading Guide Mode
        layout.addSpacing(6)
        lbl_sec3 = QLabel("<b>Reading Guide Mode</b>")
        lbl_sec3.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_sec3)

        self.cb_guide_enable = QCheckBox("Enable Reading Guide (dims surrounding document text)")
        guide_cfg = self.settings.data.get("reading_guide", {})
        self.cb_guide_enable.setChecked(guide_cfg.get("enabled", False))
        self.cb_guide_enable.toggled.connect(self._on_guide_toggled)
        layout.addWidget(self.cb_guide_enable)

        row_line = QHBoxLayout()
        row_line.addWidget(QLabel("Reading Slot Height:"))
        self.slider_line_height = QSlider(Qt.Orientation.Horizontal)
        self.slider_line_height.setRange(16, 120)
        curr_lh = int(guide_cfg.get("line_height", 28))
        self.slider_line_height.setValue(curr_lh)
        self.lbl_line_height_val = QLabel(f"{curr_lh} px")
        self.lbl_line_height_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; color: #F59E0B; min-width: 55px;")
        self.slider_line_height.valueChanged.connect(self._on_guide_slider)
        row_line.addWidget(self.slider_line_height)
        row_line.addWidget(self.lbl_line_height_val)
        layout.addLayout(row_line)

        # 4. Window Dimensions Reset
        layout.addSpacing(6)
        lbl_sec4 = QLabel("<b>Ruler Size & Position</b>")
        lbl_sec4.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_sec4)

        row_reset = QHBoxLayout()
        btn_reset_geo = QPushButton("Reset Ruler to Default Size (600×85 px)")
        btn_reset_geo.setStyleSheet("""
            QPushButton {
                background-color: #334155;
                color: #F8FAFC;
                border: 1px solid #475569;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover { background-color: #475569; }
        """)
        btn_reset_geo.clicked.connect(self.reset_geometry_requested.emit)
        row_reset.addWidget(btn_reset_geo)
        row_reset.addStretch()
        layout.addLayout(row_reset)

        layout.addStretch()
        scroll.setWidget(content)
        self.tabs.addTab(scroll, "General")

    def _on_move_step_slider(self, step: int):
        self.lbl_move_step_val.setText(f"{step} px / step")
        self.settings.set("behavior", "move_step", step)
        self.move_step_changed.emit(step)

    def _on_always_on_top_toggled(self, checked: bool):
        self.settings.set("behavior", "always_on_top", checked)
        self.always_on_top_changed.emit(checked)

    def _on_guide_slider(self, val: int):
        self.lbl_line_height_val.setText(f"{val} px")
        self._on_guide_toggled()

    def _on_guide_toggled(self):
        enabled = self.cb_guide_enable.isChecked()
        height = self.slider_line_height.value()
        self.settings.set("reading_guide", "enabled", enabled)
        self.settings.set("reading_guide", "line_height", height)
        self.reading_guide_changed.emit(enabled, height)

    def _build_appearance_tab(self):
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)

        content = QWidget()
        layout = QVBoxLayout(content)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        # -------------------------------------------------------------
        # Section A: Embedded Logo & Branding Controls
        # -------------------------------------------------------------
        lbl_logo_sec = QLabel("<b>Logo & Branding (Embedded in Ruler)</b>")
        lbl_logo_sec.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_logo_sec)

        logo_frame = QFrame()
        logo_frame.setStyleSheet("""
            QFrame {
                background-color: #0F172A;
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 10px;
            }
        """)
        lf_layout = QVBoxLayout(logo_frame)
        lf_layout.setSpacing(10)

        # Checkbox: Show Logo
        self.cb_logo_enable = QCheckBox("Display Embedded Logo on Left of Ruler")
        logo_cfg = self.settings.data.get("logo", {})
        self.cb_logo_enable.setChecked(logo_cfg.get("enabled", True))
        self.cb_logo_enable.toggled.connect(self._on_logo_toggled)
        lf_layout.addWidget(self.cb_logo_enable)

        # Logo Upload & Thumbnail Row
        is_locked = bool(self.settings.get("logo", "lock_for_users", True))
        row_upload = QHBoxLayout()

        self.lbl_logo_thumb = QLabel()
        self.lbl_logo_thumb.setFixedSize(40, 40)
        self.lbl_logo_thumb.setStyleSheet("background-color: #1E293B; border: 1px solid #475569; border-radius: 6px; padding: 2px;")
        self.lbl_logo_thumb.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._update_logo_thumbnail()
        row_upload.addWidget(self.lbl_logo_thumb)

        info_col = QVBoxLayout()
        info_col.setSpacing(2)
        self.lbl_logo_status = QLabel("<b>Embedded Brand Logo</b>" if is_locked else "<b>Logo Branding Configuration</b>")
        self.lbl_logo_status.setStyleSheet("color: #F8FAFC; font-size: 11px;")
        info_col.addWidget(self.lbl_logo_status)

        self.lbl_logo_subtext = QLabel("Compiled into application bytecode" if is_locked else "Choose an image to embed into executable code")
        self.lbl_logo_subtext.setStyleSheet("color: #94A3B8; font-size: 10px;")
        info_col.addWidget(self.lbl_logo_subtext)
        row_upload.addLayout(info_col)

        row_upload.addStretch()

        # Action buttons: Upload and Toggle Lock
        self.btn_upload_logo = QPushButton("📁 Upload Logo File...")
        self.btn_upload_logo.setStyleSheet("""
            QPushButton {
                background-color: #F59E0B;
                color: #0F172A;
                border-radius: 5px;
                font-weight: bold;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover { background-color: #FBBF24; }
        """)
        self.btn_upload_logo.clicked.connect(self._upload_logo_file)
        self.btn_upload_logo.setVisible(not is_locked)
        row_upload.addWidget(self.btn_upload_logo)

        self.btn_lock_logo = QPushButton("🔒 Lock for Users" if not is_locked else "⚙ Change Logo (Dev)")
        self.btn_lock_logo.setStyleSheet("""
            QPushButton {
                background-color: #334155;
                color: #CBD5E1;
                border: 1px solid #475569;
                border-radius: 5px;
                padding: 6px 10px;
                font-size: 11px;
            }
            QPushButton:hover { background-color: #475569; }
        """)
        self.btn_lock_logo.clicked.connect(self._toggle_logo_lock)
        row_upload.addWidget(self.btn_lock_logo)

        lf_layout.addLayout(row_upload)

        # Position Controls: Horizontal X and Vertical Y Sliders
        pos_x_row = QHBoxLayout()
        pos_x_row.addWidget(QLabel("Left Offset (X):"))
        self.slider_logo_x = QSlider(Qt.Orientation.Horizontal)
        self.slider_logo_x.setRange(0, 150)
        curr_x = int(logo_cfg.get("x", 10))
        self.slider_logo_x.setValue(curr_x)
        self.lbl_logo_x_val = QLabel(f"{curr_x} px")
        self.lbl_logo_x_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; color: #F59E0B; min-width: 48px;")
        self.slider_logo_x.valueChanged.connect(self._on_logo_prop_changed)
        pos_x_row.addWidget(self.slider_logo_x)
        pos_x_row.addWidget(self.lbl_logo_x_val)
        lf_layout.addLayout(pos_x_row)

        pos_y_row = QHBoxLayout()
        pos_y_row.addWidget(QLabel("Top Offset (Y):"))
        self.slider_logo_y = QSlider(Qt.Orientation.Horizontal)
        self.slider_logo_y.setRange(0, 120)
        curr_y = int(logo_cfg.get("y", 28))
        self.slider_logo_y.setValue(curr_y)
        self.lbl_logo_y_val = QLabel(f"{curr_y} px")
        self.lbl_logo_y_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; color: #F59E0B; min-width: 48px;")
        self.slider_logo_y.valueChanged.connect(self._on_logo_prop_changed)
        pos_y_row.addWidget(self.slider_logo_y)
        pos_y_row.addWidget(self.lbl_logo_y_val)
        lf_layout.addLayout(pos_y_row)

        # Size Control: Logo Height / Width Slider
        size_row = QHBoxLayout()
        size_row.addWidget(QLabel("Logo Size:"))
        self.slider_logo_size = QSlider(Qt.Orientation.Horizontal)
        self.slider_logo_size.setRange(16, 80)
        curr_size = int(logo_cfg.get("size", 34))
        self.slider_logo_size.setValue(curr_size)
        self.lbl_logo_size_val = QLabel(f"{curr_size} px")
        self.lbl_logo_size_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; color: #F59E0B; min-width: 48px;")
        self.slider_logo_size.valueChanged.connect(self._on_logo_prop_changed)
        size_row.addWidget(self.slider_logo_size)
        size_row.addWidget(self.lbl_logo_size_val)
        lf_layout.addLayout(size_row)

        layout.addWidget(logo_frame)

        # -------------------------------------------------------------
        # Section B: Ruler Color Scheme
        # -------------------------------------------------------------
        layout.addSpacing(6)
        lbl_color = QLabel("<b>Ruler Color Scheme</b>")
        lbl_color.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_color)

        palette_row = QHBoxLayout()
        presets = [
            ("Amber", "#FBBF24"),
            ("Cyan", "#38BDF8"),
            ("Emerald", "#34D399"),
            ("Ruby", "#F87171"),
            ("White", "#F3F4F6"),
            ("Slate", "#1E293B"),
        ]
        current_hex = self.settings.get("appearance", "color", "#FBBF24")

        for name, hex_val in presets:
            btn = QPushButton(name)
            btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: {hex_val};
                    color: {"#0F172A" if name != "Slate" else "#FFFFFF"};
                    font-weight: bold;
                    border: 2px solid {"#FFFFFF" if hex_val == current_hex else "#334155"};
                    border-radius: 6px;
                    padding: 5px 10px;
                    font-size: 11px;
                }}
            """)
            btn.clicked.connect(lambda ch, h=hex_val: self._apply_color(h))
            palette_row.addWidget(btn)

        layout.addLayout(palette_row)

        btn_custom = QPushButton("Pick Custom Color...")
        btn_custom.setStyleSheet("""
            QPushButton {
                background-color: #334155;
                color: #F8FAFC;
                border: 1px solid #475569;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover { background-color: #475569; }
        """)
        btn_custom.clicked.connect(self._pick_custom_color)
        layout.addWidget(btn_custom)

        # -------------------------------------------------------------
        # Section C: Transparency (Opacity)
        # -------------------------------------------------------------
        layout.addSpacing(6)
        lbl_opacity = QLabel("<b>Transparency (Opacity)</b>")
        lbl_opacity.setStyleSheet("color: #F59E0B; font-size: 12px;")
        layout.addWidget(lbl_opacity)

        row_op = QHBoxLayout()
        self.slider_opacity = QSlider(Qt.Orientation.Horizontal)
        self.slider_opacity.setRange(20, 100)
        curr_op = int(self.settings.get("appearance", "opacity", 0.85) * 100)
        self.slider_opacity.setValue(curr_op)

        self.lbl_op_val = QLabel(f"{curr_op}%")
        self.lbl_op_val.setStyleSheet("font-family: Consolas, monospace; font-weight: bold; min-width: 40px;")

        self.slider_opacity.valueChanged.connect(self._on_opacity_slider)
        row_op.addWidget(self.slider_opacity)
        row_op.addWidget(self.lbl_op_val)
        layout.addLayout(row_op)

        layout.addStretch()
        scroll.setWidget(content)
        self.tabs.addTab(scroll, "Appearance")

    def _on_logo_toggled(self, checked: bool):
        self.settings.set("logo", "enabled", checked)
        self.logo_changed.emit()

    def _on_logo_prop_changed(self):
        x = self.slider_logo_x.value()
        y = self.slider_logo_y.value()
        size = self.slider_logo_size.value()
        self.lbl_logo_x_val.setText(f"{x} px")
        self.lbl_logo_y_val.setText(f"{y} px")
        self.lbl_logo_size_val.setText(f"{size} px")

        self.settings.set("logo", "x", x)
        self.settings.set("logo", "y", y)
        self.settings.set("logo", "size", size)
        self.logo_changed.emit()

    def _toggle_logo_lock(self):
        is_locked = bool(self.settings.get("logo", "lock_for_users", True))
        new_lock = not is_locked
        self.settings.set("logo", "lock_for_users", new_lock)
        self.btn_upload_logo.setVisible(not new_lock)
        self.btn_lock_logo.setText("🔒 Lock for Users" if not new_lock else "⚙ Change Logo (Dev)")
        self.lbl_logo_status.setText("<b>Embedded Brand Logo</b>" if new_lock else "<b>Logo Branding Configuration</b>")
        self.lbl_logo_subtext.setText("Compiled into application bytecode" if new_lock else "Choose an image to embed into executable code")
        if new_lock:
            QMessageBox.information(
                self,
                "Logo Locked for Release",
                "Logo is now locked for users! When compiled, end users will not see any option to upload or change the logo."
            )

    def _update_logo_thumbnail(self):
        # 1. Check embedded bytecode
        try:
            from desktop_ruler.embedded_logo import get_embedded_logo
            pm = get_embedded_logo()
            if pm and not pm.isNull():
                scaled = pm.scaled(36, 36, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                self.lbl_logo_thumb.setPixmap(scaled)
                return
        except Exception:
            pass

        # 2. Check disk paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(base_dir, "x03.png"),
            os.path.join(base_dir, "assets", "logo.png"),
        ]
        logo_rel = self.settings.get("logo", "path", "")
        if logo_rel:
            full_path = os.path.join(base_dir, logo_rel) if not os.path.isabs(logo_rel) else logo_rel
            candidates.insert(0, full_path)

        for p in candidates:
            if os.path.exists(p):
                pm = QPixmap(p)
                if not pm.isNull():
                    scaled = pm.scaled(36, 36, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                    self.lbl_logo_thumb.setPixmap(scaled)
                    return
        self.lbl_logo_thumb.setText("No Logo")

    def _upload_logo_file(self):
        """Open a file dialog to pick an image, bake it into embedded_logo.py and assets/logo.png."""
        chosen_file, _ = QFileDialog.getOpenFileName(
            self,
            "Select Logo Image to Embed into Executable",
            "",
            "Image Files (*.png *.jpg *.jpeg *.svg *.ico *.bmp)"
        )
        if not chosen_file:
            return

        try:
            from desktop_ruler.embed_logo import embed_logo_file
            success = embed_logo_file(chosen_file)
            if success:
                self.settings.set("logo", "path", "assets/logo.png")
                self.settings.set("logo", "enabled", True)
                self.cb_logo_enable.setChecked(True)
                self._update_logo_thumbnail()
                self.logo_changed.emit()
                QMessageBox.information(
                    self,
                    "Logo Embedded Permanently",
                    "Logo successfully embedded into application Python code!\n\n"
                    "File: desktop_ruler/embedded_logo.py\n\n"
                    "When compiled, this logo will stay permanently inside the executable "
                    "and will never be lost or deleted."
                )
            else:
                QMessageBox.critical(self, "Upload Failed", "Could not embed logo image.")
        except Exception as e:
            QMessageBox.critical(self, "Upload Failed", f"Could not embed logo file: {e}")

    def _apply_color(self, hex_val: str):
        self.settings.set("appearance", "color", hex_val)
        curr_op = self.slider_opacity.value() / 100.0
        self.appearance_changed.emit(hex_val, curr_op)

    def _pick_custom_color(self):
        curr_hex = self.settings.get("appearance", "color", "#FBBF24")
        chosen = QColorDialog.getColor(QColor(curr_hex), self, "Select Ruler Color")
        if chosen.isValid():
            self._apply_color(chosen.name())

    def _on_opacity_slider(self, val: int):
        self.lbl_op_val.setText(f"{val}%")
        curr_hex = self.settings.get("appearance", "color", "#FBBF24")
        opacity_float = val / 100.0
        self.settings.set("appearance", "opacity", opacity_float)
        self.appearance_changed.emit(curr_hex, opacity_float)

    def _build_shortcuts_tab(self):
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)

        content = QWidget()
        layout = QVBoxLayout(content)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(8)

        desc = QLabel("Global shortcuts work while any document or spreadsheet is active.")
        desc.setStyleSheet("color: #94A3B8; font-size: 11px;")
        layout.addWidget(desc)

        shortcuts = [
            ("move_down", "Move Entire Ruler Down 1 Line", "Ctrl + Alt + Down"),
            ("move_up", "Move Entire Ruler Up 1 Line", "Ctrl + Alt + Up"),
            ("toggle_visibility", "Show / Hide Ruler", "Win + Shift + R"),
            ("toggle_always_on_top", "Toggle Always on Top", "Win + Shift + T"),
            ("move_left", "Move Left 25px", "Ctrl + Alt + Left"),
            ("move_right", "Move Right 25px", "Ctrl + Alt + Right"),
            ("increase_length", "Increase Length (+30px)", "Win + Shift + Plus"),
            ("decrease_length", "Decrease Length (-30px)", "Win + Shift + Minus"),
            ("increase_thickness", "Increase Thickness", "Win + Alt + Up"),
            ("decrease_thickness", "Decrease Thickness", "Win + Alt + Down"),
            ("increase_transparency", "More Transparent", "Win + Alt + Left"),
            ("decrease_transparency", "More Opaque", "Win + Alt + Right"),
            ("toggle_click_through", "Toggle Click-Through", "Win + Shift + C"),
        ]

        self.record_buttons: Dict[str, KeyRecordButton] = {}

        for action, label_text, default_key in shortcuts:
            row = QFrame()
            row.setStyleSheet("""
                QFrame {
                    background-color: #0F172A;
                    border: 1px solid #334155;
                    border-radius: 6px;
                    padding: 5px 8px;
                }
            """)
            r_layout = QHBoxLayout(row)
            r_layout.setContentsMargins(4, 4, 4, 4)

            lbl = QLabel(label_text)
            lbl.setStyleSheet("font-weight: 500; font-size: 11px;")
            r_layout.addWidget(lbl)
            r_layout.addStretch()

            saved_key = self.settings.get("hotkeys", action, default_key)
            rec_btn = KeyRecordButton(saved_key)
            rec_btn.key_recorded.connect(
                lambda mod, vk, text, act=action: self._on_key_recorded(act, mod, vk, text)
            )
            self.record_buttons[action] = rec_btn
            r_layout.addWidget(rec_btn)

            layout.addWidget(row)

        layout.addStretch()
        scroll.setWidget(content)
        self.tabs.addTab(scroll, "Shortcuts")

    def _on_key_recorded(self, action: str, mod: int, vk: int, text: str):
        self.settings.set("hotkeys", action, text)
        self.hotkey_rebound.emit(action, mod, vk, text)

    def _restore_defaults(self):
        confirm = QMessageBox.question(
            self,
            "Restore Defaults",
            "Are you sure you want to restore all ruler settings and shortcuts to defaults?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if confirm == QMessageBox.StandardButton.Yes:
            self.settings.data = dict(DEFAULT_SETTINGS)
            self.settings.save()
            self.reset_defaults_requested.emit()

            self.slider_move_step.setValue(28)
            self.lbl_move_step_val.setText("28 px / step")
            self.cb_always_on_top.setChecked(True)
            self.cb_guide_enable.setChecked(False)
            self.slider_line_height.setValue(28)
            self.lbl_line_height_val.setText("28 px")
            self.slider_opacity.setValue(85)
            self._apply_color("#FBBF24")

            self.cb_logo_enable.setChecked(True)
            self.slider_logo_x.setValue(10)
            self.slider_logo_y.setValue(28)
            self.slider_logo_size.setValue(34)
            self.lbl_logo_x_val.setText("10 px")
            self.lbl_logo_y_val.setText("28 px")
            self.lbl_logo_size_val.setText("34 px")
            self._update_logo_thumbnail()
            self.logo_changed.emit()

            shortcuts_defaults = {
                "move_down": "Ctrl + Alt + Down",
                "move_up": "Ctrl + Alt + Up",
                "toggle_visibility": "Win + Shift + R",
                "toggle_always_on_top": "Win + Shift + T",
                "move_left": "Ctrl + Alt + Left",
                "move_right": "Ctrl + Alt + Right",
                "increase_length": "Win + Shift + Plus",
                "decrease_length": "Win + Shift + Minus",
                "increase_thickness": "Win + Alt + Up",
                "decrease_thickness": "Win + Alt + Down",
                "increase_transparency": "Win + Alt + Left",
                "decrease_transparency": "Win + Alt + Right",
                "toggle_click_through": "Win + Shift + C",
            }
            for act, btn in self.record_buttons.items():
                btn.set_key_text(shortcuts_defaults.get(act, "Ctrl + Alt + Down"))
