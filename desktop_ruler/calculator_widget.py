"""Small resizable calculator for Desktop Ruler."""
import ast
import operator
from PySide6.QtCore import Qt, QEvent, Signal
from PySide6.QtWidgets import QWidget, QVBoxLayout, QGridLayout, QLabel, QPushButton, QSizePolicy

_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}


def _eval(node):
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.left), _eval(node.right))
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        v = _eval(node.operand)
        return v if isinstance(node.op, ast.UAdd) else -v
    raise ValueError("bad expression")


class CalculatorWindow(QWidget):
    size_changed = Signal(int, int)

    def __init__(self, width=240, height=330):
        super().__init__(None, Qt.WindowType.Tool | Qt.WindowType.WindowStaysOnTopHint)
        self.setWindowTitle("Calculator")
        self.resize(width, height)
        self.setMinimumSize(180, 240)
        self.expr = ""
        self.done = False
        self._was_active = False
        self.setStyleSheet("""
            QWidget { background-color: #0F172A; }
            QLabel { color: #F8FAFC; background-color: #1E293B; border-radius: 6px; padding: 6px; }
            QPushButton { background-color: #334155; color: #F8FAFC; border: none;
                          border-radius: 6px; font-size: 15px; font-weight: bold; }
            QPushButton:hover { background-color: #475569; }
            QPushButton:pressed { background-color: #F59E0B; color: #0F172A; }
        """)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        self.display = QLabel("0")
        self.display.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        self.display.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred)
        layout.addWidget(self.display)
        grid = QGridLayout()
        grid.setSpacing(5)
        rows = [["C", "(", ")", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"],
                ["1", "2", "3", "+"], ["0", ".", "⌫", "="]]
        for r, row in enumerate(rows):
            for c, t in enumerate(row):
                b = QPushButton(t)
                b.setFocusPolicy(Qt.FocusPolicy.NoFocus)
                b.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
                b.clicked.connect(lambda _=False, x=t: self.press(x))
                grid.addWidget(b, r, c)
        layout.addLayout(grid, 1)

    def _refresh(self):
        shown = self.expr.replace("/", "÷").replace("*", "×").replace("-", "−")
        self.display.setText(shown or "0")

    def press(self, t):
        if t == "C":
            self.expr, self.done = "", False
        elif t == "⌫":
            self.expr, self.done = self.expr[:-1], False
        elif t == "=":
            self._calc()
        else:
            ch = {"÷": "/", "×": "*", "−": "-"}.get(t, t)
            if self.done and (ch.isdigit() or ch in ".("):
                self.expr = ""
            self.done = False
            self.expr += ch
        self._refresh()

    def _calc(self):
        if not self.expr:
            return
        try:
            res = _eval(ast.parse(self.expr, mode="eval"))
            if isinstance(res, float) and res.is_integer():
                res = int(res)
            self.expr = str(res) if isinstance(res, int) else f"{res:.10g}"
            self.done = True
        except Exception:
            self.expr, self.done = "", False
            self.display.setText("Error")
            return

    def keyPressEvent(self, event):
        key, text = event.key(), event.text()
        if key == Qt.Key.Key_Escape:
            self.press("C")
        elif key in (Qt.Key.Key_Return, Qt.Key.Key_Enter) or text == "=":
            self.press("=")
        elif key == Qt.Key.Key_Backspace:
            self.press("⌫")
        elif text and text in "0123456789.+-*/()":
            self.press(text)

    def changeEvent(self, event):
        if event.type() == QEvent.Type.ActivationChange:
            if self.isActiveWindow():
                self._was_active = True
            elif self._was_active:
                self.close()
        super().changeEvent(event)

    def resizeEvent(self, event):
        f = self.display.font()
        f.setPointSize(max(10, self.height() // 14))
        self.display.setFont(f)
        super().resizeEvent(event)

    def closeEvent(self, event):
        self.size_changed.emit(self.width(), self.height())
        super().closeEvent(event)