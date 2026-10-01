# Desktop Ruler: Tabbed Settings Menu & Shortcut Customizer

A dedicated, comprehensive settings interface for Desktop Ruler featuring tabbed navigation (General, Appearance, Shortcuts), interactive key-recording buttons for remapping global hotkeys, instant live preview updates, and one-click default restoration.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Based on your preferences from Phase 1, the following design choices are confirmed:
> 
> - **Navigation Structure**: Modern tabbed interface with three clear categories: **General** (behavior, line spacing, window reset), **Appearance** (palette, custom hex picker, opacity slider, DPI scaling), and **Shortcuts** (complete list of global hotkeys).
> - **Shortcut Customization**: Interactive **Key Recorder button** next to each shortcut. When clicked, it listens for the user's keystroke combination (e.g. pressing `Ctrl + Alt + Down`), validates conflicts immediately, and updates the binding.
> - **Live Persistence**: Instant auto-save to `settings.json` and immediate live update on the active ruler window as sliders and toggles change, complemented by a persistent **"Restore All Defaults"** button.
> - **Toggle & Navigation Flow**: Clean tabs at the top (`General` | `Appearance` | `Shortcuts`) allow toggling between sections instantly without closing the window, and pressing `Esc` or clicking `Close` safely dismisses the settings without losing changes.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an intuitive, visual control center launched from the ruler's right-click menu or via a shortcut (`Win + Shift + S` or right-click → **Settings...**). Users can inspect, rebind, and test all 13 global shortcuts, calibrate physical millimetre scaling, and adjust colors in real time.
- **Target Audience / Persona**: Users who need specific key combinations that do not conflict with their existing CAD, IDE, or screen-reader shortcuts, as well as users calibrating their physical monitor DPI.
- **Key Value**: Eliminates manual JSON editing and guessing which keys are free, providing visual feedback and key-recording directly within the desktop application.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Opening Settings**:
   - Right-click anywhere on the ruler → Select **⚙ Settings...** (or press shortcut).
   - The settings window opens centered above or beside the ruler with the **General** tab active.
2. **Switching Between Settings**:
   - Click the tabs across the top: **General**, **Appearance**, or **Shortcuts**.
   - The view switches instantly while preserving window state.
3. **Rebinding a Shortcut with Key Recorder**:
   - On the **Shortcuts** tab, each action displays its current binding (e.g., `Win + Shift + Down`) and an **[ Edit ]** button.
   - User clicks **[ Edit ]** → The button highlights in amber and displays `Press keys...`.
   - User presses their desired combination (e.g., `Ctrl + Alt + D`).
   - The key recorder captures the modifiers and key code, checks for Win32 conflicts, displays a green checkmark if successful, or shows an amber conflict badge if claimed by another program.
   - The global hotkey manager re-registers the new binding in the background without restarting the app.
4. **Restoring Defaults**:
   - Clicking **"Restore Defaults"** at the bottom-right restores all original keybindings, standard yellow color, 85% opacity, and 28px line spacing.

#### Visual Theme & Styling
- **Dialog Theme**: Styled with Qt stylesheets (`QSS`) matching the dark slate design system (`#0F172A` window background, `#1E293B` panel cards, `#F59E0B` amber accents, `#38BDF8` cyan highlights).
- **Tab Bar**: Clean pill-shaped tab headers with active indicators and crisp icons.
- **Key Recorder Field**: Monospaced badge styled like physical keyboard keycaps (`kbd`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tabbed `QTabWidget` vs. Multi-Window Dialogs**
  - *Chosen Approach*: Single unified `QDialog` containing a `QTabWidget`.
  - *Why*: Prevents modal clutter and allows users to jump between shortcut configurations and appearance adjustments in one cohesive window.

- **Decision 2: Live Signal Synchronization vs. "Apply" Button**
  - *Chosen Approach*: Real-time PySide6 signals emit changes immediately as sliders or colors change.
  - *Why*: The user can watch the floating ruler change opacity, color, and reading height in real time without needing to click "Apply" repeatedly to check the result.

- **Decision 3: Key Event Capture during Recording**
  - *Chosen Approach*: Dedicated `KeySequenceEdit` or custom `keyPressEvent` capture filter inside the recording button that handles modifier combinations (`Win`, `Ctrl`, `Alt`, `Shift` + standard keys) and prevents default OS propagation while recording is active.

---

### 4. Technical Architecture & Data Strategy

#### Component Architecture & Event Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                       DesktopRuler                          │
│  (Right-click context menu ──► "Settings..." action)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Opens (non-modal or modal)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 desktop_ruler/settings_dialog.py            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ QTabWidget: [ General ] [ Appearance ] [ Shortcuts ]   │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│   Tab 1: General             │ Tab 2: Appearance            │
│   • Always-on-top switch     │ • Color presets & picker     │
│   • Reading guide height     │ • Opacity slider (live)      │
│   • Reset window bounds      │ • Physical DPI calibration   │
│                              │                              │
│   Tab 3: Shortcuts & Global Settings                        │
│   • 13 Hotkey entries with key badges                       │
│   • [Record Key] interactive capture buttons                │
│   • Conflict status indicators (Green OK / Amber In-Use)    │
│   • Quick Preset: Win+Shift vs Ctrl+Alt+Shift               │
│                                                             │
│   Bottom Bar: [ Restore Defaults ]               [ Close ]  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│   desktop_ruler/settings.py  │ │ desktop_ruler/hotkeys.py    │
│   • Auto-saves settings.json │ │ • rebind_hotkey(id, mod, vk)│
│   • Restores defaults        │ │ • Unregisters / re-registers│
└──────────────────────────────┘ └─────────────────────────────┘
```

#### Detailed Tab Specification

1. **Tab 1: General**:
   - `Always on Top`: Checkbox / Switch.
   - `Reading Guide Mode`: Enable toggle + Line height spinbox (15px – 80px).
   - `Window Size`: Display current width × height with a "Reset to 600×85" button.
2. **Tab 2: Appearance**:
   - `Ruler Color`: Palette swatches (Amber, Sky, Emerald, Ruby, White, Slate) + "Custom Color..." button.
   - `Opacity`: Slider (20% to 100%) with live percentage readout.
   - `Physical DPI`: Slider (72 to 240 DPI) with reference card size ($85.6\text{ mm}$) indicator.
3. **Tab 3: Shortcuts (Global Settings)**:
   - Full list of all 13 shortcuts with action labels, current keystroke badge, and **[ Record ]** button.
   - Quick Style Switcher: **Use Win + Shift (Default)** vs **Use Ctrl + Alt + Shift (Alternative)**.
   - Real-time conflict validation message.

#### Implementation Steps Post-Approval
1. Create `desktop_ruler/settings_dialog.py` implementing the complete tabbed settings interface with key recorder.
2. Update `desktop_ruler/hotkeys.py` with `rebind_hotkey(action, new_mod, new_vk)` method.
3. Connect **Settings...** in `desktop_ruler/ruler_window.py` context menu to launch the dialog.
4. Update web companion simulator with an interactive settings panel simulating the exact dialog tabs and key recordings.
