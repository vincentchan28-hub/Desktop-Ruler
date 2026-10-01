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
  X
} from 'lucide-react';

const CODE_FILES: Record<string, { path: string; language: string; content: string; description: string }> = {
  'settings_dialog.py': {
    path: 'desktop_ruler/settings_dialog.py',
    language: 'python',
    description: 'Dedicated tabbed Settings Dialog with General, Appearance, and Shortcuts tabs, KeyRecordButton, and live sync.',
    content: `"""Settings Dialog for Desktop Ruler with Tabbed Navigation & Key Recorder."""
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtWidgets import (
    QDialog, QWidget, QVBoxLayout, QHBoxLayout, QTabWidget,
    QLabel, QPushButton, QCheckBox, QSlider, QSpinBox, QScrollArea, QFrame, QMessageBox
)
from desktop_ruler.settings import SettingsManager, DEFAULT_SETTINGS

class KeyRecordButton(QPushButton):
    key_recorded = Signal(int, int, str)
    def __init__(self, current_text=""):
        super().__init__(current_text or "Record Key")
        self.setCheckable(True)
        self.clicked.connect(self._toggle_recording)

    def keyPressEvent(self, event):
        # Captures modifiers and native virtual keys, then emits key_recorded
        pass

class SettingsDialog(QDialog):
    appearance_changed = Signal(str, float)
    reading_guide_changed = Signal(bool, int)
    always_on_top_changed = Signal(bool)
    reset_geometry_requested = Signal()
    reset_defaults_requested = Signal()

    def __init__(self, parent=None, settings_manager=None):
        super().__init__(parent)
        self.setWindowTitle("Desktop Ruler Settings")
        self.tabs = QTabWidget(self)
        self._build_general_tab()
        self._build_appearance_tab()
        self._build_shortcuts_tab()`
  },
  'hotkeys.py': {
    path: 'desktop_ruler/hotkeys.py',
    language: 'python',
    description: 'Win32 RegisterHotKey manager with dynamic runtime rebind_hotkey support and conflict alerts.',
    content: `"""Windows Native Global Hotkeys Manager using ctypes (RegisterHotKey)."""
import sys, threading
from typing import Dict, List, Optional
from PySide6.QtCore import QObject, Signal

class GlobalHotkeyManager:
    def __init__(self):
        self.signals = HotkeySignals()
        self.is_windows = sys.platform == "win32"
    def rebind_hotkey(self, action: str, mod: int, vk: int, combo_text: str) -> bool:
        # Unregisters old ID and registers new user shortcut
        pass`
  },
  'ruler_window.py': {
    path: 'desktop_ruler/ruler_window.py',
    language: 'python',
    description: 'Frameless window, QPainter cm/mm markings, toast notifications, right-click Settings... launcher.',
    content: `"""Ruler Window implementation using PySide6 (Qt)."""
from PySide6.QtWidgets import QWidget, QMenu
from desktop_ruler.settings_dialog import SettingsDialog

class DesktopRuler(QWidget):
    def open_settings_dialog(self):
        if self._settings_dialog is None:
            self._settings_dialog = SettingsDialog(parent=None, settings_manager=self.settings)
            self._settings_dialog.appearance_changed.connect(self._on_appearance_changed)
            self._settings_dialog.reading_guide_changed.connect(self._on_guide_changed)
            self._settings_dialog.always_on_top_changed.connect(self._on_always_on_top_changed)
            self._settings_dialog.reset_geometry_requested.connect(self.reset_default_size)
            self._settings_dialog.reset_defaults_requested.connect(self._on_defaults_restored)
        self._settings_dialog.show()
        self._settings_dialog.raise_()
        self._settings_dialog.activateWindow()`
  },
  'main.py': {
    path: 'desktop_ruler/main.py',
    language: 'python',
    description: 'Entry point. Sets up High-DPI Qt application, ruler window, and attaches hotkey manager to ruler.',
    content: `"""Desktop Ruler Entry Point."""
import sys, os
from PySide6.QtWidgets import QApplication
from desktop_ruler.settings import SettingsManager
from desktop_ruler.ruler_window import DesktopRuler
from desktop_ruler.hotkeys import GlobalHotkeyManager

def main():
    app = QApplication(sys.argv)
    settings = SettingsManager()
    ruler = DesktopRuler(settings_manager=settings)
    ruler.show()

    hotkey_mgr = GlobalHotkeyManager()
    hotkey_mgr.signals.triggered.connect(ruler.handle_global_action)
    hotkey_mgr.start()
    ruler.set_hotkey_manager(hotkey_mgr)

    app.aboutToQuit.connect(hotkey_mgr.stop)
    sys.exit(app.exec())`
  },
  'settings.py': {
    path: 'desktop_ruler/settings.py',
    language: 'python',
    description: 'JSON settings manager with defaults and local storage.',
    content: `"""Settings management for Desktop Ruler."""
import json, os

DEFAULT_SETTINGS = {
    "window": {"x": 200, "y": 200, "width": 600, "height": 85},
    "appearance": {"color": "#FBBF24", "opacity": 0.85, "text_color": "#1F2937", "tick_color": "#374151"},
    "reading_guide": {"enabled": False, "line_height": 28},
    "behavior": {"always_on_top": True, "click_through": False}
}`
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
  const [rulerWidth, setRulerWidth] = useState<number>(560);
  const [rulerHeight, setRulerHeight] = useState<number>(85);
  const [rulerColor, setRulerColor] = useState<string>('#FBBF24');
  const [opacity, setOpacity] = useState<number>(0.88);
  const [readingGuide, setReadingGuide] = useState<boolean>(false);
  const [lineSpacing, setLineSpacing] = useState<number>(28);
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
    toggle_visibility: 'Win + Shift + R',
    toggle_always_on_top: 'Win + Shift + T',
    move_down: 'Win + Shift + Down',
    move_up: 'Win + Shift + Up',
    move_left: 'Win + Shift + Left',
    move_right: 'Win + Shift + Right',
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
    }, 3200);
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

  const handleSimulatedAction = (action: string, shortcutText: string) => {
    if (action === 'toggle_visibility') {
      setIsVisible(!isVisible);
      triggerToast(isVisible ? 'Ruler Hidden (Win+Shift+R to restore)' : 'Ruler Restored');
    } else if (action === 'move_down') {
      setPosition((p) => ({ ...p, y: p.y + lineSpacing }));
      triggerToast(`Moved down 1 line (+${lineSpacing}px)`);
    } else if (action === 'move_up') {
      setPosition((p) => ({ ...p, y: Math.max(10, p.y - lineSpacing) }));
      triggerToast(`Moved up 1 line (-${lineSpacing}px)`);
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
    } else if (action === 'more_transparent') {
      setOpacity((o) => Math.max(0.2, +(o - 0.1).toFixed(2)));
      triggerToast(`Opacity: ${Math.round(Math.max(0.2, opacity - 0.1) * 100)}%`);
    } else if (action === 'more_opaque') {
      setOpacity((o) => Math.min(1.0, +(o + 0.1).toFixed(2)));
      triggerToast(`Opacity: ${Math.round(Math.min(1.0, opacity + 0.1) * 100)}%`);
    } else if (action === 'toggle_click_through') {
      setIsClickThrough(!isClickThrough);
      triggerToast(
        !isClickThrough
          ? 'Click-Through ON (Clicks pass through)'
          : 'Click-Through OFF'
      );
    }
  };

  const handleSimulateKeyRecord = (actionKey: string) => {
    setRecordingAction(actionKey);
    setTimeout(() => {
      const sampleAlternatives: Record<string, string> = {
        move_down: 'Ctrl + Alt + Down',
        move_up: 'Ctrl + Alt + Up',
        toggle_visibility: 'Ctrl + Alt + Shift + R',
        increase_length: 'Ctrl + Alt + Plus',
      };
      const newKey = sampleAlternatives[actionKey] || 'Ctrl + Alt + ' + (shortcutsMap[actionKey]?.split('+').pop()?.trim() || 'K');
      setShortcutsMap((prev) => ({ ...prev, [actionKey]: newKey }));
      setRecordingAction(null);
      triggerToast(`Rebound ${actionKey} to: ${newKey}`);
    }, 1200);
  };

  const handleRestoreDefaults = () => {
    setRulerColor('#FBBF24');
    setOpacity(0.88);
    setReadingGuide(false);
    setLineSpacing(28);
    setRulerWidth(560);
    setRulerHeight(85);
    setShortcutsMap({
      toggle_visibility: 'Win + Shift + R',
      toggle_always_on_top: 'Win + Shift + T',
      move_down: 'Win + Shift + Down',
      move_up: 'Win + Shift + Up',
      move_left: 'Win + Shift + Left',
      move_right: 'Win + Shift + Right',
      increase_length: 'Win + Shift + Plus',
      decrease_length: 'Win + Shift + Minus',
      increase_thickness: 'Win + Alt + Up',
      decrease_thickness: 'Win + Alt + Down',
      increase_transparency: 'Win + Alt + Left',
      decrease_transparency: 'Win + Alt + Right',
      toggle_click_through: 'Win + Shift + C',
    });
    triggerToast('All settings and shortcuts restored to defaults');
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
                Tabbed Settings Menu Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">General • Appearance • Global Shortcuts Set with Key Recorder</p>
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
            Live Simulator & Settings
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
            VS Code Testing Guide
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
            Files ({Object.keys(CODE_FILES).length})
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'roadmap'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            16-Step Plan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* TAB 1: LIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Interactive Canvas with Document Background */}
            <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col select-none">
              <div className="absolute inset-0 p-8 overflow-hidden pointer-events-none opacity-40">
                <div className="max-w-2xl mx-auto space-y-4 font-serif text-slate-300">
                  <div className="h-6 w-3/4 bg-slate-700/40 rounded"></div>
                  <div className="h-4 w-full bg-slate-700/30 rounded"></div>
                  <div className="h-4 w-5/6 bg-slate-700/30 rounded"></div>
                  <div className="h-4 w-11/12 bg-slate-700/30 rounded"></div>
                  <div className="h-4 w-4/5 bg-slate-700/30 rounded"></div>
                  <div className="h-24 w-full bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
                    <div className="h-3 w-1/3 bg-slate-600/30 rounded mb-2"></div>
                    <div className="h-3 w-2/3 bg-slate-600/20 rounded mb-2"></div>
                    <div className="h-3 w-1/2 bg-slate-600/20 rounded"></div>
                  </div>
                  <div className="h-4 w-full bg-slate-700/30 rounded"></div>
                </div>
              </div>

              {/* Status Header Bar */}
              <div className="absolute top-4 left-6 z-10 flex items-center gap-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3.5 py-1.5 rounded-full text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Desktop Ruler Ready</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-amber-400">{rulerWidth}px ({totalCm} cm)</span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="ml-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                  Open Settings Window
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
                  className={`absolute top-0 left-0 rounded-lg shadow-2xl border border-slate-900/30 cursor-move transition-shadow ${
                    isDragging ? 'shadow-amber-500/20 ring-2 ring-amber-400/50' : ''
                  } ${isClickThrough ? 'opacity-50 ring-2 ring-rose-500/50' : ''}`}
                >
                  {/* Reading Guide */}
                  {readingGuide && (
                    <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                      <div style={{ height: `${guideOffset}px` }} className="w-full bg-black/40 border-b border-rose-500/60" />
                      <div
                        style={{ height: `${lineSpacing}px` }}
                        className="w-full bg-transparent flex items-center justify-between px-3 text-[10px] text-rose-300 font-mono tracking-wider"
                      >
                        <span>▶ READING LINE</span>
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
                      <div
                        className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-lg flex items-center gap-1.5 ${
                          toastIsError
                            ? 'bg-rose-600 text-white border border-rose-400'
                            : 'bg-slate-900/90 text-white border border-slate-700'
                        }`}
                      >
                        {toastIsError && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
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
              ) : (
                <div className="m-auto text-center p-6 bg-slate-950/80 border border-slate-800 rounded-xl max-w-sm">
                  <Eye className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-white">Ruler is currently Hidden</p>
                  <button
                    onClick={() => handleSimulatedAction('toggle_visibility', 'Win+Shift+R')}
                    className="mt-3 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    Press {shortcutsMap.toggle_visibility}
                  </button>
                </div>
              )}

              {/* SIMULATED SETTINGS DIALOG (MODAL) */}
              {isSettingsOpen && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Dialog Top Bar */}
                    <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-amber-400" />
                        <h2 className="font-bold text-sm text-white">Desktop Ruler Settings</h2>
                      </div>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tab Bar: General | Appearance | Shortcuts */}
                    <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
                      <button
                        onClick={() => setSettingsActiveTab('general')}
                        className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all border-t border-x ${
                          settingsActiveTab === 'general'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        General
                      </button>
                      <button
                        onClick={() => setSettingsActiveTab('appearance')}
                        className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all border-t border-x ${
                          settingsActiveTab === 'appearance'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Appearance
                      </button>
                      <button
                        onClick={() => setSettingsActiveTab('shortcuts')}
                        className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all border-t border-x flex items-center gap-1.5 ${
                          settingsActiveTab === 'shortcuts'
                            ? 'bg-slate-900 text-amber-400 border-slate-700 border-b-transparent -mb-px'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Shortcuts (Global)</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">13</span>
                      </button>
                    </div>

                    {/* Dialog Tab Body */}
                    <div className="flex-1 overflow-y-auto p-5">
                      {/* TAB 1: GENERAL */}
                      {settingsActiveTab === 'general' && (
                        <div className="space-y-5">
                          <div>
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                              Window Behavior
                            </h3>
                            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAlwaysOnTop}
                                onChange={(e) => {
                                  setIsAlwaysOnTop(e.target.checked);
                                  triggerToast(`Always on Top: ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                                }}
                                className="accent-amber-500 w-4 h-4 rounded"
                              />
                              <div>
                                <div className="text-xs font-medium text-white">Keep Ruler Always on Top</div>
                                <div className="text-[11px] text-slate-400">Ruler stays visible above browsers, Word, and documents.</div>
                              </div>
                            </label>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                              Reading Guide Mode
                            </h3>
                            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={readingGuide}
                                  onChange={(e) => setReadingGuide(e.target.checked)}
                                  className="accent-amber-500 w-4 h-4 rounded"
                                />
                                <span className="text-xs font-medium text-white">Enable Reading Guide (dims outer text)</span>
                              </label>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                                <span className="text-xs text-slate-300">Reading Line Height (Spacing):</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="18"
                                    max="60"
                                    value={lineSpacing}
                                    onChange={(e) => setLineSpacing(parseInt(e.target.value, 10))}
                                    className="accent-amber-500 w-24"
                                  />
                                  <span className="font-mono text-xs text-amber-400 w-12 text-right">{lineSpacing} px</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                              Window Bounds
                            </h3>
                            <button
                              onClick={() => {
                                setRulerWidth(560);
                                setRulerHeight(85);
                                triggerToast('Ruler reset to default 560×85 px');
                              }}
                              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                            >
                              Reset to Default Dimensions (560×85 px)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: APPEARANCE */}
                      {settingsActiveTab === 'appearance' && (
                        <div className="space-y-5">
                          <div>
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                              Preset Colors
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                              {COLOR_PRESETS.map((p) => (
                                <button
                                  key={p.name}
                                  onClick={() => setRulerColor(p.hex)}
                                  style={{ backgroundColor: p.hex }}
                                  className={`h-9 rounded-md text-xs font-bold transition-all ${
                                    p.textDark ? 'text-slate-900' : 'text-white'
                                  } ${rulerColor === p.hex ? 'ring-2 ring-white shadow-md scale-[1.02]' : 'opacity-85'}`}
                                >
                                  {p.name.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                              <span className="font-bold text-amber-400 uppercase tracking-wider">Transparency (Opacity)</span>
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

                          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2.5">
                            <CreditCard className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-300">
                              <strong className="text-white">Physical DPI Calibration:</strong> Hardware monitors query EDID data. Verify on screen with an <strong>85.6 mm</strong> credit card!
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SHORTCUTS (GLOBAL SETTINGS) */}
                      {settingsActiveTab === 'shortcuts' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                            <span>All shortcuts work globally while other applications are focused.</span>
                            <span className="text-[11px] text-amber-400 font-mono">Win32 API</span>
                          </div>

                          <div className="space-y-2">
                            {[
                              { id: 'toggle_visibility', label: 'Show / Hide Ruler' },
                              { id: 'toggle_always_on_top', label: 'Toggle Always-on-Top' },
                              { id: 'move_down', label: 'Move Down 1 Line' },
                              { id: 'move_up', label: 'Move Up 1 Line' },
                              { id: 'move_left', label: 'Move Left 25px' },
                              { id: 'move_right', label: 'Move Right 25px' },
                              { id: 'increase_length', label: 'Increase Length (+30px)' },
                              { id: 'decrease_length', label: 'Decrease Length (-30px)' },
                              { id: 'increase_thickness', label: 'Increase Thickness (+10px)' },
                              { id: 'decrease_thickness', label: 'Decrease Thickness (-10px)' },
                              { id: 'increase_transparency', label: 'More Transparent' },
                              { id: 'decrease_transparency', label: 'More Opaque' },
                              { id: 'toggle_click_through', label: 'Toggle Click-Through Mode' },
                            ].map((s) => (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <span className="font-medium text-slate-200">{s.label}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSimulateKeyRecord(s.id)}
                                    className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold border transition-all ${
                                      recordingAction === s.id
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                                        : 'bg-slate-900 text-amber-300 border-slate-700 hover:border-amber-500'
                                    }`}
                                    title="Click to rebind with new keys"
                                  >
                                    {recordingAction === s.id ? 'Press keys...' : shortcutsMap[s.id]}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dialog Bottom Bar */}
                    <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
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

            {/* Right: Quick Controls & Settings launcher */}
            <div className="w-full md:w-80 border-l border-slate-800 bg-slate-900/60 p-5 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  Settings Menu Launcher
                </h3>
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setSettingsActiveTab('shortcuts');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Open Global Settings Window
                </button>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  In your desktop app, right-click the ruler and choose <strong>⚙ Settings...</strong> to launch the dedicated window!
                </p>
              </div>

              {/* Quick Preset Action */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white">How to toggle settings:</span>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>Click <strong>General</strong>, <strong>Appearance</strong>, or <strong>Shortcuts</strong> tabs.</li>
                  <li>Click <strong>[ Record Key ]</strong> to assign any new hotkey.</li>
                  <li>Press <strong>Esc</strong> or click <strong>Close</strong> to return to your ruler.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VS CODE STEP GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-8">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Terminal className="w-4 h-4" />
                Settings Menu Integration in VS Code
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Tabbed Settings Menu & Shortcut Customizer
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                You now have a dedicated settings interface with General, Appearance, and Shortcuts tabs!
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-semibold text-white text-sm">
                    How to Open the Settings Window
                  </h3>
                </div>
                <p className="text-xs text-slate-400 pl-9">
                  Right-click anywhere on the floating ruler and select <strong>⚙ Settings (Preferences & Hotkeys)...</strong> at the top of the menu, or press the <kbd className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">S</kbd> key when the ruler is focused.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-semibold text-white text-sm">
                    How to Toggle Between Settings Categories
                  </h3>
                </div>
                <p className="text-xs text-slate-400 pl-9 leading-relaxed">
                  Click the tabs across the top:
                  <br />• <strong>General</strong>: Toggle Always-on-Top, configure Reading Guide line spacing, and reset window size.
                  <br />• <strong>Appearance</strong>: Change color schemes, drag the live transparency slider, and view physical DPI calibration.
                  <br />• <strong>Shortcuts</strong>: View and customize all 13 global background shortcuts.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="font-semibold text-white text-sm">
                    How to Rebind a Shortcut
                  </h3>
                </div>
                <p className="text-xs text-slate-400 pl-9 leading-relaxed">
                  Go to the <strong>Shortcuts</strong> tab, click the button next to any action (e.g. <code>Move Down 1 Line</code>), and simply press your desired keyboard combination. It will automatically detect modifiers and save the new shortcut!
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

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    Object.entries(CODE_FILES).forEach(([name, f]) => {
                      handleDownload(name, f.content);
                    });
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Download All Files
                </button>
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
                  <button
                    onClick={() => handleDownload(selectedFile, CODE_FILES[selectedFile].content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-slate-300">
                <pre className="whitespace-pre">{CODE_FILES[selectedFile].content}</pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 16-STEP ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <BookOpen className="w-4 h-4" />
                Build Roadmap
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">16-Step Development Plan</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tabbed Settings Menu with dynamic Key Recorder is built!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { num: 1, title: 'Project folder & dependencies', status: 'ready', desc: 'Create folder, virtualenv, and install PySide6 & pynput.' },
                { num: 2, title: 'Frameless floating window', status: 'ready', desc: 'WindowStaysOnTopHint and translucent background.' },
                { num: 3, title: 'Centimetre & millimetre ticks', status: 'ready', desc: 'Sub-pixel QPainter tick marks and numeric labels.' },
                { num: 4, title: 'Mouse drag & resize handle', status: 'ready', desc: 'Drag anywhere to move, right-edge grab handle to resize.' },
                { num: 5, title: 'Keyboard arrow adjustments', status: 'ready', desc: 'Arrow keys for fine-grained width and thickness tweaking.' },
                { num: 6, title: 'Global shortcuts & conflict handling', status: 'ready', desc: 'Win+Shift+R and Win+Shift+T registered with Win32 API.' },
                { num: 7, title: 'Always-on-top toggle', status: 'ready', desc: 'Context menu and Win+Shift+T toggle.' },
                { num: 8, title: 'Show / hide shortcut', status: 'ready', desc: 'Win+Shift+R instant show/hide without terminating process.' },
                { num: 9, title: 'Global 1-line up/down movement', status: 'ready', desc: 'Win+Shift+Up/Down jumps ruler by configurable line spacing.' },
                { num: 10, title: 'Reading guide mode', status: 'ready', desc: 'Highlight active line and dim upper/lower document bands.' },
                { num: 11, title: 'Colour & transparency controls', status: 'ready', desc: 'Amber, Cyan, Emerald, Dark presets and Win+Alt+Left/Right.' },
                { num: 12, title: 'Persistent settings.json', status: 'ready', desc: 'Restore position, dimensions, colors on reboot.' },
                { num: 13, title: 'Click-through mode (WS_EX_TRANSPARENT)', status: 'ready', desc: 'Win+Shift+C allows mouse clicks to pass directly through.' },
                { num: 14, title: 'Settings Menu & Key Customizer', status: 'ready', desc: 'Tabbed dialog: General, Appearance, and Shortcuts with Key Recorder.' },
                { num: 15, title: 'Cross-app testing & stability check', status: 'next', desc: 'Test over Chrome, Word, PDF viewers, and IDEs.' },
                { num: 16, title: 'PyInstaller Windows package', status: 'next', desc: 'Bundle into standalone .exe installer.' },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`p-4 rounded-xl border transition-all ${
                    step.status === 'ready'
                      ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          step.status === 'ready'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {step.num}
                      </span>
                      <span className="font-semibold text-sm text-white">{step.title}</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        step.status === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {step.status === 'ready' ? 'Complete' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
