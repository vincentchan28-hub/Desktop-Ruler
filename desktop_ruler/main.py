"""Desktop Ruler Entry Point.

Run this script to launch the Desktop Ruler application:
    python desktop_ruler/main.py
"""

import sys
import os

try:
    from PySide6.QtWidgets import QApplication
    from PySide6.QtCore import Qt
except ImportError:
    print("\n[ERROR] PySide6 is not installed.")
    print("Please install requirements: pip install -r requirements.txt\n")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from desktop_ruler.settings import SettingsManager
from desktop_ruler.ruler_window import DesktopRuler
from desktop_ruler.hotkeys import GlobalHotkeyManager


def main():
    if hasattr(Qt.ApplicationAttribute, "AA_EnableHighDpiScaling"):
        QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
    if hasattr(Qt.ApplicationAttribute, "AA_UseHighDpiPixmaps"):
        QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)
    app.setApplicationName("Desktop Ruler")
    app.setApplicationDisplayName("Desktop Ruler")

    settings = SettingsManager()
    ruler = DesktopRuler(settings_manager=settings)
    ruler.show()

    # Start background hotkeys and attach manager to ruler
    hotkey_mgr = GlobalHotkeyManager()
    hotkey_mgr.signals.triggered.connect(ruler.handle_global_action)
    hotkey_mgr.signals.conflict_detected.connect(
        lambda name, msg: ruler.show_toast(f"⚠ {msg}", is_error=True, duration_ms=4500)
    )
    hotkey_mgr.start()
    ruler.set_hotkey_manager(hotkey_mgr)

    app.aboutToQuit.connect(hotkey_mgr.stop)

    print("Desktop Ruler running with native background hotkeys and Settings Menu!")
    exit_code = app.exec()
    hotkey_mgr.stop()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
