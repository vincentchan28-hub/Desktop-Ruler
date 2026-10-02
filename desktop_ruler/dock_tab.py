"""Small edge tab shown when the ruler is docked to the left/right screen edge."""
from PySide6.QtCore import Qt, Signal, QPropertyAnimation, QEasingCurve, QPoint
from PySide6.QtGui import QPainter, QColor, QPen
from PySide6.QtWidgets import QWidget, QMenu, QApplication


class DockTab(QWidget):
    clicked = Signal()
    drag_started = Signal(QPoint)
    dragged = Signal(QPoint)
    drag_finished = Signal()
    TAB_WIDTH = 22
    TAB_HEIGHT = 90

    def __init__(self):
        super().__init__(
            None,
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool,
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setFixedSize(self.TAB_WIDTH, self.TAB_HEIGHT)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.edge = "left"
        self.color = QColor("#FBBF24")
        self._anim = None
        self._press_pos = None
        self._dragging = False

    def set_color(self, color: QColor) -> None:
        self.color = QColor(color)
        self.update()

    def place(self, edge: str, y: int, geo) -> None:
        self.edge = edge
        x = geo.left() if edge == "left" else geo.right() + 1 - self.width()
        top = max(geo.top(), min(y - self.height() // 2, geo.bottom() - self.height()))
        self.move(x, top)
        self.update()

    def slide_in(self, edge: str, y: int, geo) -> None:
        self.place(edge, y, geo)
        end = self.pos()
        start_x = geo.left() - self.width() if edge == "left" else geo.right() + 1
        self.move(start_x, end.y())
        self.show()
        self.raise_()
        self._anim = QPropertyAnimation(self, b"pos", self)
        self._anim.setDuration(260)
        self._anim.setStartValue(QPoint(start_x, end.y()))
        self._anim.setEndValue(end)
        self._anim.setEasingCurve(QEasingCurve.Type.OutBack)
        self._anim.start()

    def paintEvent(self, event) -> None:
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        p.setBrush(self.color)
        p.setPen(QPen(QColor(55, 65, 81, 200), 1))
        w, h = self.width(), self.height()
        if self.edge == "left":
            p.drawRoundedRect(-10, 0, w + 9, h - 1, 8, 8)
            arrow = "▶"
        else:
            p.drawRoundedRect(0, 0, w + 9, h - 1, 8, 8)
            arrow = "◀"
        p.setPen(QColor(31, 41, 55))
        p.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, arrow)

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._press_pos = event.globalPosition().toPoint()
            self._dragging = False
        elif event.button() == Qt.MouseButton.RightButton:
            menu = QMenu(self)
            menu.addAction("Restore Ruler", self.clicked.emit)
            menu.addAction("Exit Desktop Ruler", QApplication.instance().quit)
            menu.exec(event.globalPosition().toPoint())

    def mouseMoveEvent(self, event) -> None:
        if self._press_pos is None:
            return
        pos = event.globalPosition().toPoint()
        if not self._dragging:
            if (pos - self._press_pos).manhattanLength() < 6:
                return
            self._dragging = True
            self.setWindowOpacity(0.0)
            self.drag_started.emit(pos)
        self.dragged.emit(pos)

    def mouseReleaseEvent(self, event) -> None:
        if event.button() != Qt.MouseButton.LeftButton or self._press_pos is None:
            return
        was_drag = self._dragging
        self._press_pos = None
        self._dragging = False
        if was_drag:
            self.setWindowOpacity(1.0)
            self.hide()
            self.drag_finished.emit()
        else:
            self.clicked.emit()