# Desktop Ruler (Python)

A frameless, floating, semi-transparent desktop ruler built with Python and PySide6 (Qt) to measure items and guide reading across documents, browser pages, and images.

---

## 1. Project Goal

Create a lightweight, distraction-free desktop ruler for Windows (with cross-platform architecture) that stays above active windows. It displays accurate centimetre and millimetre tick markings, supports custom transparency and color schemes, features an adjustable reading-guide mode, and responds to global hotkeys even when unfocused.

---

## 2. Technical Decisions & Analysis

### 2.1 GUI Framework Selection

| Framework | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- |
| **PySide6 (Qt 6)** | • Official Qt for Python bindings (LGPLv3 license)<br>• Native support for frameless windows (`FramelessWindowHint`)<br>• Hardware-accelerated canvas via `QPainter` with sub-pixel tick rendering<br>• Native Per-Monitor High-DPI support (`Qt.HighDpiScaleFactorRoundingPolicy`)<br>• Direct mouse event handling & smooth window dragging | Requires ~50MB runtime package | **SELECTED**: Best fidelity, smooth anti-aliased ruler markings, robust window flags, and clean future UI expansion. |
| **Tkinter** | • Bundled with standard Python | • Weak alpha transparency control on Windows<br>• Blurry text on high-DPI displays<br>• Chunky canvas rendering without anti-aliasing | Rejected: Poor rendering precision. |
| **PyQt5 / PyQt6** | • Similar features to PySide6 | • Strict GPL license restrictions for distribution | Rejected: PySide6 (LGPL) is preferred. |
| **Electron / webview** | • Easy HTML/CSS styling | • Heavy RAM consumption (~150MB+)<br>• Laggy frameless dragging and complex global shortcuts | Rejected: Overkill for a lightweight utility tool. |

### 2.2 Unit Scaling & Physical Calibration

Computer monitors display content in pixels, but a physical ruler must represent real-world physical units (centimetres and millimetres).

1. **Logical vs. Physical DPI**:
   - Standard Windows assumptions default to 96 DPI (dots per inch), where $1\text{ inch} = 2.54\text{ cm} = 96\text{ px}$.
   - Under standard 96 DPI: $1\text{ mm} \approx 3.7795\text{ px}$, and $1\text{ cm} \approx 37.795\text{ px}$.
   - However, a 14-inch 1080p laptop screen has ~157 physical PPI, while a 27-inch 1080p desktop monitor has ~81 physical PPI.
2. **PySide6 Screen Querying**:
   - `QGuiApplication.primaryScreen().physicalDotsPerInch()` queries EDID monitor data to obtain hardware-reported PPI.
   - `QGuiApplication.primaryScreen().devicePixelRatio()` accounts for OS display scaling (125%, 150%, 200%).
3. **Interactive Calibration Wizard**:
   - Because monitor EDID tables can occasionally misreport dimensions, the application includes a manual calibration slider (e.g. comparing the on-screen ruler against a real standard credit card: $85.6\text{ mm} \times 53.98\text{ mm}$, or an ID card).
   - Calibration factor is stored in `settings.json` so measurements remain 100% physically true.

### 2.3 Cross-Platform Compatibility

While Windows is the primary target for initial deployment:
- **UI Code (`ruler_window.py`)**: 100% cross-platform via standard PySide6 widgets, QPainter, and Qt events. Runs identically on Windows, macOS, and Linux.
- **Global Hotkeys (`hotkeys.py`)**:
  - Windows: Uses `ctypes.windll.user32.RegisterHotKey` or `pynput` for background key capture.
  - Linux: Uses `pynput` or X11/Xlib bindings.
  - macOS: Uses `pynput` with Accessibility API permissions enabled.
- **Click-Through Mode (`WS_EX_TRANSPARENT`)**:
  - Windows: Handled through `ctypes.windll.user32.SetWindowLongPtrW` with `WS_EX_TRANSPARENT` and `WS_EX_LAYERED`.
  - macOS: Handled via `NSWindow.ignoresMouseEvents = True`.
  - Linux: Handled via `XShapeCombineRectangles` input shape masking.
- The codebase isolates OS-specific calls into a compatibility layer so non-Windows platforms degrade gracefully rather than crashing.

---

## 3. Project Structure

```text
desktop_ruler/
├── main.py              # Application entry point & Qt event loop
├── ruler_window.py      # Frameless ruler widget, paintEvent (ticks/labels), mouse drag & resize
├── hotkeys.py           # Global hotkey manager with conflict detection & fallback bindings
├── settings.py          # Configuration manager (JSON persistence & default restoration)
├── calibration.py       # Physical DPI calculation & on-screen credit-card calibration tool
├── requirements.txt     # Python package dependencies
└── installer/           # PyInstaller build specs & packaging assets
```

---

## 4. Development Plan & Build Order

- [x] **Step 1: Environment Setup & Skeleton**
  - Create project folder, set up virtual environment, install PySide6.
  - Create minimal runnable test window.
- [ ] **Step 2: Frameless Floating Window**
  - Apply `Qt.FramelessWindowHint`, `Qt.WindowStaysOnTopHint`, and translucent background.
- [ ] **Step 3: Ruler Markings & Numbering**
  - Implement `paintEvent()` with centimetre (tall), 5mm (medium), and 1mm (short) ticks.
  - Draw numbers along the scale.
- [ ] **Step 4: Mouse Dragging & Resizing**
  - Left-click drag to move anywhere on the ruler.
  - Right-edge drag handle and cursor changes (`Qt.SizeHorCursor`).
- [ ] **Step 5: Keyboard Controls**
  - Arrow keys and +/- for length and thickness fine-tuning.
- [ ] **Step 6: Global Hotkeys with Conflict Detection**
  - Background hotkeys (`Win+Shift+R`, `Win+Shift+T`, etc.) with user warnings when intercepted.
- [ ] **Step 7: Reading Guide Mode**
  - Current line highlight bar with adjustable line spacing and background dimming.
- [ ] **Step 8: Colour & Transparency Controls**
  - Preset palette (yellow, red, blue, green, white, black) and opacity slider.
- [ ] **Step 9: Settings Persistence**
  - Auto-save position, size, colour, opacity, and hotkeys to `settings.json`.
- [ ] **Step 10: Click-Through Mode & Packaging**
  - Mouse click-through toggle via Windows API.
  - Build standalone executable using PyInstaller.

---

## 5. Default Shortcut Reference

| Shortcut | Action |
| :--- | :--- |
| `Win + Shift + R` | Show / Hide ruler |
| `Win + Shift + T` | Toggle Always-on-Top |
| `Win + Shift + +` | Increase length |
| `Win + Shift + -` | Decrease length |
| `Win + Shift + Up / Down` | Move ruler 1 line up / down |
| `Win + Shift + Left / Right`| Move ruler left / right |
| `Win + Alt + Up / Down` | Increase / decrease thickness |
| `Win + Alt + Left / Right`| Increase / decrease opacity |
| `Win + Shift + C` | Toggle Click-Through mode |

---

## 6. How to Run Locally in VS Code

1. Open this repository in Visual Studio Code.
2. Open a terminal (`Ctrl + \``).
3. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the application:
   ```bash
   python desktop_ruler/main.py
   ```
