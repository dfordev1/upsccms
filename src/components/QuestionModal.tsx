import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { X } from 'lucide-react';
import JoditEditor from 'jodit-react';
import { useTheme } from '../lib/ThemeContext';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Partial<Question>) => Promise<void>;
  initialData?: Question | null;
  title: string;
}

export default function QuestionModal({ isOpen, onClose, onSave, initialData, title }: QuestionModalProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<Partial<Question>>({
    stem: '',
    subject: '',
    system: '',
    topic: '',
    subtopic: '',
    difficulty: 'medium',
    exam_year: new Date().getFullYear(),
    paper_number: '',
    question_number: 1,
    choice_1: '',
    choice_2: '',
    choice_3: '',
    choice_4: '',
    correct_answer: 1,
    choice_1_explanation: '',
    choice_2_explanation: '',
    choice_3_explanation: '',
    choice_4_explanation: '',
    explanation: '',
    educational_objective: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        stem: '',
        subject: '',
        system: '',
        topic: '',
        subtopic: '',
        difficulty: 'medium',
        exam_year: new Date().getFullYear(),
        paper_number: '',
        question_number: 1,
        choice_1: '',
        choice_2: '',
        choice_3: '',
        choice_4: '',
        correct_answer: 1,
        choice_1_explanation: '',
        choice_2_explanation: '',
        choice_3_explanation: '',
        choice_4_explanation: '',
        explanation: '',
        educational_objective: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'exam_year' || name === 'question_number' || name === 'correct_answer' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleEditorChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const editorConfig = {
    readonly: false,
    height: 250,
    uploader: {
      insertImageAsBase64URI: true
    },
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_as_html' as any,
    theme: theme === 'dark' ? 'dark' : 'default',
    toolbarAdaptive: false,
    buttons: [
      'source', '|',
      'bold', 'strikethrough', 'underline', 'italic', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'image', 'video', 'table', 'link', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'symbol', 'fullsize', 'print', 'about'
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-slate-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-slate-200 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-uw-navy dark:text-slate-100" id="modal-title">
                {title}
              </h3>
              <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Stem *</label>
                <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <JoditEditor
                    value={formData.stem || ''}
                    config={editorConfig}
                    onBlur={(newContent) => handleEditorChange('stem', newContent)}
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">System</label>
                  <input
                    type="text"
                    name="system"
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.system}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Topic</label>
                  <input
                    type="text"
                    name="topic"
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.topic}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subtopic</label>
                  <input
                    type="text"
                    name="subtopic"
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.subtopic}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Difficulty</label>
                  <select
                    name="difficulty"
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.difficulty}
                    onChange={handleChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Exam Year</label>
                  <input
                    type="number"
                    name="exam_year"
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    value={formData.exam_year}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Choices</h4>
                
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="correct_answer"
                        value={num}
                        checked={formData.correct_answer === num}
                        onChange={handleChange}
                        className="h-4 w-4 text-uw-blue dark:text-blue-500 focus:ring-uw-blue dark:focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                      />
                      <label className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Choice {num} (Mark if correct)
                      </label>
                    </div>
                    <div className="mb-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      <JoditEditor
                        value={formData[`choice_${num}` as keyof Question] as string || ''}
                        config={{...editorConfig, height: 150, placeholder: `Choice ${num} text`}}
                        onBlur={(newContent) => handleEditorChange(`choice_${num}`, newContent)}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      <JoditEditor
                        value={formData[`choice_${num}_explanation` as keyof Question] as string || ''}
                        config={{...editorConfig, height: 150, placeholder: `Choice ${num} explanation (optional)`}}
                        onBlur={(newContent) => handleEditorChange(`choice_${num}_explanation`, newContent)}
                        onChange={() => {}}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Overall Explanation *</label>
                  <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <JoditEditor
                      value={formData.explanation || ''}
                      config={editorConfig}
                      onBlur={(newContent) => handleEditorChange('explanation', newContent)}
                      onChange={() => {}}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Educational Objective *</label>
                  <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <JoditEditor
                      value={formData.educational_objective || ''}
                      config={editorConfig}
                      onBlur={(newContent) => handleEditorChange('educational_objective', newContent)}
                      onChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-uw-blue text-base font-medium text-white hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue dark:focus:ring-offset-slate-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue dark:focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
