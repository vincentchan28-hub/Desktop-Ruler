"""Windows Native Global Hotkeys Manager using ctypes (RegisterHotKey).

Registers system-wide hotkeys that work while other applications are focused.
Detects hotkey conflicts (error 1409: ERROR_HOTKEY_ALREADY_REGISTERED),
attempts fallback modifier combinations (Ctrl + Alt + Shift), and notifies
the application via PySide6 signals. Supports dynamic rebinding.
"""

import sys
import threading
from typing import Dict, List, Optional
from PySide6.QtCore import QObject, Signal

# Win32 Constants
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
MOD_NOREPEAT = 0x4000

WM_HOTKEY = 0x0312
WM_QUIT = 0x0012

# Virtual Key Codes
VK_CODES: Dict[str, int] = {
    "R": 0x52,
    "T": 0x54,
    "C": 0x43,
    "UP": 0x26,
    "DOWN": 0x28,
    "LEFT": 0x25,
    "RIGHT": 0x27,
    "PLUS": 0xBB,
    "MINUS": 0xBD,
}

HOTKEY_DEFINITIONS = [
    {
        "id": 101,
        "action": "toggle_visibility",
        "primary": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["R"], "Win + Shift + R"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["R"], "Ctrl + Alt + Shift + R"),
    },
    {
        "id": 102,
        "action": "toggle_always_on_top",
        "primary": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["T"], "Win + Shift + T"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["T"], "Ctrl + Alt + Shift + T"),
    },
    {
        "id": 103,
        "action": "increase_length",
        "primary": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["PLUS"], "Win + Shift + +"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["PLUS"], "Ctrl + Alt + Shift + +"),
    },
    {
        "id": 104,
        "action": "decrease_length",
        "primary": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["MINUS"], "Win + Shift + -"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["MINUS"], "Ctrl + Alt + Shift + -"),
    },
    {
        "id": 105,
        "action": "move_up",
        "primary": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["UP"], "Ctrl + Alt + Up"),
        "fallback": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["UP"], "Win + Shift + Up"),
    },
    {
        "id": 106,
        "action": "move_down",
        "primary": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["DOWN"], "Ctrl + Alt + Down"),
        "fallback": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["DOWN"], "Win + Shift + Down"),
    },
    {
        "id": 107,
        "action": "move_left",
        "primary": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["LEFT"], "Ctrl + Alt + Left"),
        "fallback": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["LEFT"], "Win + Shift + Left"),
    },
    {
        "id": 108,
        "action": "move_right",
        "primary": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["RIGHT"], "Ctrl + Alt + Right"),
        "fallback": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["RIGHT"], "Win + Shift + Right"),
    },
    {
        "id": 109,
        "action": "increase_thickness",
        "primary": (MOD_WIN | MOD_ALT | MOD_NOREPEAT, VK_CODES["UP"], "Win + Alt + Up"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["UP"], "Ctrl + Alt + Shift + Up"),
    },
    {
        "id": 110,
        "action": "decrease_thickness",
        "primary": (MOD_WIN | MOD_ALT | MOD_NOREPEAT, VK_CODES["DOWN"], "Win + Alt + Down"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["DOWN"], "Ctrl + Alt + Shift + Down"),
    },
    {
        "id": 111,
        "action": "decrease_transparency",
        "primary": (MOD_WIN | MOD_ALT | MOD_NOREPEAT, VK_CODES["RIGHT"], "Win + Alt + Right"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["RIGHT"], "Ctrl + Alt + Right"),
    },
    {
        "id": 112,
        "action": "increase_transparency",
        "primary": (MOD_WIN | MOD_ALT | MOD_NOREPEAT, VK_CODES["LEFT"], "Win + Alt + Left"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_CODES["LEFT"], "Ctrl + Alt + Left"),
    },
    {
        "id": 113,
        "action": "toggle_click_through",
        "primary": (MOD_WIN | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["C"], "Win + Shift + C"),
        "fallback": (MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_CODES["C"], "Ctrl + Alt + Shift + C"),
    },
]


class HotkeySignals(QObject):
    """Signals to communicate safely with the PySide6 UI thread."""
    triggered = Signal(str)                  # action name, e.g. "move_down"
    conflict_detected = Signal(str, str)     # (shortcut_name, message)
    registered_success = Signal(str, str)    # (action, active_combo)


class GlobalHotkeyManager:
    """Manages system-wide hotkeys through Win32 RegisterHotKey API."""

    def __init__(self):
        self.signals = HotkeySignals()
        self.is_windows = sys.platform == "win32"
        self._thread: Optional[threading.Thread] = None
        self._thread_id: Optional[int] = None
        self._running = False
        self._registered_ids: List[int] = []
        self._id_to_action: Dict[int, str] = {}
        self._action_to_id: Dict[str, int] = {}

    def start(self) -> None:
        """Start the background message loop to listen for hotkey events."""
        if not self.is_windows:
            print("[Hotkey] Non-Windows OS detected; Win32 hotkeys disabled.")
            return

        self._running = True
        self._thread = threading.Thread(target=self._message_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Unregister all hotkeys and stop the background listener."""
        self._running = False
        if self.is_windows and self._thread_id:
            import ctypes
            ctypes.windll.user32.PostThreadMessageW(self._thread_id, WM_QUIT, 0, 0)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    def rebind_hotkey(self, action: str, mod: int, vk: int, combo_text: str) -> bool:
        """Re-bind an existing action to a new key combination at runtime."""
        if not self.is_windows:
            return False

        import ctypes
        user32 = ctypes.windll.user32
        hk_id = self._action_to_id.get(action)
        if not hk_id:
            return False

        user32.UnregisterHotKey(None, hk_id)

        success = user32.RegisterHotKey(None, hk_id, mod | MOD_NOREPEAT, vk)
        if success:
            self._id_to_action[hk_id] = action
            self.signals.registered_success.emit(action, combo_text)
            return True
        else:
            self.signals.conflict_detected.emit(
                combo_text, f"Shortcut conflict: {combo_text} is in use by another app!"
            )
            return False

    def _message_loop(self) -> None:
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        self._thread_id = kernel32.GetCurrentThreadId()

        for item in HOTKEY_DEFINITIONS:
            hk_id = item["id"]
            action = item["action"]
            self._action_to_id[action] = hk_id
            mod, vk, combo_text = item["primary"]

            success = user32.RegisterHotKey(None, hk_id, mod, vk)
            if success:
                self._id_to_action[hk_id] = action
                self._registered_ids.append(hk_id)
                self.signals.registered_success.emit(action, combo_text)
            else:
                fb_mod, fb_vk, fb_text = item["fallback"]
                fb_success = user32.RegisterHotKey(None, hk_id, fb_mod, fb_vk)
                if fb_success:
                    id_to_action = self._id_to_action
                    id_to_action[hk_id] = action
                    self._registered_ids.append(hk_id)
                    msg = f"Primary '{combo_text}' conflict. Switched to fallback: {fb_text}"
                    self.signals.conflict_detected.emit(combo_text, msg)
                    self.signals.registered_success.emit(action, fb_text)
                else:
                    msg = f"Shortcut '{combo_text}' unavailable. Claimed by another program."
                    self.signals.conflict_detected.emit(combo_text, msg)

        msg = wintypes.MSG()
        while self._running:
            res = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if res <= 0:
                break
            if msg.message == WM_HOTKEY:
                triggered_id = msg.wParam
                if triggered_id in self._id_to_action:
                    self.signals.triggered.emit(self._id_to_action[triggered_id])
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

        for hk_id in self._registered_ids:
            user32.UnregisterHotKey(None, hk_id)
