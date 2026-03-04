import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question } from '../types';
import { BrainCircuit, Play, Settings, CheckCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react';

export default function PracticeMode() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  
  // Quiz State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    subject: '',
    system: '',
    difficulty: '',
    count: 10
  });

  // Options
  const [subjects, setSubjects] = useState<string[]>([]);
  const [systems, setSystems] = useState<string[]>([]);

  useEffect(() => {
    fetchOptions();
  }, [user]);

  const fetchOptions = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'questions'), where('user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => doc.data() as Question);
      
      if (data.length > 0) {
        setSubjects(Array.from(new Set(data.map(q => q.subject).filter(Boolean))));
        setSystems(Array.from(new Set(data.map(q => q.system).filter(Boolean))));
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const startPractice = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let q = query(collection(db, 'questions'), where('user_id', '==', user.uid));

      if (config.subject) q = query(q, where('subject', '==', config.subject));
      if (config.system) q = query(q, where('system', '==', config.system));
      if (config.difficulty) q = query(q, where('difficulty', '==', config.difficulty));

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));

      if (data && data.length > 0) {
        // Shuffle and take requested count
        const shuffled = data.sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, config.count));
        setIsConfiguring(false);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setShowExplanation(false);
        setIsFinished(false);
      } else {
        alert('No questions found matching these criteria.');
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('Failed to start practice session');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (choiceNum: number) => {
    if (showExplanation || isFinished) return;
    
    const currentQ = questions[currentIndex];
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: choiceNum
    });
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  const resetPractice = () => {
    setIsConfiguring(true);
    setQuestions([]);
  };

  if (isConfiguring) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
            <BrainCircuit className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Practice Mode</h1>
          <p className="mt-2 text-lg text-slate-600">
            Configure your practice session to focus on specific areas.
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center mb-6">
              <Settings className="h-5 w-5 text-slate-400 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">Session Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
                  <select
                    id="subject"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    value={config.subject}
                    onChange={(e) => setConfig({...config, subject: e.target.value})}
                  >
                    <option value="">Any Subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="system" className="block text-sm font-medium text-slate-700">System</label>
                  <select
                    id="system"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    value={config.system}
                    onChange={(e) => setConfig({...config, system: e.target.value})}
                  >
                    <option value="">Any System</option>
                    {systems.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700">Difficulty</label>
                  <select
                    id="difficulty"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    value={config.difficulty}
                    onChange={(e) => setConfig({...config, difficulty: e.target.value})}
                  >
                    <option value="">Any Difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="count" className="block text-sm font-medium text-slate-700">Number of Questions</label>
                  <select
                    id="count"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    value={config.count}
                    onChange={(e) => setConfig({...config, count: parseInt(e.target.value)})}
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={50}>50 Questions</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <button
                  onClick={startPractice}
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    loading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Loading...' : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Start Session
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const correctCount = questions.filter(q => selectedAnswers[q.id] === q.correct_answer).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-indigo-100 mb-6">
          <span className="text-3xl font-bold text-indigo-600">{percentage}%</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Practice Complete!</h2>
        <p className="text-lg text-slate-600 mb-8">
          You scored {correctCount} out of {questions.length} correctly.
        </p>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={resetPractice}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            New Session
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isAnswered = showExplanation;
  const selectedChoice = selectedAnswers[currentQ.id];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(((currentIndex) / questions.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
        {/* Question Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {currentQ.subject}
          </span>
          {currentQ.system && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {currentQ.system}
            </span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            currentQ.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
            currentQ.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {currentQ.difficulty}
          </span>
        </div>

        {/* Question Stem */}
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-medium text-slate-900 leading-relaxed mb-8">
            {currentQ.stem}
          </h3>

          {/* Choices */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((num) => {
              const choiceText = currentQ[`choice_${num}` as keyof Question] as string;
              if (!choiceText) return null;

              const isCorrect = currentQ.correct_answer === num;
              const isSelected = selectedChoice === num;
              
              let choiceClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer";
              let icon = null;

              if (isAnswered) {
                choiceClass = "cursor-default ";
                if (isCorrect) {
                  choiceClass += "bg-green-50 border-green-500 ring-1 ring-green-500";
                  icon = <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />;
                } else if (isSelected) {
                  choiceClass += "bg-red-50 border-red-500 ring-1 ring-red-500";
                  icon = <XCircle className="h-5 w-5 text-red-500 ml-auto" />;
                } else {
                  choiceClass += "opacity-50 border-slate-200";
                }
              }

              return (
                <div
                  key={num}
                  onClick={() => handleAnswer(num)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center ${choiceClass}`}
                >
                  <span className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mr-4 ${
                    isAnswered && isCorrect ? 'bg-green-500 text-white' :
                    isAnswered && isSelected ? 'bg-red-500 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {String.fromCharCode(64 + num)}
                  </span>
                  <span className={`text-base ${isAnswered && isCorrect ? 'font-medium text-green-900' : isAnswered && isSelected ? 'font-medium text-red-900' : 'text-slate-700'}`}>
                    {choiceText}
                  </span>
                  {icon}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation Section */}
        {showExplanation && (
          <div className="bg-slate-50 border-t border-slate-200 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center mb-4">
              {selectedChoice === currentQ.correct_answer ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="mr-2 h-4 w-4" /> Correct
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <XCircle className="mr-2 h-4 w-4" /> Incorrect
                </span>
              )}
            </div>

            <div className="prose prose-sm sm:prose-base max-w-none text-slate-700">
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Explanation</h4>
              <p className="whitespace-pre-wrap leading-relaxed">{currentQ.explanation}</p>
              
              {currentQ.educational_objective && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Educational Objective</h4>
                  <p className="text-slate-800 font-medium">{currentQ.educational_objective}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextQuestion}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Practice'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
