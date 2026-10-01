"""Generate a crisp, transparent default logo PNG for Desktop Ruler."""
import os
import sys

try:
    from PySide6.QtGui import QImage, QPainter, QColor, QPen, QBrush, QFont, QPolygonF
    from PySide6.QtCore import Qt, QPointF, QRectF
    from PySide6.QtWidgets import QApplication

    app = QApplication.instance() or QApplication(sys.argv)

    # 128x128 high resolution master logo
    size = 128
    image = QImage(size, size, QImage.Format.Format_ARGB32_Premultiplied)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

    # Rounded hexagonal shield background badge
    badge_color = QColor("#0F172A")
    painter.setBrush(QBrush(badge_color))
    pen = QPen(QColor("#F59E0B"), 4)
    painter.setPen(pen)
    painter.drawRoundedRect(QRectF(8, 8, 112, 112), 24, 24)

    # Diagonal ruler illustration inside
    ruler_pen = QPen(QColor("#FBBF24"), 3)
    painter.setPen(ruler_pen)
    painter.setBrush(QBrush(QColor("#1E293B")))
    painter.drawRoundedRect(QRectF(24, 40, 80, 48), 8, 8)

    # Ticks along top of mini ruler
    tick_pen = QPen(QColor("#F59E0B"), 2.5)
    painter.setPen(tick_pen)
    for x in range(32, 98, 8):
        h = 16 if (x - 32) % 16 == 0 else 9
        painter.drawLine(x, 40, x, 40 + h)

    # Small emblem star/dot
    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(QBrush(QColor("#38BDF8")))
    painter.drawEllipse(QPointF(64, 70), 5, 5)

    painter.end()

    assets_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(assets_dir, "logo.png")
    image.save(output_path, "PNG")
    print(f"Default logo successfully created at: {output_path}")

except Exception as e:
    print(f"Failed to generate logo with PySide6: {e}")
