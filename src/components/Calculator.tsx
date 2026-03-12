import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(display === '0' ? num : display + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // Basic eval for a simple calculator
      const result = new Function('return ' + equation + display)();
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <div className="fixed top-20 left-20 z-50 bg-white shadow-2xl rounded-lg border border-slate-300 w-64 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.2)]">
      <div className="bg-slate-800 px-3 py-2 flex justify-between items-center cursor-move">
        <span className="text-white text-sm font-semibold">Calculator</span>
        <button onClick={onClose} className="text-slate-300 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="p-4 bg-slate-100">
        <div className="text-right text-xs text-slate-500 h-4 mb-1">{equation}</div>
        <div className="bg-white border border-slate-300 p-2 text-right text-xl font-mono mb-4 rounded overflow-hidden">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={clear} className="col-span-2 bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 font-semibold">C</button>
          <button onClick={() => handleOperator('/')} className="bg-slate-200 p-2 rounded hover:bg-slate-300 font-semibold">÷</button>
          <button onClick={() => handleOperator('*')} className="bg-slate-200 p-2 rounded hover:bg-slate-300 font-semibold">×</button>
          
          <button onClick={() => handleNumber('7')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">7</button>
          <button onClick={() => handleNumber('8')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">8</button>
          <button onClick={() => handleNumber('9')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">9</button>
          <button onClick={() => handleOperator('-')} className="bg-slate-200 p-2 rounded hover:bg-slate-300 font-semibold">-</button>
          
          <button onClick={() => handleNumber('4')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">4</button>
          <button onClick={() => handleNumber('5')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">5</button>
          <button onClick={() => handleNumber('6')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">6</button>
          <button onClick={() => handleOperator('+')} className="bg-slate-200 p-2 rounded hover:bg-slate-300 font-semibold">+</button>
          
          <button onClick={() => handleNumber('1')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">1</button>
          <button onClick={() => handleNumber('2')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">2</button>
          <button onClick={() => handleNumber('3')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">3</button>
          <button onClick={calculate} className="row-span-2 bg-uw-blue text-white p-2 rounded hover:bg-uw-blue-hover font-semibold">=</button>
          
          <button onClick={() => handleNumber('0')} className="col-span-2 bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">0</button>
          <button onClick={() => handleNumber('.')} className="bg-white border border-slate-200 p-2 rounded hover:bg-slate-50 font-semibold">.</button>
        </div>
      </div>
    </div>
  );
}
