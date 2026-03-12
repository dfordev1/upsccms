import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
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
  Check,
  Play,
  Edit2,
  Save,
  X,
  Moon,
  Sun,
  Columns
} from 'lucide-react';
import Calculator from '../components/Calculator';
import LabValues from '../components/LabValues';
import JoditEditor from 'jodit-react';
import parse from 'html-react-parser';

class ErrorBoundary extends Component<{children: ReactNode, navigate: any}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode, navigate: any}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TestInterface Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h2>
          <p className="text-slate-700 mb-4 max-w-lg text-center">{this.state.error?.message}</p>
          <button onClick={() => this.props.navigate('/')} className="px-4 py-2 bg-uw-blue text-white rounded hover:bg-uw-blue-hover">
            Return to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function TestInterfaceWrapper() {
  const navigate = useNavigate();
  return (
    <ErrorBoundary navigate={navigate}>
      <TestInterface />
    </ErrorBoundary>
  );
}

function TestInterface() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false); // True when block is ended or viewing explanation in tutor mode
  
  // Auto mode state
  const [autoState, setAutoState] = useState<'question' | 'explanation'>('question');
  const [autoTimeRemaining, setAutoTimeRemaining] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoQuestionTime, setAutoQuestionTime] = useState(10);
  const [autoAnswerTime, setAutoAnswerTime] = useState(15);

  // Edit Explanation State
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState('');
  const [isSavingExplanation, setIsSavingExplanation] = useState(false);

  // View State
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [isCardView, setIsCardView] = useState(false);

  const fontSizes = [
    { stem: 'text-base', choice: 'text-sm', exp: 'prose-sm' },
    { stem: 'text-lg', choice: 'text-base', exp: 'prose-base' }, // default
    { stem: 'text-xl', choice: 'text-lg', exp: 'prose-lg' },
    { stem: 'text-2xl', choice: 'text-xl', exp: 'prose-xl' },
    { stem: 'text-3xl', choice: 'text-2xl', exp: 'prose-2xl' },
  ];
  const currentFontSize = fontSizes[fontSizeIndex];

  // Local state for fast updates (synced to Firestore periodically or on unmount)
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [crossedOut, setCrossedOut] = useState<Record<string, number[]>>({});

  // Reset editing state on navigation
  useEffect(() => {
    setIsEditingExplanation(false);
    setEditedExplanation('');
  }, [currentIndex]);

  const saveProgress = React.useCallback(async (updates: Partial<TestSession>) => {
    if (!id || !session) return;
    try {
      const docRef = doc(db, 'test_sessions', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }, [id, session]);

  const handleEndBlock = React.useCallback(async (force = false) => {
    if (!session) return;
    
    if (!force && !window.confirm("Are you sure you want to end this block?")) return;
    
    let correctCount = 0;
    session.questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });
    
    const totalQuestions = session.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    const updates = { 
      answers, 
      marked, 
      crossed_out: crossedOut,
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
      score
    };

    setSession({ ...session, ...updates });
    setIsReviewMode(true);
    setCurrentIndex(0);
    
    await saveProgress(updates);
  }, [session, answers, marked, crossedOut, saveProgress]);

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
            
            if (data.mode === 'auto') {
              setAutoQuestionTime(data.auto_question_time || 10);
              setAutoAnswerTime(data.auto_answer_time || 15);
              setAutoTimeRemaining(data.auto_question_time || 10);
            }
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
    if (loading || isReviewMode || !session || session.status === 'completed' || session.mode === 'auto') return;
    
    if (timeRemaining <= 0) {
      handleEndBlock(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, isReviewMode, session, timeRemaining, handleEndBlock]);

  // Auto mode timer effect
  useEffect(() => {
    if (loading || isReviewMode || !session || session.status === 'completed' || session.mode !== 'auto' || !isAutoPlaying) return;

    if (autoTimeRemaining <= 0) {
      if (autoState === 'question') {
        setAutoState('explanation');
        setAutoTimeRemaining(autoAnswerTime);
      } else {
        if (currentIndex < session.questions.length - 1) {
          setCurrentIndex(c => c + 1);
          setAutoState('question');
          setAutoTimeRemaining(autoQuestionTime);
        } else {
          handleEndBlock(true);
        }
      }
      return;
    }

    const autoTimer = setInterval(() => {
      setAutoTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(autoTimer);
  }, [loading, isReviewMode, session, isAutoPlaying, autoState, currentIndex, autoQuestionTime, autoAnswerTime, autoTimeRemaining, handleEndBlock]);

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
      if (session.mode === 'auto') {
        setAutoState('question');
        setAutoTimeRemaining(autoQuestionTime);
      }
      setIsEditingExplanation(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (session.mode === 'auto') {
        setAutoState('question');
        setAutoTimeRemaining(autoQuestionTime);
      }
      setIsEditingExplanation(false);
    }
  };

  const handleSaveExplanation = async () => {
    if (!session || !id) return;
    const currentQ = session.questions[currentIndex];
    setIsSavingExplanation(true);
    try {
      // Try to update in questions collection (might fail if user lacks permissions)
      try {
        const questionRef = doc(db, 'questions', currentQ.id);
        await updateDoc(questionRef, { explanation: editedExplanation });
      } catch (qError) {
        console.warn("Could not update global question (might lack permissions):", qError);
      }
      
      // Update in current session
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentIndex] = { ...currentQ, explanation: editedExplanation };
      
      const sessionRef = doc(db, 'test_sessions', id);
      await updateDoc(sessionRef, { questions: updatedQuestions });
      
      setSession({ ...session, questions: updatedQuestions });
      setIsEditingExplanation(false);
    } catch (error) {
      console.error("Error saving explanation:", error);
      alert("Failed to save explanation");
    } finally {
      setIsSavingExplanation(false);
    }
  };

  const handleSuspend = async () => {
    await saveProgress({ answers, marked, crossed_out: crossedOut });
    navigate('/');
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
  
  const renderContent = (text: string | undefined) => {
    if (!text) return null;
    const isHtml = /<[a-z][\s\S]*>/i.test(text);
    if (isHtml) {
      return <div className="html-content-wrapper">{parse(text)}</div>;
    }
    return <div className="whitespace-pre-wrap">{text}</div>;
  };

  if (!currentQ) {
    return (
      <div className="h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Question Not Found</h2>
        <p className="text-slate-700 mb-4">The requested question could not be loaded.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-uw-blue text-white rounded hover:bg-uw-blue-hover">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isAnswered = !!answers[currentQ.id];
  const showExplanation = isReviewMode || (session.mode === 'tutor' && isAnswered) || (session.mode === 'auto' && autoState === 'explanation');

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <div className="bg-uw-blue dark:bg-slate-900 text-white flex items-center justify-between px-4 py-2 shadow-md z-10 border-b border-transparent dark:border-slate-800">
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
            {session.mode === 'tutor' ? 'Tutor Mode' : session.mode === 'auto' ? 'Auto Solver' : 'Timed Mode'}
          </span>
          <span className="text-lg font-mono font-bold">
            {session.mode === 'auto' && !isReviewMode ? (
              <>
                {autoState === 'question' ? 'Question Time: ' : 'Explanation Time: '}
                {formatTime(autoTimeRemaining)}
              </>
            ) : (
              <>Block Time Remaining: {formatTime(timeRemaining)}</>
            )}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center bg-blue-800 dark:bg-slate-800 rounded-md overflow-hidden mr-2">
            <button onClick={() => setFontSizeIndex(Math.max(0, fontSizeIndex - 1))} className="px-2 py-1 hover:bg-blue-700 dark:hover:bg-slate-700 text-white font-bold text-sm">-</button>
            <span className="px-2 py-1 text-xs font-medium text-blue-100 dark:text-slate-300">aA</span>
            <button onClick={() => setFontSizeIndex(Math.min(4, fontSizeIndex + 1))} className="px-2 py-1 hover:bg-blue-700 dark:hover:bg-slate-700 text-white font-bold text-sm">+</button>
          </div>
          
          <button onClick={() => setIsCardView(!isCardView)} className={`hidden md:flex items-center space-x-1 text-sm font-medium mr-2 ${isCardView ? 'text-uw-amber' : 'hover:text-blue-200'}`}>
            <Columns size={18} />
            <span className="hidden lg:inline">Card View</span>
          </button>

          <button onClick={toggleTheme} className="flex items-center space-x-1 hover:text-blue-200 text-sm font-medium mr-2">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Day' : 'Night'}</span>
          </button>
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
        <div className={`flex-1 overflow-y-auto p-6 sm:p-10 mx-auto w-full ${isCardView ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className={isCardView && showExplanation ? "grid grid-cols-1 lg:grid-cols-2 gap-8 h-full" : ""}>
            
            {/* Left Column (Question + Choices) */}
            <div className={isCardView && showExplanation ? "overflow-y-auto pr-2 lg:pr-4" : ""}>
              {/* Question Stem */}
              <div className={`${currentFontSize.stem} text-uw-navy dark:text-slate-200 leading-relaxed mb-8 content-html`}>
                {renderContent(currentQ.stem)}
              </div>

              {/* Choices */}
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((num) => {
                  const choiceText = currentQ[`choice_${num}` as keyof Question] as string;
                  if (!choiceText) return null;

                  const isCrossedOut = (crossedOut[currentQ.id] || []).includes(num);
                  const isSelected = answers[currentQ.id] === num;
                  const isCorrect = currentQ.correct_answer === num;
                  
                  let choiceClass = "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer";
                  let textClass = "text-slate-800 dark:text-slate-300";
                  let icon = null;

                  if (showExplanation) {
                    choiceClass = "cursor-default";
                    if (isCorrect) {
                      choiceClass = "bg-uw-green-bg dark:bg-green-900/30 border-uw-green dark:border-green-600";
                      textClass = "text-uw-green dark:text-green-400 font-medium";
                      icon = <CheckCircle className="h-5 w-5 text-uw-green dark:text-green-400 ml-auto" />;
                    } else if (isSelected && session.mode !== 'auto') {
                      choiceClass = "bg-uw-red-bg dark:bg-red-900/30 border-uw-red dark:border-red-600";
                      textClass = "text-uw-red dark:text-red-400 font-medium";
                      icon = <XCircle className="h-5 w-5 text-uw-red dark:text-red-400 ml-auto" />;
                    }
                  } else if (isSelected) {
                    choiceClass = "bg-blue-50 dark:bg-blue-900/30 border-uw-blue dark:border-blue-500";
                  }

                  if (isCrossedOut && !showExplanation) {
                    textClass += " line-through text-slate-400 dark:text-slate-500";
                  }

                  return (
                    <div
                      key={num}
                      onClick={() => handleAnswer(num)}
                      className={`group relative flex items-center p-3 rounded border-2 transition-colors ${choiceClass}`}
                    >
                      <div className="flex items-center flex-1">
                        <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-4 ${
                          isSelected ? 'border-uw-blue bg-uw-blue dark:border-blue-500 dark:bg-blue-500' : 'border-slate-400 dark:border-slate-600'
                        }`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white dark:bg-slate-900" />}
                        </div>
                        <span className="font-bold mr-3 text-slate-700 dark:text-slate-400">{String.fromCharCode(64 + num)}.</span>
                        <span className={`${currentFontSize.choice} ${textClass} content-html`}>{renderContent(choiceText)}</span>
                      </div>
                      
                      {icon}

                      {/* Strikethrough Button */}
                      {!showExplanation && (
                        <button
                          onClick={(e) => toggleCrossOut(e, num)}
                          className={`ml-4 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isCrossedOut ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 opacity-100' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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
            </div>

            {/* Right Column (Explanation) */}
            {showExplanation && (
              <div className={isCardView ? "overflow-y-auto pl-2 lg:pl-4 lg:border-l-2 border-slate-200 dark:border-slate-800" : ""}>
                <div className={`${isCardView ? 'mt-0' : 'mt-8 border-t-2 border-slate-200 dark:border-slate-800 pt-8'} animate-in fade-in duration-500 bg-uw-gray dark:bg-slate-900 p-6 rounded-lg`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-uw-navy dark:text-slate-100">Explanation</h3>
                    {!isEditingExplanation ? (
                      <button 
                        onClick={() => {
                          setEditedExplanation(currentQ.explanation || '');
                          setIsEditingExplanation(true);
                        }}
                        className="flex items-center text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300"
                      >
                        <Edit2 size={16} className="mr-1" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setIsEditingExplanation(false)}
                          className="flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <X size={16} className="mr-1" /> Cancel
                        </button>
                        <button 
                          onClick={handleSaveExplanation}
                          disabled={isSavingExplanation}
                          className="flex items-center text-sm text-white bg-uw-blue dark:bg-blue-600 hover:bg-uw-blue-hover dark:hover:bg-blue-700 px-3 py-1 rounded"
                        >
                          <Save size={16} className="mr-1" /> {isSavingExplanation ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-8">
                    {isEditingExplanation ? (
                      <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                        <JoditEditor 
                          value={editedExplanation} 
                          config={{
                            readonly: false,
                            height: 400,
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
                          }}
                          onBlur={newContent => setEditedExplanation(newContent)}
                          onChange={() => {}}
                        />
                      </div>
                    ) : (
                      <div className={`prose ${currentFontSize.exp} dark:prose-invert max-w-none text-uw-navy dark:text-slate-300 prose-p:my-2 prose-img:my-2 prose-ul:my-2 prose-li:my-0 prose-headings:my-3 leading-relaxed content-html`}>
                        {renderContent(currentQ.explanation)}
                      </div>
                    )}
                  </div>

                  {/* Choice Explanations */}
                  <div className={`space-y-4 mb-8 ${currentFontSize.choice}`}>
                    {[1, 2, 3, 4].map((num) => {
                      const choiceExp = currentQ[`choice_${num}_explanation` as keyof Question] as string;
                      if (!choiceExp) return null;
                      
                      const isCorrect = currentQ.correct_answer === num;
                      
                      return (
                        <div key={num} className="flex items-start">
                          <span className={`font-bold mr-2 ${isCorrect ? 'text-uw-green dark:text-green-400' : 'text-uw-red dark:text-red-400'}`}>
                            Choice {String.fromCharCode(64 + num)}:
                          </span>
                          <span className="text-uw-navy dark:text-slate-300 content-html">{renderContent(choiceExp)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Educational Objective */}
                  {currentQ.educational_objective && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-5 shadow-sm">
                      <h4 className="text-sm font-bold text-uw-navy dark:text-slate-200 uppercase tracking-wider mb-2">Educational Objective</h4>
                      <div className="text-uw-navy dark:text-slate-300 font-medium content-html leading-relaxed">{renderContent(currentQ.educational_objective)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Grid */}
      <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={handleSuspend} className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700">
            <Pause size={16} className="mr-2" /> Suspend
          </button>
          {session.mode === 'auto' && !isReviewMode && (
            <button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)} 
              className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded ${isAutoPlaying ? 'bg-uw-amber hover:bg-yellow-600' : 'bg-uw-green hover:bg-green-700'}`}
            >
              {isAutoPlaying ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
              {isAutoPlaying ? 'Pause Auto' : 'Resume Auto'}
            </button>
          )}
          {session.mode === 'auto' && !isReviewMode && (
            <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700">
              <div className="flex items-center space-x-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Q Timer:</label>
                <input 
                  type="number" 
                  min="1" 
                  value={autoQuestionTime} 
                  onChange={(e) => setAutoQuestionTime(Math.max(1, parseInt(e.target.value) || 10))}
                  className="w-12 text-sm border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 focus:outline-none focus:border-uw-blue dark:bg-slate-700 dark:text-white"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">s</span>
              </div>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <div className="flex items-center space-x-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">A Timer:</label>
                <input 
                  type="number" 
                  min="1" 
                  value={autoAnswerTime} 
                  onChange={(e) => setAutoAnswerTime(Math.max(1, parseInt(e.target.value) || 15))}
                  className="w-12 text-sm border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 focus:outline-none focus:border-uw-blue dark:bg-slate-700 dark:text-white"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">s</span>
              </div>
            </div>
          )}
          {!isReviewMode && (
            <button onClick={() => handleEndBlock()} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700">
              <Square size={16} className="mr-2" /> End Block
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-x-auto mx-4 flex items-center space-x-1 py-1">
          {session.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAns = !!answers[q.id];
            const isMarked = marked.includes(q.id);
            
            let bgClass = "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300";
            if (isCurrent) bgClass = "bg-uw-blue dark:bg-blue-600 border-uw-blue dark:border-blue-600 text-white";
            else if (isReviewMode) {
              if (answers[q.id] === q.correct_answer) bgClass = "bg-uw-green-bg dark:bg-green-900/50 border-uw-green dark:border-green-600 text-uw-green dark:text-green-400";
              else if (isAns) bgClass = "bg-uw-red-bg dark:bg-red-900/50 border-uw-red dark:border-red-600 text-uw-red dark:text-red-400";
            } else if (isAns) {
              bgClass = "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-200";
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
