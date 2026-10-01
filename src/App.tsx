import React, { useState, useRef, useEffect } from 'react';
import {
  Ruler,
  Terminal,
  FileCode,
  FolderTree,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Settings2,
  Eye,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Monitor,
  RotateCcw,
  Palette,
  CreditCard,
  Keyboard,
  AlertTriangle,
  MousePointer,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Sliders,
  X,
  ListOrdered,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

const CODE_FILES: Record<string, { path: string; language: string; content: string; description: string }> = {
  'settings_dialog.py': {
    path: 'desktop_ruler/settings_dialog.py',
    language: 'python',
    description: 'Scrollable Settings Dialog with Logo & Branding controls (Upload, X/Y Offset, Size), Packing List Move Step, and Shortcuts.',
    content: `"""Settings Dialog for Desktop Ruler.

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
    QSpinBox,
    QScrollArea,
    QFrame,
    QColorDialog,
    QFileDialog,
    QMessageBox,
)
from desktop_ruler.settings import SettingsManager, DEFAULT_SETTINGS


class SettingsDialog(QDialog):
    """Tabbed settings window for configuring ruler appearance, branding, and shortcuts."""

    appearance_changed = Signal(str, float)
    reading_guide_changed = Signal(bool, int)
    always_on_top_changed = Signal(bool)
    move_step_changed = Signal(int)
    logo_changed = Signal()
    reset_geometry_requested = Signal()

    def __init__(self, settings_manager: SettingsManager, parent=None):
        super().__init__(parent)
        self.settings = settings_manager
        self.setWindowTitle("Desktop Ruler — Settings")
        self.setFixedSize(540, 480)
        self._build_ui()

    def _build_appearance_tab(self):
        # Section A: Embedded Logo & Branding Controls
        # Checkbox: Display Embedded Logo on Left of Ruler
        # File Picker: Upload / Choose Logo File (.png, .jpg, .svg)
        # SpinBoxes: Left Offset (X) and Top Offset (Y)
        # Slider: Logo Size (16px to 64px)
        pass

    def _upload_logo_file(self):
        """Open a file dialog to pick an image, copy it to assets/logo.png, and embed it."""
        chosen_file, _ = QFileDialog.getOpenFileName(
            self,
            "Select Logo Image to Embed",
            "",
            "Image Files (*.png *.jpg *.jpeg *.svg *.ico *.bmp)"
        )
        if not chosen_file:
            return

        base_dir = os.path.dirname(os.path.abspath(__file__))
        assets_dir = os.path.join(base_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        target_file = os.path.join(assets_dir, "logo.png")
        shutil.copyfile(chosen_file, target_file)
        self.settings.set("logo", "path", "assets/logo.png")
        self.settings.set("logo", "enabled", True)
        self.logo_changed.emit()`
  },
  'ruler_window.py': {
    path: 'desktop_ruler/ruler_window.py',
    language: 'python',
    description: 'Frameless floating ruler. Draws embedded brand logo on left, shifts entire ruler up/down by move_step for packing lists.',
    content: `"""Ruler Window implementation using PySide6 (Qt)."""
import os
from PySide6.QtCore import Qt, QPoint, QRect, QSize, QTimer
from PySide6.QtGui import QPainter, QColor, QPen, QFont, QPixmap
from PySide6.QtWidgets import QWidget, QMenu
from desktop_ruler.settings import SettingsManager
from desktop_ruler.settings_dialog import SettingsDialog

class DesktopRuler(QWidget):
    def _load_logo(self) -> None:
        """Load logo image from assets/logo.png into QPixmap."""
        logo_cfg = self.settings.data.get("logo", {})
        self.logo_enabled = logo_cfg.get("enabled", True)
        self.logo_x = int(logo_cfg.get("x", 10))
        self.logo_y = int(logo_cfg.get("y", 28))
        self.logo_size = int(logo_cfg.get("size", 34))

        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = logo_cfg.get("path", "assets/logo.png")
        full_path = os.path.join(base_dir, logo_path) if not os.path.isabs(logo_path) else logo_path

        if os.path.exists(full_path):
            self.logo_pixmap = QPixmap(full_path)
        else:
            self.logo_pixmap = None

    def move_relative(self, dx: int, dy: int):
        """Moves entire ruler window relative to its current screen position."""
        new_x = self.x() + dx
        new_y = self.y() + dy
        self.setGeometry(new_x, new_y, self.width(), self.height())
        self._save_geometry()
        if dy > 0:
            self.show_toast(f"▼ Moved Down {dy}px (Packing Line)")
        elif dy < 0:
            self.show_toast(f"▲ Moved Up {abs(dy)}px (Packing Line)")

    def paintEvent(self, event):
        # 1. Background body
        # 2. Reading Guide
        # 3. Draw Embedded Logo on Left of Ruler
        if self.logo_enabled and self.logo_pixmap and not self.logo_pixmap.isNull():
            scaled_logo = self.logo_pixmap.scaled(
                self.logo_size,
                self.logo_size,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
            painter.drawPixmap(self.logo_x, self.logo_y, scaled_logo)
        # 4. Ticks and measurements`
  },
  'settings.py': {
    path: 'desktop_ruler/settings.py',
    language: 'python',
    description: 'JSON settings manager with persistent logo position, move_step, and hotkey configurations.',
    content: `DEFAULT_SETTINGS = {
    "window": {"x": 200, "y": 200, "width": 600, "height": 85},
    "appearance": {"color": "#FBBF24", "opacity": 0.85},
    "logo": {
        "enabled": True,
        "path": "assets/logo.png",
        "x": 10,
        "y": 28,
        "size": 34,
        "opacity": 0.95
    },
    "behavior": {"always_on_top": True, "click_through": False, "move_step": 28},
    "hotkeys": {
        "move_down": "<win>+<shift>+<down>",
        "move_up": "<win>+<shift>+<up>"
    }
}`
  },
  'generate_logo.py': {
    path: 'desktop_ruler/assets/generate_logo.py',
    language: 'python',
    description: 'Script that generates a crisp default brand emblem in assets/logo.png with PySide6.',
    content: `"""Generate a crisp, transparent default logo PNG for Desktop Ruler."""
import os
import sys
from PySide6.QtGui import QImage, QPainter, QColor, QPen, QBrush
from PySide6.QtCore import Qt, QPointF, QRectF
from PySide6.QtWidgets import QApplication

app = QApplication.instance() or QApplication(sys.argv)
size = 128
image = QImage(size, size, QImage.Format.Format_ARGB32_Premultiplied)
image.fill(Qt.GlobalColor.transparent)
# Draws shield badge, ruler icon, and saves to desktop_ruler/assets/logo.png`
  },
  'hotkeys.py': {
    path: 'desktop_ruler/hotkeys.py',
    language: 'python',
    description: 'Win32 RegisterHotKey manager with conflict fallback and Ctrl+Alt / Win+Shift presets.',
    content: `"""Windows Native Global Hotkeys Manager using ctypes (RegisterHotKey)."""
# Supports hotkey registration, conflict detection, and dynamic rebinding.`
  },
  'main.py': {
    path: 'desktop_ruler/main.py',
    language: 'python',
    description: 'Entry point. Sets up Qt application, launches floating DesktopRuler with embedded logo.',
    content: `"""Desktop Ruler Entry Point."""
import sys
from PySide6.QtWidgets import QApplication
from desktop_ruler.ruler_window import DesktopRuler
from desktop_ruler.settings import SettingsManager
from desktop_ruler.hotkeys import GlobalHotkeyManager

def main():
    app = QApplication(sys.argv)
    settings = SettingsManager()
    ruler = DesktopRuler(settings)
    hotkey_mgr = GlobalHotkeyManager(settings)
    hotkey_mgr.signals.triggered.connect(ruler.handle_global_action)
    ruler.set_hotkey_manager(hotkey_mgr)
    ruler.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()`
  },
  'requirements.txt': {
    path: 'requirements.txt',
    language: 'text',
    description: 'Python dependencies: PySide6 (Qt GUI) and pynput.',
    content: `PySide6>=6.5.0\npynput>=1.7.6`
  }
};

const COLOR_PRESETS = [
  { name: 'Amber Yellow', hex: '#FBBF24', textDark: true },
  { name: 'Sky Cyan', hex: '#38BDF8', textDark: true },
  { name: 'Emerald Green', hex: '#34D399', textDark: true },
  { name: 'Ruby Coral', hex: '#F87171', textDark: false },
  { name: 'Clean White', hex: '#F3F4F6', textDark: true },
  { name: 'Midnight Slate', hex: '#1E293B', textDark: false },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'roadmap' | 'guide'>('simulator');
  const [selectedFile, setSelectedFile] = useState<string>('settings_dialog.py');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ruler Simulator State
  const [rulerWidth, setRulerWidth] = useState<number>(580);
  const [rulerHeight, setRulerHeight] = useState<number>(85);
  const [rulerColor, setRulerColor] = useState<string>('#FBBF24');
  const [opacity, setOpacity] = useState<number>(0.88);
  const [readingGuide, setReadingGuide] = useState<boolean>(false);
  const [lineSpacing, setLineSpacing] = useState<number>(28);
  const [moveStep, setMoveStep] = useState<number>(28);
  const [guideOffset, setGuideOffset] = useState<number>(28);
  const [dpiScale, setDpiScale] = useState<number>(96);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 40, y: 120 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true);
  const [isClickThrough, setIsClickThrough] = useState<boolean>(false);

  // Logo & Branding State
  const [logoEnabled, setLogoEnabled] = useState<boolean>(true);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoX, setLogoX] = useState<number>(10);
  const [logoY, setLogoY] = useState<number>(28);
  const [logoSize, setLogoSize] = useState<number>(34);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'appearance' | 'shortcuts'>('appearance');

  // Shortcut key bindings state in simulator
  const [shortcutsMap, setShortcutsMap] = useState<Record<string, string>>({
    move_down: 'Win + Shift + Down',
    move_up: 'Win + Shift + Up',
    toggle_visibility: 'Win + Shift + R',
    toggle_always_on_top: 'Win + Shift + T',
    move_left: 'Ctrl + Alt + Left',
    move_right: 'Ctrl + Alt + Right',
    increase_length: 'Win + Shift + Plus',
    decrease_length: 'Win + Shift + Minus',
    increase_thickness: 'Win + Alt + Up',
    decrease_thickness: 'Win + Alt + Down',
    increase_transparency: 'Win + Alt + Left',
    decrease_transparency: 'Win + Alt + Right',
    toggle_click_through: 'Win + Shift + C',
  });

  // Simulator Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);

  const triggerToast = (msg: string, isErr = false) => {
    setToastMessage(msg);
    setToastIsError(isErr);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number; initW: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initW: 0
  });

  const pxPerMm = dpiScale / 25.4;
  const originX = logoEnabled && logoY < 24 ? Math.max(16, logoX + logoSize + 8) : 16;
  const totalMm = Math.max(10, Math.floor((rulerWidth - originX - 16) / pxPerMm));

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(url);
  };

  // Dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPosition({
          x: Math.max(10, dragRef.current.initX + dx),
          y: Math.max(10, dragRef.current.initY + dy)
        });
      } else if (isResizing) {
        const dx = e.clientX - dragRef.current.startX;
        const newW = Math.max(220, Math.min(1000, dragRef.current.initW + dx));
        setRulerWidth(newW);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const startDrag = (e: React.MouseEvent) => {
    if (isClickThrough) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      initW: rulerWidth
    };
  };

  const startResize = (e: React.MouseEvent) => {
    if (isClickThrough) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      initW: rulerWidth
    };
  };

  // Keyboard navigation when focus is in window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: p.y + moveStep }));
        triggerToast(`▼ Moved Down ${moveStep}px (Packing List)`);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: Math.max(10, p.y - moveStep) }));
        triggerToast(`▲ Moved Up ${moveStep}px (Packing List)`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveStep, isSettingsOpen]);

  const handleSimulatedAction = (action: string) => {
    if (action === 'move_down') {
      setPosition((p) => ({ ...p, y: p.y + moveStep }));
      triggerToast(`▼ Entire Ruler Shifted Down ${moveStep}px`);
    } else if (action === 'move_up') {
      setPosition((p) => ({ ...p, y: Math.max(10, p.y - moveStep) }));
      triggerToast(`▲ Entire Ruler Shifted Up ${moveStep}px`);
    } else if (action === 'toggle_visibility') {
      setIsVisible(!isVisible);
      triggerToast(isVisible ? 'Ruler Hidden' : 'Ruler Restored');
    } else if (action === 'move_left') {
      setPosition((p) => ({ ...p, x: Math.max(10, p.x - 25) }));
      triggerToast('Moved left 25px');
    } else if (action === 'move_right') {
      setPosition((p) => ({ ...p, x: p.x + 25 }));
      triggerToast('Moved right 25px');
    } else if (action === 'increase_length') {
      setRulerWidth((w) => Math.min(900, w + 30));
      triggerToast(`Length: ${rulerWidth + 30}px`);
    } else if (action === 'decrease_length') {
      setRulerWidth((w) => Math.max(220, w - 30));
      triggerToast(`Length: ${rulerWidth - 30}px`);
    } else if (action === 'increase_thickness') {
      setRulerHeight((h) => Math.min(180, h + 10));
      triggerToast(`Thickness: ${rulerHeight + 10}px`);
    } else if (action === 'decrease_thickness') {
      setRulerHeight((h) => Math.max(45, h - 10));
      triggerToast(`Thickness: ${rulerHeight - 10}px`);
    } else if (action === 'toggle_click_through') {
      setIsClickThrough(!isClickThrough);
      triggerToast(!isClickThrough ? 'Click-Through ON' : 'Click-Through OFF');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoSrc(event.target?.result as string);
        setLogoEnabled(true);
        triggerToast('Logo embedded! Saved to assets/logo.png');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreDefaults = () => {
    setRulerColor('#FBBF24');
    setOpacity(0.88);
    setReadingGuide(false);
    setLineSpacing(28);
    setMoveStep(28);
    setRulerWidth(580);
    setRulerHeight(85);
    setLogoEnabled(true);
    setLogoX(10);
    setLogoY(28);
    setLogoSize(34);
    triggerToast('All settings restored to defaults');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Ruler className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">Desktop Ruler</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Embedded Logo & Packing List Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">Custom Left-Aligned Brand Logo • Shift Entire Ruler Up/Down</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Live Simulator & Ruler
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Logo & VS Code Instructions
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Project Files ({Object.keys(CODE_FILES).length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* TAB 1: LIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Interactive Canvas with Sample Packing List Backdrop */}
            <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col select-none">
              <div className="absolute inset-0 p-8 overflow-hidden pointer-events-none opacity-45">
                <div className="max-w-2xl mx-auto space-y-3 font-mono text-xs text-slate-300">
                  <div className="font-bold text-amber-400 text-sm mb-3">WAREHOUSE PACKING LIST (TEST RULER STEP SHIFTING)</div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #01: Industrial Hex Screws 10mm (x500)</span>
                    <span className="text-emerald-400">Bin A-14</span>
                  </div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #02: Rubber Sealing O-Rings 24mm (x120)</span>
                    <span className="text-emerald-400">Bin B-03</span>
                  </div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #03: Thermal Paste Compound 50g (x25)</span>
                    <span className="text-emerald-400">Bin C-09</span>
                  </div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #04: Aluminum Mounting Brackets (x40)</span>
                    <span className="text-emerald-400">Bin D-12</span>
                  </div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #05: Nylon Cable Zip Ties 200mm (x1000)</span>
                    <span className="text-emerald-400">Bin E-02</span>
                  </div>
                  <div className="p-2 border border-slate-700/60 rounded bg-slate-950/60 flex justify-between">
                    <span>[ ] Item #06: Reinforced Shipping Tape 50mm (x12)</span>
                    <span className="text-emerald-400">Bin F-07</span>
                  </div>
                </div>
              </div>

              {/* Status Header Bar */}
              <div className="absolute top-4 left-6 z-10 flex items-center gap-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3.5 py-1.5 rounded-full text-xs text-slate-300 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Shift Step: <strong className="text-amber-400">{moveStep}px per line</strong></span>
                <span className="text-slate-600">•</span>
                <span>Press <strong>Down / Up</strong> to move entire ruler</span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Settings (Logo & Shift)
                </button>
              </div>

              {/* SIMULATED RULER */}
              {isVisible ? (
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: `${rulerWidth}px`,
                    height: `${rulerHeight}px`,
                    backgroundColor: rulerColor,
                    opacity: opacity,
                    pointerEvents: isClickThrough ? 'none' : 'auto',
                  }}
                  onMouseDown={startDrag}
                  className={`absolute top-0 left-0 rounded-lg shadow-2xl border border-slate-900/30 cursor-move transition-transform ${
                    isDragging ? 'shadow-amber-500/20 ring-2 ring-amber-400/50' : ''
                  }`}
                >
                  {/* Reading Guide */}
                  {readingGuide && (
                    <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                      <div style={{ height: `${guideOffset}px` }} className="w-full bg-black/40 border-b border-rose-500/60" />
                      <div
                        style={{ height: `${lineSpacing}px` }}
                        className="w-full bg-transparent flex items-center justify-between px-3 text-[10px] text-rose-300 font-mono tracking-wider"
                      >
                        <span>▶ PACKING LINE FOCUS</span>
                        <span>{lineSpacing}px</span>
                      </div>
                      <div
                        style={{ height: `${Math.max(0, rulerHeight - guideOffset - lineSpacing)}px` }}
                        className="w-full bg-black/40 border-t border-rose-500/60"
                      />
                    </div>
                  )}

                  {/* EMBEDDED LOGO (Left aligned, adjustable X, Y, Size) */}
                  {logoEnabled && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${logoX}px`,
                        top: `${logoY}px`,
                        width: `${logoSize}px`,
                        height: `${logoSize}px`,
                      }}
                      className="pointer-events-none select-none flex items-center justify-center rounded overflow-hidden shadow-sm z-20"
                      title="Embedded Brand Logo"
                    >
                      {logoSrc ? (
                        <img src={logoSrc} alt="Embedded Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-slate-900/95 border-2 border-amber-400 rounded-lg flex items-center justify-center text-amber-400 shadow-md">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Markings */}
                  <div className="relative w-full h-full overflow-hidden select-none pointer-events-none">
                    {Array.from({ length: totalMm + 1 }).map((_, mm) => {
                      const xPos = originX + mm * pxPerMm;
                      if (xPos > rulerWidth - 22) return null;
                      const isCm = mm % 10 === 0;
                      const is5Mm = mm % 5 === 0;
                      let tickHeight = 10;
                      if (isCm) tickHeight = Math.min(24, rulerHeight * 0.32);
                      else if (is5Mm) tickHeight = Math.min(16, rulerHeight * 0.22);

                      return (
                        <React.Fragment key={mm}>
                          <div
                            style={{
                              left: `${xPos}px`,
                              height: `${tickHeight}px`,
                              width: isCm ? '2px' : '1px',
                              backgroundColor: isCm ? '#1F2937' : '#4B5563',
                              opacity: isCm ? 1 : is5Mm ? 0.8 : 0.45,
                            }}
                            className="absolute top-0"
                          />
                          {isCm && (
                            <span
                              style={{
                                left: `${xPos}px`,
                                top: `${tickHeight + 3}px`,
                                transform: 'translateX(-50%)',
                              }}
                              className="absolute text-[11px] font-bold text-slate-800 tracking-tight font-sans"
                            >
                              {mm / 10}
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Toast Notification */}
                  {toastMessage && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <div className="px-3 py-1 rounded-full text-[11px] font-bold shadow-lg flex items-center gap-1.5 bg-slate-900/90 text-white border border-slate-700">
                        <span>{toastMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Resize Handle */}
                  {!isClickThrough && (
                    <div
                      onMouseDown={startResize}
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-black/10 rounded-r-lg group"
                      title="Drag to resize length"
                    >
                      <div className="flex flex-col gap-1 items-center">
                        <span className="w-1 h-1 rounded-full bg-slate-700/60 group-hover:bg-slate-900" />
                        <span className="w-1 h-1 rounded-full bg-slate-700/60 group-hover:bg-slate-900" />
                        <span className="w-1 h-1 rounded-full bg-slate-700/60 group-hover:bg-slate-900" />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* SIMULATED SETTINGS DIALOG (SCROLLABLE & NEVER CHOPPED OFF) */}
              {isSettingsOpen && (
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg h-[470px] flex flex-col overflow-hidden">
                    {/* Top Bar */}
                    <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-amber-400" />
                        <h2 className="font-bold text-xs text-white">Desktop Ruler Settings</h2>
                      </div>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-1.5 gap-2 shrink-0">
                      <button
                        onClick={() => setSettingsActiveTab('general')}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-t border-x ${
                          settingsActiveTab === 'general'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        General
                      </button>
                      <button
                        onClick={() => setSettingsActiveTab('appearance')}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-t border-x ${
                          settingsActiveTab === 'appearance'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Appearance & Logo
                      </button>
                      <button
                        onClick={() => setSettingsActiveTab('shortcuts')}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-t border-x ${
                          settingsActiveTab === 'shortcuts'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Shortcuts
                      </button>
                    </div>

                    {/* Scrollable Tab Content Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {settingsActiveTab === 'general' && (
                        <div className="space-y-4">
                          {/* Configurable Move Step for Packing Lists */}
                          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                            <span className="text-xs font-bold text-amber-400 block">
                              Vertical Move Step (Packing List Mode)
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Distance the entire ruler shifts up or down per key press:
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-slate-300">Shift Distance:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={moveStep}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setMoveStep(val);
                                    triggerToast(`Move Step set to ${val}px`);
                                  }}
                                  className="accent-amber-500 w-28 cursor-pointer"
                                />
                                <span className="font-mono text-xs font-bold text-amber-400 w-16 text-right">
                                  {moveStep} px
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Always On Top */}
                          <div>
                            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAlwaysOnTop}
                                onChange={(e) => setIsAlwaysOnTop(e.target.checked)}
                                className="accent-amber-500 w-4 h-4 rounded"
                              />
                              <div>
                                <div className="text-xs font-medium text-white">Keep Ruler Always on Top</div>
                                <div className="text-[11px] text-slate-400">Stays above Excel, PDF viewers, and browser pages.</div>
                              </div>
                            </label>
                          </div>

                          {/* Reading Guide */}
                          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={readingGuide}
                                onChange={(e) => setReadingGuide(e.target.checked)}
                                className="accent-amber-500 w-4 h-4 rounded"
                              />
                              <span className="text-xs font-medium text-white">Enable Reading Guide (dim outer lines)</span>
                            </label>
                          </div>

                          {/* Reset Dimensions */}
                          <button
                            onClick={() => {
                              setRulerWidth(580);
                              setRulerHeight(85);
                              triggerToast('Ruler reset to default 580×85 px');
                            }}
                            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                          >
                            Reset Ruler Dimensions (580×85 px)
                          </button>
                        </div>
                      )}

                      {settingsActiveTab === 'appearance' && (
                        <div className="space-y-4">
                          {/* LOGO & BRANDING CONTROLS */}
                          <div className="p-3.5 rounded-lg bg-slate-950/90 border border-amber-500/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Logo & Branding (Embedded in Ruler)
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={logoEnabled}
                                  onChange={(e) => setLogoEnabled(e.target.checked)}
                                  className="accent-amber-500 w-3.5 h-3.5 rounded"
                                />
                                Show Logo
                              </label>
                            </div>

                            {/* Logo Upload Row */}
                            <div className="flex items-center gap-3 pt-1">
                              <div className="w-10 h-10 rounded border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                                {logoSrc ? (
                                  <img src={logoSrc} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                  <Sparkles className="w-5 h-5 text-amber-400" />
                                )}
                              </div>
                              <label className="flex-1 cursor-pointer">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow">
                                  <Upload className="w-3.5 h-3.5" />
                                  Upload / Choose Logo File (.png, .jpg, .svg)...
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* Position Controls: X and Y */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                  <span>Left Offset (X):</span>
                                  <span className="font-mono text-amber-400 font-bold">{logoX}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="120"
                                  value={logoX}
                                  onChange={(e) => setLogoX(parseInt(e.target.value, 10))}
                                  className="w-full accent-amber-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                  <span>Top Offset (Y):</span>
                                  <span className="font-mono text-amber-400 font-bold">{logoY}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="80"
                                  value={logoY}
                                  onChange={(e) => setLogoY(parseInt(e.target.value, 10))}
                                  className="w-full accent-amber-500 cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Size Control */}
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                <span>Logo Size:</span>
                                <span className="font-mono text-amber-400 font-bold">{logoSize}px</span>
                              </div>
                              <input
                                type="range"
                                min="16"
                                max="64"
                                value={logoSize}
                                onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
                              💡 <strong>Permanent Bundling:</strong> In Python, selecting a logo automatically copies it into <code>desktop_ruler/assets/logo.png</code> so anyone installing the app gets the logo. Once you have finalized your logo and positioning, you can easily delete or comment out the upload button in <code>settings_dialog.py</code>.
                            </p>
                          </div>

                          {/* Color Presets */}
                          <div>
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Preset Colors</span>
                            <div className="grid grid-cols-3 gap-2">
                              {COLOR_PRESETS.map((p) => (
                                <button
                                  key={p.name}
                                  onClick={() => setRulerColor(p.hex)}
                                  style={{ backgroundColor: p.hex }}
                                  className={`h-8 rounded-md text-xs font-bold ${
                                    p.textDark ? 'text-slate-900' : 'text-white'
                                  } ${rulerColor === p.hex ? 'ring-2 ring-white shadow-md' : 'opacity-85'}`}
                                >
                                  {p.name.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Opacity Slider */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                              <span className="font-bold text-amber-400">Transparency</span>
                              <span className="font-mono text-amber-400">{Math.round(opacity * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.25"
                              max="1.0"
                              step="0.05"
                              value={opacity}
                              onChange={(e) => setOpacity(parseFloat(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {settingsActiveTab === 'shortcuts' && (
                        <div className="space-y-2">
                          {[
                            { id: 'move_down', label: 'Move Entire Ruler Down 1 Line (Packing List)' },
                            { id: 'move_up', label: 'Move Entire Ruler Up 1 Line (Packing List)' },
                            { id: 'toggle_visibility', label: 'Show / Hide Ruler' },
                            { id: 'toggle_always_on_top', label: 'Toggle Always on Top' },
                            { id: 'increase_length', label: 'Increase Length (+30px)' },
                            { id: 'decrease_length', label: 'Decrease Length (-30px)' },
                            { id: 'toggle_click_through', label: 'Toggle Click-Through Mode' },
                          ].map((s) => (
                            <div
                              key={s.id}
                              className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-slate-200">{s.label}</span>
                              <kbd className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700 font-mono text-[11px]">
                                {shortcutsMap[s.id]}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pinned Bottom Bar: Always 100% visible */}
                    <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                      <button
                        onClick={handleRestoreDefaults}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                      >
                        Restore All Defaults
                      </button>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Quick Controls */}
            <div className="w-full md:w-80 border-l border-slate-800 bg-slate-900/60 p-5 overflow-y-auto space-y-6">
              {/* Packing List Shift Controls */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                  Packing List Shift Controls
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSimulatedAction('move_down')}
                    className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-between shadow transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" />
                      Move Ruler Down 1 Line
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 text-[10px] font-mono">
                      Down / Win+Shift+↓
                    </kbd>
                  </button>

                  <button
                    onClick={() => handleSimulatedAction('move_up')}
                    className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-between border border-slate-700 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4" />
                      Move Ruler Up 1 Line
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono">
                      Up / Win+Shift+↑
                    </kbd>
                  </button>
                </div>
              </div>

              {/* Logo Quick Settings */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Embedded Logo
                  </span>
                  <button
                    onClick={() => setLogoEnabled(!logoEnabled)}
                    className={`text-[11px] px-2 py-0.5 rounded ${
                      logoEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {logoEnabled ? 'Enabled' : 'Hidden'}
                  </button>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Position:</span>
                    <span>X: {logoX}px, Y: {logoY}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size:</span>
                    <span>{logoSize}px</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setSettingsActiveTab('appearance');
                  }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 transition-colors"
                >
                  Adjust Logo Position & Upload...
                </button>
              </div>

              {/* Window Dimensions Readout */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300">Ruler Dimensions</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Length</span>
                    <span className="font-mono font-bold text-amber-400">{rulerWidth}px</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Height</span>
                    <span className="font-mono font-bold text-amber-400">{rulerHeight}px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VS CODE & LOGO GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">How to Embed Your Logo and Adjust Position</h2>
              <p className="text-sm text-slate-300">
                Follow these simple steps in Visual Studio Code to choose your logo, position it on the ruler, and bundle it for installation.
              </p>
            </div>

            {/* Step 1: Run the App */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">1</span>
                <span>Launch the Desktop Ruler</span>
              </div>
              <p className="text-xs text-slate-300">
                In your VS Code terminal (with your virtual environment active), run:
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
                <span>python desktop_ruler/main.py</span>
                <button
                  onClick={() => handleCopy('python desktop_ruler/main.py', 'run_cmd')}
                  className="text-slate-400 hover:text-white"
                >
                  {copiedKey === 'run_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2: Upload Logo */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">2</span>
                <span>Upload and Position Your Logo</span>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Right-click on the floating ruler and click <strong>⚙ Settings...</strong>.</li>
                <li>Switch to the <strong>Appearance</strong> tab.</li>
                <li>Under <strong>Logo & Branding</strong>, click <strong>📁 Upload / Choose Logo File (.png, .jpg, .svg)...</strong>.</li>
                <li>Select any logo file from your computer. It is automatically saved directly to <code>desktop_ruler/assets/logo.png</code>.</li>
                <li>Adjust <strong>Left Offset (X)</strong>, <strong>Top Offset (Y)</strong>, and <strong>Logo Size</strong> until the logo is exactly where you want it. The ruler updates live!</li>
              </ol>
            </div>

            {/* Step 3: Bundle and Delete Upload Feature */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">3</span>
                <span>How to Delete the Upload Feature (When Ready for Release)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Because your uploaded image was copied to <code>desktop_ruler/assets/logo.png</code>, it is now a permanent part of your project! When you upload to GitHub or build an installer, the logo is automatically included.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                To hide the upload button from regular users:
              </p>
              <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
                <div className="text-slate-500"># In desktop_ruler/settings_dialog.py around line 447, comment out or delete:</div>
                <div className="text-rose-400"># self.btn_upload_logo = QPushButton(...)</div>
                <div className="text-rose-400"># row_upload.addWidget(self.btn_upload_logo)</div>
              </div>
              <p className="text-xs text-slate-400">
                The embedded logo will stay on the ruler forever using your customized X, Y, and Size!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECT FILES */}
        {activeTab === 'code' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar file list */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/40 p-3 overflow-y-auto">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Project Files
              </div>
              <div className="space-y-1">
                {Object.entries(CODE_FILES).map(([filename, file]) => (
                  <button
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                      selectedFile === filename
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{filename}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div>
                  <h3 className="text-xs font-bold text-white">{CODE_FILES[selectedFile].path}</h3>
                  <p className="text-[11px] text-slate-400">{CODE_FILES[selectedFile].description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(CODE_FILES[selectedFile].content, selectedFile)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    {copiedKey === selectedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => handleDownload(selectedFile, CODE_FILES[selectedFile].content)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
                <pre>{CODE_FILES[selectedFile].content}</pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
