import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession, Question } from '../types';
import { 
  Calculator as CalcIcon, 
  FlaskConical, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Square,
  Strikethrough,
  CheckCircle,
  XCircle,
  Check
} from 'lucide-react';
import Calculator from '../components/Calculator';
import LabValues from '../components/LabValues';

export default function TestInterface() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false); // True when block is ended or viewing explanation in tutor mode
  
  // Local state for fast updates (synced to Firestore periodically or on unmount)
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [crossedOut, setCrossedOut] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const fetchSession = async () => {
      if (!id || !user) return;
      try {
        const docRef = doc(db, 'test_sessions', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as TestSession;
          if (data.user_id !== user.uid) {
            navigate('/');
            return;
          }
          setSession(data);
          setAnswers(data.answers || {});
          setMarked(data.marked || []);
          setCrossedOut(data.crossed_out || {});
          
          if (data.status === 'completed') {
            setIsReviewMode(true);
          } else {
            // Set timer based on mode and total time (e.g. 1 min per question)
            const totalSeconds = data.questions.length * 60;
            setTimeRemaining(totalSeconds);
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();
  }, [id, user, navigate]);

  // Timer effect
  useEffect(() => {
    if (loading || isReviewMode || !session || session.status === 'completed') return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndBlock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, isReviewMode, session]);

  const saveProgress = async (updates: Partial<TestSession>) => {
    if (!id || !session) return;
    try {
      const docRef = doc(db, 'test_sessions', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleAnswer = (choiceNum: number) => {
    if (!session || isReviewMode) return;
    
    const currentQ = session.questions[currentIndex];
    
    // If tutor mode and already answered, don't allow change
    if (session.mode === 'tutor' && answers[currentQ.id]) return;

    const newAnswers = { ...answers, [currentQ.id]: choiceNum };
    setAnswers(newAnswers);
    saveProgress({ answers: newAnswers });
  };

  const toggleMark = () => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    const newMarked = marked.includes(currentQ.id) 
      ? marked.filter(m => m !== currentQ.id)
      : [...marked, currentQ.id];
      
    setMarked(newMarked);
    saveProgress({ marked: newMarked });
  };

  const toggleCrossOut = (e: React.MouseEvent, choiceNum: number) => {
    e.stopPropagation();
    if (!session || isReviewMode) return;
    
    const currentQ = session.questions[currentIndex];
    const currentCrossed = crossedOut[currentQ.id] || [];
    
    const newCrossed = currentCrossed.includes(choiceNum)
      ? currentCrossed.filter(c => c !== choiceNum)
      : [...currentCrossed, choiceNum];
      
    const newCrossedOut = { ...crossedOut, [currentQ.id]: newCrossed };
    setCrossedOut(newCrossedOut);
    saveProgress({ crossed_out: newCrossedOut });
  };

  const handleNext = () => {
    if (!session) return;
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSuspend = async () => {
    await saveProgress({ answers, marked, crossed_out: crossedOut });
    navigate('/');
  };

  const handleEndBlock = async () => {
    if (!session) return;
    
    if (!window.confirm("Are you sure you want to end this block?")) return;
    
    let correctCount = 0;
    session.questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });
    
    const score = Math.round((correctCount / session.questions.length) * 100);
    
    await saveProgress({ 
      answers, 
      marked, 
      crossed_out: crossedOut,
      status: 'completed',
      completed_at: new Date().toISOString(),
      score
    });
    
    setIsReviewMode(true);
    setCurrentIndex(0);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !session) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">Loading...</div>;
  }

  const currentQ = session.questions[currentIndex];
  const isAnswered = !!answers[currentQ.id];
  const showExplanation = isReviewMode || (session.mode === 'tutor' && isAnswered);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-uw-blue text-white flex items-center justify-between px-4 py-2 shadow-md z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowCalc(!showCalc)} className="flex items-center space-x-1 hover:text-blue-200 text-sm font-medium">
            <CalcIcon size={18} />
            <span className="hidden sm:inline">Calculator</span>
          </button>
          <button onClick={() => setShowLabs(!showLabs)} className="flex items-center space-x-1 hover:text-blue-200 text-sm font-medium">
            <FlaskConical size={18} />
            <span className="hidden sm:inline">Lab Values</span>
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">
            {session.mode === 'tutor' ? 'Tutor Mode' : 'Timed Mode'}
          </span>
          <span className="text-lg font-mono font-bold">
            Block Time Remaining: {formatTime(timeRemaining)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={toggleMark} className={`flex items-center space-x-1 text-sm font-medium ${marked.includes(currentQ.id) ? 'text-uw-amber' : 'hover:text-blue-200'}`}>
            <Flag size={18} fill={marked.includes(currentQ.id) ? "currentColor" : "none"} />
            <span className="hidden sm:inline">Mark</span>
          </button>
          <div className="flex space-x-1">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="p-1 hover:bg-uw-blue-hover rounded disabled:opacity-50">
              <ChevronLeft size={24} />
            </button>
            <span className="px-2 py-1 text-sm font-medium">
              Item: {currentIndex + 1} of {session.questions.length}
            </span>
            <button onClick={handleNext} disabled={currentIndex === session.questions.length - 1} className="p-1 hover:bg-uw-blue-hover rounded disabled:opacity-50">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-5xl mx-auto w-full">
          {/* Question Stem */}
          <div className="text-lg text-uw-navy leading-relaxed mb-8 whitespace-pre-wrap">
            {currentQ.stem}
          </div>

          {/* Choices */}
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4].map((num) => {
              const choiceText = currentQ[`choice_${num}` as keyof Question] as string;
              if (!choiceText) return null;

              const isCrossedOut = (crossedOut[currentQ.id] || []).includes(num);
              const isSelected = answers[currentQ.id] === num;
              const isCorrect = currentQ.correct_answer === num;
              
              let choiceClass = "border-transparent hover:bg-slate-50 cursor-pointer";
              let textClass = "text-slate-800";
              let icon = null;

              if (showExplanation) {
                choiceClass = "cursor-default";
                if (isCorrect) {
                  choiceClass = "bg-uw-green-bg border-uw-green";
                  textClass = "text-uw-green font-medium";
                  icon = <CheckCircle className="h-5 w-5 text-uw-green ml-auto" />;
                } else if (isSelected) {
                  choiceClass = "bg-uw-red-bg border-uw-red";
                  textClass = "text-uw-red font-medium";
                  icon = <XCircle className="h-5 w-5 text-uw-red ml-auto" />;
                }
              } else if (isSelected) {
                choiceClass = "bg-blue-50 border-uw-blue";
              }

              if (isCrossedOut && !showExplanation) {
                textClass += " line-through text-slate-400";
              }

              return (
                <div
                  key={num}
                  onClick={() => handleAnswer(num)}
                  className={`group relative flex items-center p-3 rounded border-2 transition-colors ${choiceClass}`}
                >
                  <div className="flex items-center flex-1">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-4 ${
                      isSelected ? 'border-uw-blue bg-uw-blue' : 'border-slate-400'
                    }`}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-bold mr-3 text-slate-700">{String.fromCharCode(64 + num)}.</span>
                    <span className={`text-base ${textClass}`}>{choiceText}</span>
                  </div>
                  
                  {icon}

                  {/* Strikethrough Button */}
                  {!showExplanation && (
                    <button
                      onClick={(e) => toggleCrossOut(e, num)}
                      className={`ml-4 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        isCrossedOut ? 'bg-slate-200 text-slate-700 opacity-100' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title="Cross out choice"
                    >
                      <Strikethrough size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation Section */}
          {showExplanation && (
            <div className="mt-8 border-t-2 border-slate-200 pt-8 animate-in fade-in duration-500 bg-uw-gray p-6 rounded-lg">
              <h3 className="text-xl font-bold text-uw-navy mb-4">Explanation</h3>
              
              <div className="prose max-w-none text-uw-navy mb-8">
                <p className="whitespace-pre-wrap leading-relaxed">{currentQ.explanation}</p>
              </div>

              {/* Choice Explanations */}
              <div className="space-y-4 mb-8">
                {[1, 2, 3, 4].map((num) => {
                  const choiceExp = currentQ[`choice_${num}_explanation` as keyof Question] as string;
                  if (!choiceExp) return null;
                  
                  const isCorrect = currentQ.correct_answer === num;
                  
                  return (
                    <div key={num} className="flex items-start">
                      <span className={`font-bold mr-2 ${isCorrect ? 'text-uw-green' : 'text-uw-red'}`}>
                        Choice {String.fromCharCode(64 + num)}:
                      </span>
                      <span className="text-uw-navy">{choiceExp}</span>
                    </div>
                  );
                })}
              </div>

              {/* Educational Objective */}
              {currentQ.educational_objective && (
                <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-uw-navy uppercase tracking-wider mb-2">Educational Objective</h4>
                  <p className="text-uw-navy font-medium">{currentQ.educational_objective}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Grid */}
      <div className="bg-slate-100 border-t border-slate-300 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={handleSuspend} className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">
            <Pause size={16} className="mr-2" /> Suspend
          </button>
          {!isReviewMode && (
            <button onClick={handleEndBlock} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700">
              <Square size={16} className="mr-2" /> End Block
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-x-auto mx-4 flex items-center space-x-1 py-1">
          {session.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAns = !!answers[q.id];
            const isMarked = marked.includes(q.id);
            
            let bgClass = "bg-white border-slate-300 text-slate-600";
            if (isCurrent) bgClass = "bg-uw-blue border-uw-blue text-white";
            else if (isReviewMode) {
              if (answers[q.id] === q.correct_answer) bgClass = "bg-uw-green-bg border-uw-green text-uw-green";
              else if (isAns) bgClass = "bg-uw-red-bg border-uw-red text-uw-red";
            } else if (isAns) {
              bgClass = "bg-slate-300 border-slate-400 text-slate-800";
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-medium border rounded-sm transition-colors ${bgClass}`}
              >
                {idx + 1}
                {isMarked && (
                  <div className="absolute -top-1 -right-1">
                    <Flag size={10} className={isCurrent ? "text-uw-amber" : "text-uw-amber"} fill="currentColor" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {isReviewMode && (
          <div className="flex items-center space-x-4 text-sm font-medium">
            <span className="text-slate-700">Score: <span className="text-uw-blue font-bold">{session.score}%</span></span>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-uw-blue text-white rounded hover:bg-uw-blue-hover">
              Exit Review
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
      {showLabs && <LabValues onClose={() => setShowLabs(false)} />}
    </div>
  );
}
