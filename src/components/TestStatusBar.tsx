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
      textColor: 'text-uw-green dark:text-green-400',
      borderColor: 'border-l-4 border-uw-green dark:border-green-500',
      bg: 'bg-green-50/50 dark:bg-green-900/10',
    },
    incorrect: {
      label: 'Incorrect',
      textColor: 'text-uw-red dark:text-red-400',
      borderColor: 'border-l-4 border-uw-red dark:border-red-500',
      bg: 'bg-red-50/50 dark:bg-red-900/10',
    },
    omitted: {
      label: 'Omitted',
      textColor: 'text-slate-500 dark:text-slate-400',
      borderColor: 'border-l-4 border-slate-400 dark:border-slate-500',
      bg: 'bg-slate-50 dark:bg-slate-800/40',
    },
  }[status];

  const formatTime = (s?: number) => {
    if (!s || s < 0) return '0 secs';
    if (s < 60) return `${String(s).padStart(2, '0')} secs`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  return (
    <div className={`flex items-center justify-between px-6 py-4 ${config.bg} ${config.borderColor} rounded-sm`}>
      <span className={`text-lg font-semibold ${config.textColor}`}>{config.label}</span>

      <div className="flex items-center space-x-8 text-slate-600 dark:text-slate-300">
        {typeof percentCorrect === 'number' && (
          <div className="flex items-center space-x-2">
            <BarChart3 size={18} className="text-slate-400 dark:text-slate-500" />
            <div className="text-sm">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{percentCorrect}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">Answered correctly</div>
            </div>
          </div>
        )}

        {typeof timeSpent === 'number' && (
          <div className="flex items-center space-x-2">
            <Clock size={18} className="text-slate-400 dark:text-slate-500" />
            <div className="text-sm">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{formatTime(timeSpent)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">Time Spent</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
