import React from 'react';
import { X, Check } from 'lucide-react';
import { useTheme, Theme } from '../lib/ThemeContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEME_SWATCHES: { id: Theme; label: string; bg: string; border: string }[] = [
  { id: 'light', label: 'Light', bg: '#FFFFFF', border: '#CBD5E1' },
  { id: 'gray', label: 'Gray', bg: '#9CA3AF', border: '#6B7280' },
  { id: 'dark', label: 'Dark', bg: '#0F172A', border: '#0F172A' },
  { id: 'sepia', label: 'Sepia', bg: '#F4ECD8', border: '#D6C8A3' },
];

const HIGHLIGHTER_COLORS = ['#FDE047', '#86EFAC', '#93C5FD', '#FCA5A5', '#F0ABFC'];

export default function SettingsPanel({ open, onClose }: Props) {
  const { theme, setTheme, settings, updateSettings } = useTheme();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-slate-900 z-50 shadow-2xl overflow-y-auto animate-slide-in-right border-l border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close settings"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Appearance Section */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Appearance
            </h3>

            {/* Font Size */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Font Size</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateSettings({ fontSizeIndex: Math.max(0, settings.fontSizeIndex - 1) })}
                  className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  aria-label="Decrease font size"
                >
                  –
                </button>
                <span className="text-slate-700 dark:text-slate-200 font-semibold w-8 text-center">Aa</span>
                <button
                  onClick={() => updateSettings({ fontSizeIndex: Math.min(4, settings.fontSizeIndex + 1) })}
                  className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  aria-label="Increase font size"
                >
                  +
                </button>
              </div>
            </div>

            {/* Color Theme */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Color Theme</label>
              <div className="flex items-center space-x-2">
                {THEME_SWATCHES.map(sw => (
                  <button
                    key={sw.id}
                    onClick={() => setTheme(sw.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${
                      theme === sw.id ? 'ring-2 ring-uw-blue ring-offset-2 dark:ring-offset-slate-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: sw.bg, borderColor: sw.border }}
                    aria-label={sw.label}
                  >
                    {theme === sw.id && (
                      <Check size={14} className={sw.id === 'dark' ? 'text-white' : 'text-slate-800'} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Timer */}
            <ToggleRow
              label="Show Timer"
              checked={settings.showTimer}
              onChange={v => updateSettings({ showTimer: v })}
            />

            {/* Split Screen Explanations */}
            <ToggleRow
              label="Split Screen Explanations"
              checked={settings.splitScreen}
              onChange={v => updateSettings({ splitScreen: v })}
            />

            {/* Night Mode Auto */}
            <div className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Night Mode</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    If on, auto changes to dark mode based on scheduled time
                  </p>
                </div>
              </div>
              <ToggleRow
                label="Automatic"
                checked={settings.nightModeAuto}
                onChange={v => updateSettings({ nightModeAuto: v })}
              />
              <div className={`grid grid-cols-2 gap-4 mt-2 ${settings.nightModeAuto ? '' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Start</label>
                  <input
                    type="time"
                    value={settings.nightStart}
                    onChange={e => updateSettings({ nightStart: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">End</label>
                  <input
                    type="time"
                    value={settings.nightEnd}
                    onChange={e => updateSettings({ nightEnd: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Features
            </h3>

            <ToggleRow
              label="Confirm Answer Omission"
              checked={settings.confirmAnswerOmission}
              onChange={v => updateSettings({ confirmAnswerOmission: v })}
            />

            {/* Highlighter Color */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Default Highlighter</label>
              <div className="flex items-center space-x-2">
                {HIGHLIGHTER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateSettings({ highlighterColor: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      settings.highlighterColor === c
                        ? 'ring-2 ring-uw-blue ring-offset-2 dark:ring-offset-slate-900 scale-110 border-white'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Highlighter ${c}`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-uw-blue dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
