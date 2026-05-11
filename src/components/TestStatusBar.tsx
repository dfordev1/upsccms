import React from 'react';
import { BarChart3, Clock } from 'lucide-react';

interface Props {
  status: 'correct' | 'incorrect' | 'omitted';
  percentCorrect?: number; // 0-100, aggregate across users
  timeSpent?: number; // seconds on this question
}

export default function TestStatusBar({ status, percentCorrect, timeSpent }: Props) {
  const config = {
    correct: {
      label: 'Correct',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-l-[5px] border-green-600 dark:border-green-500',
      bg: 'bg-white dark:bg-slate-900',
    },
    incorrect: {
      label: 'Incorrect',
      textColor: 'text-red-500 dark:text-red-400',
      borderColor: 'border-l-[5px] border-red-500 dark:border-red-500',
      bg: 'bg-white dark:bg-slate-900',
    },
    omitted: {
      label: 'Omitted',
      textColor: 'text-slate-500 dark:text-slate-400',
      borderColor: 'border-l-[5px] border-slate-400 dark:border-slate-500',
      bg: 'bg-white dark:bg-slate-900',
    },
  }[status];

  const formatTime = (s?: number) => {
    if (!s || s < 0) return '00 secs';
    if (s < 60) return `${String(s).padStart(2, '0')} secs`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${String(rem).padStart(2, '0')}s`;
  };

  return (
    <div className={`flex items-center px-6 py-4 ${config.bg} ${config.borderColor} border border-slate-200 dark:border-slate-700 rounded-sm shadow-sm`}>
      <span className={`text-lg font-semibold ${config.textColor} mr-auto`}>{config.label}</span>

      <div className="flex items-center space-x-10 text-slate-600 dark:text-slate-300">
        {typeof percentCorrect === 'number' && (
          <div className="flex items-center space-x-2.5">
            <BarChart3 size={20} className="text-slate-400 dark:text-slate-500" />
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{percentCorrect}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Answered correctly</div>
            </div>
          </div>
        )}

        {typeof timeSpent === 'number' && (
          <div className="flex items-center space-x-2.5">
            <Clock size={20} className="text-slate-400 dark:text-slate-500" />
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{formatTime(timeSpent)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Time Spent</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
