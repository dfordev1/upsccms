import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  initialNote: string;
  onSave: (note: string) => void | Promise<void>;
  questionNumber: number;
}

export default function NotesModal({ open, onClose, initialNote, onSave, questionNumber }: Props) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
      <div
        className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Notes — Question {questionNumber}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Write your personal notes for this question..."
            className="w-full h-64 resize-none px-4 py-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-uw-blue dark:focus:ring-blue-500 text-sm leading-relaxed"
          />
        </div>

        <div className="flex justify-end space-x-3 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-uw-blue dark:bg-blue-600 rounded-md hover:bg-uw-blue-hover dark:hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
