"""Settings management for Desktop Ruler."""
import json
import os
from typing import Any, Dict

DEFAULT_SETTINGS: Dict[str, Any] = {
    "window": {
        "x": 200,
        "y": 200,
        "width": 600,
        "height": 85,
    },
    "appearance": {
        "color": "#FBBF24",
        "opacity": 0.85,
        "text_color": "#1F2937",
        "tick_color": "#374151",
    },
    "reading_guide": {
        "enabled": False,
        "line_height": 28,
        "dim_opacity": 0.35,
    },
    "behavior": {
        "always_on_top": True,
        "click_through": False,
        "move_step": 28,  # Pixels the ruler shifts when pressing Up/Down
    },
    "hotkeys": {
        "toggle_visibility": "<win>+<shift>+r",
        "toggle_always_on_top": "<win>+<shift>+t",
        "increase_length": "<win>+<shift>++",
        "decrease_length": "<win>+<shift>+-",
        "move_up": "<win>+<shift>+<up>",
        "move_down": "<win>+<shift>+<down>",
        "move_left": "<win>+<shift>+<left>",
        "move_right": "<win>+<shift>+<right>",
        "increase_thickness": "<win>+<alt>+<up>",
        "decrease_thickness": "<win>+<alt>+<down>",
        "increase_opacity": "<win>+<alt>+<right>",
        "decrease_opacity": "<win>+<alt>+<left>",
        "toggle_click_through": "<win>+<shift>+c",
    }
}


class SettingsManager:
    """Handles loading and saving settings to a local JSON file."""

    def __init__(self, filename: str = "settings.json"):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.filepath = os.path.join(base_dir, filename)
        self.data: Dict[str, Any] = self.load()

    def load(self) -> Dict[str, Any]:
        if not os.path.exists(self.filepath):
            return dict(DEFAULT_SETTINGS)
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                merged = dict(DEFAULT_SETTINGS)
                for key, val in loaded.items():
                    if isinstance(val, dict) and key in merged:
                        merged[key].update(val)
                    else:
                        merged[key] = val
                return merged
        except Exception as e:
            print(f"Warning: Failed to load {self.filepath}, using defaults. Error: {e}")
            return dict(DEFAULT_SETTINGS)

    def save(self) -> None:
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"Error saving settings to {self.filepath}: {e}")

    def get(self, section: str, key: str, default: Any = None) -> Any:
        return self.data.get(section, {}).get(key, default)

    def set(self, section: str, key: str, value: Any) -> None:
        if section not in self.data:
            self.data[section] = {}
        self.data[section][key] = value
        self.save()
