import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { X } from 'lucide-react';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Partial<Question>) => Promise<void>;
  initialData?: Question | null;
  title: string;
}

export default function QuestionModal({ isOpen, onClose, onSave, initialData, title }: QuestionModalProps) {
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
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-uw-navy" id="modal-title">
                {title}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Question Stem *</label>
                <textarea
                  name="stem"
                  required
                  rows={4}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                  value={formData.stem}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">System</label>
                  <input
                    type="text"
                    name="system"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.system}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Topic</label>
                  <input
                    type="text"
                    name="topic"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.topic}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Subtopic</label>
                  <input
                    type="text"
                    name="subtopic"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.subtopic}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Difficulty</label>
                  <select
                    name="difficulty"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.difficulty}
                    onChange={handleChange}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Exam Year</label>
                  <input
                    type="number"
                    name="exam_year"
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.exam_year}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h4 className="font-medium text-slate-900">Choices</h4>
                
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="p-4 border border-slate-200 rounded-md bg-slate-50">
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="correct_answer"
                        value={num}
                        checked={formData.correct_answer === num}
                        onChange={handleChange}
                        className="h-4 w-4 text-uw-blue focus:ring-uw-blue border-slate-300"
                      />
                      <label className="ml-2 block text-sm font-medium text-slate-700">
                        Choice {num} (Mark if correct)
                      </label>
                    </div>
                    <textarea
                      name={`choice_${num}`}
                      rows={2}
                      placeholder={`Choice ${num} text`}
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm mb-2"
                      value={formData[`choice_${num}` as keyof Question] as string || ''}
                      onChange={handleChange}
                    />
                    <textarea
                      name={`choice_${num}_explanation`}
                      rows={2}
                      placeholder={`Choice ${num} explanation (optional)`}
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                      value={formData[`choice_${num}_explanation` as keyof Question] as string || ''}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Overall Explanation *</label>
                  <textarea
                    name="explanation"
                    required
                    rows={4}
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.explanation}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Educational Objective *</label>
                  <textarea
                    name="educational_objective"
                    required
                    rows={3}
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-uw-blue focus:border-uw-blue sm:text-sm"
                    value={formData.educational_objective}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </form>
          </div>
          <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-uw-blue text-base font-medium text-white hover:bg-uw-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
