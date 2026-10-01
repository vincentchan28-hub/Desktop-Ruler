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
  ListOrdered
} from 'lucide-react';

const CODE_FILES: Record<string, { path: string; language: string; content: string; description: string }> = {
  'settings_dialog.py': {
    path: 'desktop_ruler/settings_dialog.py',
    language: 'python',
    description: 'Scrollable tabbed Settings Dialog with General, Appearance, Shortcuts, Move Step control, and Key Recorder.',
    content: `"""Settings Dialog for Desktop Ruler with Scrollable Tabs & Move Step."""
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtWidgets import (
    QDialog, QWidget, QVBoxLayout, QHBoxLayout, QTabWidget,
    QLabel, QPushButton, QCheckBox, QSlider, QSpinBox, QScrollArea, QFrame, QMessageBox
)
from desktop_ruler.settings import SettingsManager, DEFAULT_SETTINGS

class SettingsDialog(QDialog):
    move_step_changed = Signal(int)
    # Scrollable tabs ensure settings never cut off on any screen size`
  },
  'ruler_window.py': {
    path: 'desktop_ruler/ruler_window.py',
    language: 'python',
    description: 'Ruler window. Fixes Up/Down to shift the whole ruler by move_step (for packing lists) and not resize height.',
    content: `"""Ruler Window implementation using PySide6 (Qt)."""
from PySide6.QtCore import Qt, QPoint, QRect, QSize, QTimer
from PySide6.QtWidgets import QWidget, QMenu
from desktop_ruler.settings_dialog import SettingsDialog

class DesktopRuler(QWidget):
    def move_relative(self, dx: int, dy: int):
        new_x = self.x() + dx
        new_y = self.y() + dy
        self.setGeometry(new_x, new_y, self.width(), self.height())
        self._save_geometry()
        if dy > 0: self.show_toast(f"▼ Moved Down {dy}px")
        elif dy < 0: self.show_toast(f"▲ Moved Up {abs(dy)}px")`
  },
  'hotkeys.py': {
    path: 'desktop_ruler/hotkeys.py',
    language: 'python',
    description: 'Win32 RegisterHotKey manager with Ctrl+Alt+Down/Up (avoids Windows 11 snap conflicts).',
    content: `"""Windows Native Global Hotkeys Manager using ctypes (RegisterHotKey)."""
# Primary hotkeys mapped to Ctrl+Alt+Down and Ctrl+Alt+Up to avoid Windows 11 Snap interference`
  },
  'settings.py': {
    path: 'desktop_ruler/settings.py',
    language: 'python',
    description: 'JSON settings manager with move_step support.',
    content: `DEFAULT_SETTINGS = {
    "behavior": {"always_on_top": True, "click_through": False, "move_step": 28}
}`
  },
  'main.py': {
    path: 'desktop_ruler/main.py',
    language: 'python',
    description: 'Entry point. Sets up Qt application, ruler window, and attaches hotkey manager.',
    content: `"""Desktop Ruler Entry Point."""`
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
  const [selectedFile, setSelectedFile] = useState<string>('ruler_window.py');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ruler Simulator State
  const [rulerWidth, setRulerWidth] = useState<number>(560);
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

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'appearance' | 'shortcuts'>('general');
  const [recordingAction, setRecordingAction] = useState<string | null>(null);

  // Shortcut key bindings state in simulator
  const [shortcutsMap, setShortcutsMap] = useState<Record<string, string>>({
    move_down: 'Ctrl + Alt + Down',
    move_up: 'Ctrl + Alt + Up',
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
  const totalMm = Math.max(10, Math.floor((rulerWidth - 36) / pxPerMm));
  const totalCm = (totalMm / 10).toFixed(1);

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
        triggerToast(`▼ Moved Down ${moveStep}px`);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: Math.max(10, p.y - moveStep) }));
        triggerToast(`▲ Moved Up ${moveStep}px`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveStep, isSettingsOpen]);

  const handleSimulatedAction = (action: string) => {
    if (action === 'move_down') {
      setPosition((p) => ({ ...p, y: p.y + moveStep }));
      triggerToast(`▼ Entire Ruler Moved Down ${moveStep}px`);
    } else if (action === 'move_up') {
      setPosition((p) => ({ ...p, y: Math.max(10, p.y - moveStep) }));
      triggerToast(`▲ Entire Ruler Moved Up ${moveStep}px`);
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

  const handleRestoreDefaults = () => {
    setRulerColor('#FBBF24');
    setOpacity(0.88);
    setReadingGuide(false);
    setLineSpacing(28);
    setMoveStep(28);
    setRulerWidth(560);
    setRulerHeight(85);
    triggerToast('All settings restored to defaults');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Ruler className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">Desktop Ruler</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Move Step (Packing List) Fixed
              </span>
            </div>
            <p className="text-xs text-slate-400">Shift Entire Ruler Up/Down • Scrollable Responsive Settings</p>
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
            VS Code Setup
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
              <div className="absolute inset-0 p-8 overflow-hidden pointer-events-none opacity-50">
                <div className="max-w-2xl mx-auto space-y-3 font-mono text-xs text-slate-300">
                  <div className="font-bold text-amber-400 text-sm mb-3">SAMPLE WAREHOUSE PACKING LIST</div>
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
              <div className="absolute top-4 left-6 z-10 flex items-center gap-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3.5 py-1.5 rounded-full text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Move Step: <strong className="text-amber-400">{moveStep}px per line</strong></span>
                <span className="text-slate-600">•</span>
                <span>Press <strong>Down / Up</strong> keys to shift ruler line by line</span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="ml-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                  Settings Window
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

                  {/* Markings */}
                  <div className="relative w-full h-full overflow-hidden select-none pointer-events-none">
                    {Array.from({ length: totalMm + 1 }).map((_, mm) => {
                      const xPos = 16 + mm * pxPerMm;
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
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg h-[440px] flex flex-col overflow-hidden">
                    {/* Top Bar */}
                    <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
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
                        Appearance
                      </button>
                      <button
                        onClick={() => setSettingsActiveTab('shortcuts')}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-t border-x flex items-center gap-1.5 ${
                          settingsActiveTab === 'shortcuts'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Shortcuts</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">13</span>
                      </button>
                    </div>

                    {/* Scrollable Tab Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {settingsActiveTab === 'general' && (
                        <div className="space-y-4">
                          {/* Packing List Step */}
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                              <ListOrdered className="w-4 h-4" />
                              Vertical Move Step (Packing List & Document Line Height)
                            </div>
                            <p className="text-[11px] text-amber-200/80 leading-relaxed">
                              Controls how many pixels the entire ruler shifts up or down when pressing Down/Up keys or global shortcuts:
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-slate-200">Pixels per step:</span>
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

                          {/* Reset */}
                          <button
                            onClick={() => {
                              setRulerWidth(560);
                              setRulerHeight(85);
                              triggerToast('Ruler reset to default 560×85 px');
                            }}
                            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                          >
                            Reset Ruler Dimensions (560×85 px)
                          </button>
                        </div>
                      )}

                      {settingsActiveTab === 'appearance' && (
                        <div className="space-y-4">
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
                            { id: 'move_down', label: 'Move Entire Ruler Down 1 Line' },
                            { id: 'move_up', label: 'Move Entire Ruler Up 1 Line' },
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
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                  Packing List Shift Controls
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSimulatedAction('move_down')}
                    className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all"
                  >
                    <ArrowDown className="w-4 h-4" />
                    Move Ruler Down 1 Line (+{moveStep}px)
                  </button>
                  <button
                    onClick={() => handleSimulatedAction('move_up')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Move Ruler Up 1 Line (-{moveStep}px)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  In the desktop app, simply press the <strong>Down</strong> or <strong>Up</strong> arrow keys or <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Ctrl+Alt+Down</kbd> while working in another app to move down line by line!
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  Settings Menu
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Open Full Settings Dialog
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VS CODE SETUP */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Terminal className="w-4 h-4" />
                Updated Fixes for Visual Studio Code
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Packing List Line Movement & Viewport Fix
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-semibold text-amber-400 text-sm">1. Line Movement (Packing List Navigation)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When you press the <strong>Down</strong> arrow or <strong>Ctrl + Alt + Down</strong> (global), the entire ruler moves down by your configured line step (default 28px). It will no longer increase the ruler's thickness!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-semibold text-amber-400 text-sm">2. Configurable Move Step</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open <strong>Settings → General</strong> and adjust <strong>Vertical Move Step</strong> to match the exact line height of your packing lists, spreadsheets, or documents.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="font-semibold text-amber-400 text-sm">3. Settings Viewport No Longer Chopped Off</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All tabs now have smooth internal scrollbars. The dialog is resizable and the bottom buttons (Restore Defaults and Close) are pinned and always visible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 border-r border-slate-800 bg-slate-900/80 p-4 space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                Project Files
              </div>
              <div className="space-y-1">
                {Object.entries(CODE_FILES).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFile(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedFile === key
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{key}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-amber-400">{CODE_FILES[selectedFile].path}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{CODE_FILES[selectedFile].description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(CODE_FILES[selectedFile].content, selectedFile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
                  >
                    {copiedKey === selectedFile ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-slate-300">
                <pre className="whitespace-pre">{CODE_FILES[selectedFile].content}</pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
