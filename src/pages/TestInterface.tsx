import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  ChevronDown,
  Pause,
  Square,
  Strikethrough,
  CheckCircle,
  XCircle,
  Play,
  Edit2,
  Save,
  X,
  Columns,
  Bookmark,
  BookOpen,
  Highlighter,
  StickyNote,
  Settings as SettingsIcon,
  Zap,
  MessageSquare,
} from 'lucide-react';
import Calculator from '../components/Calculator';
import LabValues from '../components/LabValues';
import SettingsPanel from '../components/SettingsPanel';
import TestStatusBar from '../components/TestStatusBar';
import NotesModal from '../components/NotesModal';
import JoditEditor from 'jodit-react';
import parse from 'html-react-parser';

class ErrorBoundary extends Component<{ children: ReactNode; navigate: any }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; navigate: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TestInterface Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4 max-w-lg text-center">{this.state.error?.message}</p>
          <button
            onClick={() => this.props.navigate('/')}
            className="px-4 py-2 bg-uw-blue text-white rounded hover:bg-uw-blue-hover"
          >
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
  const { theme, settings, updateSettings } = useTheme();
  const navigate = useNavigate();

  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [highlighterActive, setHighlighterActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Question-level time tracking
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});

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

  // Local state for fast updates
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [crossedOut, setCrossedOut] = useState<Record<string, number[]>>({});
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Aggregate stats for percent-correct
  const [aggregateStats, setAggregateStats] = useState<Record<string, { correct: number; total: number }>>({});

  // Font sizes driven by settings
  const fontSizes = [
    { stem: 'text-sm', choice: 'text-xs', exp: 'prose-sm' },
    { stem: 'text-base', choice: 'text-sm', exp: 'prose-base' },
    { stem: 'text-lg', choice: 'text-base', exp: 'prose-lg' },
    { stem: 'text-xl', choice: 'text-lg', exp: 'prose-xl' },
    { stem: 'text-2xl', choice: 'text-xl', exp: 'prose-2xl' },
  ];
  const currentFontSize = fontSizes[settings.fontSizeIndex] || fontSizes[1];

  // Reset editing state on navigation
  useEffect(() => {
    setIsEditingExplanation(false);
    setEditedExplanation('');
  }, [currentIndex]);

  // Inject highlighter color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--uw-highlight-color', settings.highlighterColor);
  }, [settings.highlighterColor]);

  const saveProgress = React.useCallback(
    async (updates: Partial<TestSession>) => {
      if (!id || !session) return;
      try {
        const docRef = doc(db, 'test_sessions', id);
        await updateDoc(docRef, updates);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    },
    [id, session]
  );

  const handleEndBlock = React.useCallback(
    async (force = false) => {
      if (!session) return;

      if (!force && !window.confirm('Are you sure you want to end this block?')) return;

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
        bookmarked,
        notes,
        time_spent: timeSpent,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        score,
      };

      setSession({ ...session, ...updates });
      setIsReviewMode(true);
      setCurrentIndex(0);

      await saveProgress(updates);
      
      // Navigate to results page
      navigate(`/test/results/${id}`);
    },
    [session, answers, marked, crossedOut, bookmarked, notes, timeSpent, saveProgress, navigate, id]
  );

  // Fetch session
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
          setBookmarked(data.bookmarked || []);
          setNotes(data.notes || {});
          setTimeSpent(data.time_spent || {});

          if (data.status === 'completed') {
            setIsReviewMode(true);
          } else {
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
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, user, navigate]);

  // Fetch aggregate stats (how all this user's sessions scored on these questions)
  useEffect(() => {
    if (!user || !session) return;
    const run = async () => {
      try {
        const q = query(
          collection(db, 'test_sessions'),
          where('user_id', '==', user.uid),
          where('status', '==', 'completed')
        );
        const snap = await getDocs(q);
        const map: Record<string, { correct: number; total: number }> = {};
        snap.docs.forEach(d => {
          const s = d.data() as TestSession;
          s.questions?.forEach(qq => {
            const ans = s.answers?.[qq.id];
            if (ans === undefined) return;
            if (!map[qq.id]) map[qq.id] = { correct: 0, total: 0 };
            map[qq.id].total++;
            if (ans === qq.correct_answer) map[qq.id].correct++;
          });
        });
        setAggregateStats(map);
      } catch (error) {
        console.warn('Could not fetch aggregate stats:', error);
      }
    };
    run();
  }, [user, session]);

  // Main block timer effect
  useEffect(() => {
    if (loading || isReviewMode || !session || session.status === 'completed' || session.mode === 'auto') return;

    if (timeRemaining <= 0) {
      handleEndBlock(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isReviewMode, session, timeRemaining, handleEndBlock]);

  // Per-question time tracker (increments current question by 1s each second while active)
  useEffect(() => {
    if (loading || isReviewMode || !session || session.status === 'completed') return;
    const q = session.questions[currentIndex];
    if (!q) return;
    const tick = setInterval(() => {
      setTimeSpent(prev => ({ ...prev, [q.id]: (prev[q.id] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(tick);
  }, [loading, isReviewMode, session, currentIndex]);

  // Auto mode timer effect
  useEffect(() => {
    if (loading || isReviewMode || !session || session.status === 'completed' || session.mode !== 'auto' || !isAutoPlaying)
      return;

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
      setAutoTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(autoTimer);
  }, [loading, isReviewMode, session, isAutoPlaying, autoState, currentIndex, autoQuestionTime, autoAnswerTime, autoTimeRemaining, handleEndBlock]);

  const handleAnswer = (choiceNum: number) => {
    if (!session || isReviewMode) return;

    const currentQ = session.questions[currentIndex];

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

  const toggleBookmark = () => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    const newBookmarked = bookmarked.includes(currentQ.id)
      ? bookmarked.filter(m => m !== currentQ.id)
      : [...bookmarked, currentQ.id];
    setBookmarked(newBookmarked);
    saveProgress({ bookmarked: newBookmarked });
  };

  const handleSaveNote = async (text: string) => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    const newNotes = { ...notes, [currentQ.id]: text };
    setNotes(newNotes);
    await saveProgress({ notes: newNotes });
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
    if (!session) return;
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
      try {
        const questionRef = doc(db, 'questions', currentQ.id);
        await updateDoc(questionRef, { explanation: editedExplanation });
      } catch (qError) {
        console.warn('Could not update global question (might lack permissions):', qError);
      }

      const updatedQuestions = [...session.questions];
      updatedQuestions[currentIndex] = { ...currentQ, explanation: editedExplanation };

      const sessionRef = doc(db, 'test_sessions', id);
      await updateDoc(sessionRef, { questions: updatedQuestions });

      setSession({ ...session, questions: updatedQuestions });
      setIsEditingExplanation(false);
    } catch (error) {
      console.error('Error saving explanation:', error);
      alert('Failed to save explanation');
    } finally {
      setIsSavingExplanation(false);
    }
  };

  const handleSuspend = async () => {
    await saveProgress({ answers, marked, crossed_out: crossedOut, bookmarked, notes, time_spent: timeSpent });
    navigate('/');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const applyHighlight = () => {
    if (!highlighterActive) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    try {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'uw-highlight';
      span.style.backgroundColor = settings.highlighterColor;
      range.surroundContents(span);
      sel.removeAllRanges();
    } catch {
      /* cross-node selection, ignore */
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-600 dark:text-slate-300">
        Loading...
      </div>
    );
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
      <div className="h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Question Not Found</h2>
        <p className="text-slate-700 dark:text-slate-300 mb-4">The requested question could not be loaded.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-uw-blue text-white rounded hover:bg-uw-blue-hover"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isAnswered = !!answers[currentQ.id];
  const showExplanation =
    isReviewMode || (session.mode === 'tutor' && isAnswered) || (session.mode === 'auto' && autoState === 'explanation');

  const isBookmarked = bookmarked.includes(currentQ.id);
  const hasNote = !!notes[currentQ.id];

  const answerStatus: 'correct' | 'incorrect' | 'omitted' =
    !isAnswered ? 'omitted' : answers[currentQ.id] === currentQ.correct_answer ? 'correct' : 'incorrect';

  const aggregate = aggregateStats[currentQ.id];
  const percentCorrect = aggregate && aggregate.total > 0 ? Math.round((aggregate.correct / aggregate.total) * 100) : undefined;

  // Use split screen if either settings toggle OR legacy isCardView state is on
  const useSplitScreen = settings.splitScreen && showExplanation;

  return (
    <div
      className={`h-screen overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200 ${
        theme === 'sepia' ? 'theme-sepia' : ''
      } ${theme === 'gray' ? 'theme-gray' : ''}`}
    >
      {/* ===== UWorld-style Top Toolbar (dark charcoal bar) ===== */}
      <div className="bg-[#2D3B45] flex items-center justify-between px-3 py-1.5 z-10">
        {/* Left toolbar icons */}
        <div className="flex items-center space-x-0.5">
          <ToolbarButton
            active={isBookmarked}
            onClick={toggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark size={22} fill={isBookmarked ? 'currentColor' : 'none'} />
          </ToolbarButton>

          <ToolbarButton
            active={marked.includes(currentQ.id)}
            onClick={toggleMark}
            title="Mark for review"
          >
            <div className="relative">
              <Zap size={22} fill={marked.includes(currentQ.id) ? 'currentColor' : 'none'} />
              <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-[#2D3B45] rounded-full px-0.5">
                {marked.length}
              </span>
            </div>
          </ToolbarButton>

          <ToolbarButton onClick={() => setShowLabs(true)} title="Lab Values">
            <FlaskConical size={22} />
          </ToolbarButton>

          <ToolbarButton
            active={highlighterActive}
            onClick={() => setHighlighterActive(h => !h)}
            title="Highlighter"
          >
            <Highlighter size={22} />
          </ToolbarButton>

          <ToolbarButton
            active={hasNote}
            onClick={() => setShowNotes(true)}
            title="Notes"
          >
            <StickyNote size={22} fill={hasNote ? 'currentColor' : 'none'} />
          </ToolbarButton>

          <ToolbarButton onClick={() => setShowCalc(true)} title="Calculator">
            <CalcIcon size={22} />
          </ToolbarButton>

          <ToolbarButton title="Question Notebook">
            <BookOpen size={22} />
          </ToolbarButton>
        </div>

        {/* Center: Question counter with chevron */}
        <div className="flex items-center space-x-1">
          <span className="text-base font-medium text-white tabular-nums">
            {currentIndex + 1}/{session.questions.length}
          </span>
          <ChevronDown size={16} className="text-white/70" />
        </div>

        {/* Right: Fullscreen, Help, Settings, Timer */}
        <div className="flex items-center space-x-0.5">
          <ToolbarButton
            onClick={() => updateSettings({ splitScreen: !settings.splitScreen })}
            active={settings.splitScreen}
            title="Split Screen"
          >
            <Columns size={22} />
          </ToolbarButton>

          <ToolbarButton onClick={() => setShowSettings(true)} title="Settings">
            <SettingsIcon size={22} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => navigate('/')}
            title="Exit"
          >
            <X size={22} />
          </ToolbarButton>

          {/* Timer (far right) */}
          {settings.showTimer && (
            <span className="ml-3 text-base font-mono font-medium text-white tabular-nums">
              {session.mode === 'auto' && !isReviewMode
                ? formatTime(autoTimeRemaining)
                : formatTime(timeRemaining)}
            </span>
          )}
        </div>
      </div>

      {/* ===== Main Content Area ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-6 sm:p-10 mx-auto w-full ${useSplitScreen ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className={useSplitScreen ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 h-full' : ''}>
            {/* Left Column: Question + Choices + Status Bar */}
            <div
              className={useSplitScreen ? 'overflow-y-auto pr-2 lg:pr-4' : ''}
              onMouseUp={applyHighlight}
            >
              {/* Question Stem */}
              <div
                className={`${currentFontSize.stem} text-slate-800 dark:text-slate-200 leading-relaxed mb-8 content-html ${
                  highlighterActive ? 'cursor-text' : ''
                }`}
              >
                {renderContent(currentQ.stem)}
              </div>

              {/* Choices */}
              <div className="space-y-3 mb-6">
                {[1, 2, 3, 4].map(num => {
                  const choiceText = currentQ[`choice_${num}` as keyof Question] as string;
                  if (!choiceText) return null;

                  const isCrossedOut = (crossedOut[currentQ.id] || []).includes(num);
                  const isSelected = answers[currentQ.id] === num;
                  const isCorrect = currentQ.correct_answer === num;

                  let choicePercent: number | undefined;
                  if (showExplanation && aggregate && aggregate.total > 0) {
                    if (isCorrect) choicePercent = percentCorrect;
                  }

                  let rowClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer';
                  let textClass = 'text-slate-800 dark:text-slate-200';
                  let leftIcon = null;

                  if (showExplanation) {
                    rowClass = 'cursor-default';
                    if (isCorrect) {
                      leftIcon = <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />;
                    } else if (isSelected) {
                      textClass = 'text-slate-800 dark:text-slate-200';
                    }
                  } else if (isSelected) {
                    rowClass = 'cursor-pointer';
                  }

                  if (isCrossedOut && !showExplanation) {
                    textClass += ' line-through text-slate-400 dark:text-slate-500';
                  }

                  return (
                    <div
                      key={num}
                      onClick={() => handleAnswer(num)}
                      className={`group flex items-center py-1.5 px-1 rounded transition-colors ${rowClass}`}
                    >
                      {/* Left: green check or spacer */}
                      <div className="w-7 flex-shrink-0 flex items-center justify-center">
                        {leftIcon}
                      </div>

                      {/* Radio circle */}
                      <div
                        className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                          isSelected && showExplanation && isCorrect
                            ? 'border-sky-500 bg-sky-500'
                            : isSelected
                            ? 'border-sky-500 bg-sky-500'
                            : 'border-slate-400 dark:border-slate-500'
                        }`}
                      >
                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                      </div>

                      {/* Letter */}
                      <span className="font-medium mr-2 text-slate-700 dark:text-slate-300 text-base">
                        {String.fromCharCode(64 + num)}.
                      </span>

                      {/* Choice text */}
                      <span className={`${currentFontSize.choice} ${textClass} content-html flex-1`}>
                        {renderContent(choiceText)}
                      </span>

                      {/* Percent in parentheses (shown in review) */}
                      {showExplanation && typeof choicePercent === 'number' && (
                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                          ({choicePercent}%)
                        </span>
                      )}

                      {/* Strikethrough button (only during test) */}
                      {!showExplanation && (
                        <button
                          onClick={e => toggleCrossOut(e, num)}
                          className={`ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isCrossedOut
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 opacity-100'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title="Cross out"
                        >
                          <Strikethrough size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Bar (only in review/tutor after answered) */}
              {showExplanation && (
                <TestStatusBar
                  status={answerStatus}
                  percentCorrect={percentCorrect}
                  timeSpent={timeSpent[currentQ.id] || 0}
                />
              )}

              {/* Explanation Tab (if not split screen) */}
              {showExplanation && !useSplitScreen && (
                <div className="mt-6">
                  <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                    <div className="inline-block px-4 py-2 text-sm font-semibold text-uw-blue dark:text-blue-400 border-b-2 border-uw-blue dark:border-blue-400">
                      Explanation
                    </div>
                  </div>
                  <ExplanationBlock
                    question={currentQ}
                    fontSize={currentFontSize}
                    isEditing={isEditingExplanation}
                    editedValue={editedExplanation}
                    setEditedValue={setEditedExplanation}
                    onStartEdit={() => {
                      setEditedExplanation(currentQ.explanation || '');
                      setIsEditingExplanation(true);
                    }}
                    onCancelEdit={() => setIsEditingExplanation(false)}
                    onSave={handleSaveExplanation}
                    isSaving={isSavingExplanation}
                    theme={theme}
                    renderContent={renderContent}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Explanation (split screen) */}
            {useSplitScreen && (
              <div className="overflow-y-auto pl-2 lg:pl-4 lg:border-l-2 border-slate-200 dark:border-slate-800">
                <ExplanationBlock
                  question={currentQ}
                  fontSize={currentFontSize}
                  isEditing={isEditingExplanation}
                  editedValue={editedExplanation}
                  setEditedValue={setEditedExplanation}
                  onStartEdit={() => {
                    setEditedExplanation(currentQ.explanation || '');
                    setIsEditingExplanation(true);
                  }}
                  onCancelEdit={() => setIsEditingExplanation(false)}
                  onSave={handleSaveExplanation}
                  isSaving={isSavingExplanation}
                  theme={theme}
                  renderContent={renderContent}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Bottom Navigation Bar ===== */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 py-2">
        {/* Left: End / Suspend */}
        <div className="flex items-center space-x-4">
          {!isReviewMode ? (
            <button
              onClick={() => handleEndBlock()}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="End Block"
            >
              End Block
            </button>
          ) : (
            <button
              onClick={() => navigate(`/test/results/${id}`)}
              className="text-sm font-medium text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover transition-colors"
              title="View Results"
            >
              View Results
            </button>
          )}

          {!isReviewMode && (
            <button
              onClick={handleSuspend}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Suspend"
            >
              Suspend
            </button>
          )}

          {session.mode === 'auto' && !isReviewMode && (
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title={isAutoPlaying ? 'Pause Auto' : 'Resume Auto'}
            >
              {isAutoPlaying ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>

        {/* Right: Previous + Next */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} className="mr-1" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === session.questions.length - 1}
            className="flex items-center px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={18} className="ml-1" />
          </button>
        </div>
      </div>

      {/* ===== Modals & Panels ===== */}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
      {showLabs && <LabValues onClose={() => setShowLabs(false)} />}
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
      <NotesModal
        open={showNotes}
        onClose={() => setShowNotes(false)}
        initialNote={notes[currentQ.id] || ''}
        onSave={handleSaveNote}
        questionNumber={currentIndex + 1}
      />
    </div>
  );
}

/* ----- Small helper: Toolbar Button ----- */
function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center justify-center w-10 h-10 rounded-md transition-colors ${
        active
          ? 'text-sky-400'
          : 'text-slate-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/* ----- Explanation Block (reused in both split and stacked layouts) ----- */
function ExplanationBlock({
  question,
  fontSize,
  isEditing,
  editedValue,
  setEditedValue,
  onStartEdit,
  onCancelEdit,
  onSave,
  isSaving,
  theme,
  renderContent,
}: {
  question: Question;
  fontSize: { stem: string; choice: string; exp: string };
  isEditing: boolean;
  editedValue: string;
  setEditedValue: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  theme: string;
  renderContent: (text: string | undefined) => React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-lg border border-slate-200 dark:border-slate-800 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Explanation</h3>
        {!isEditing ? (
          <button
            onClick={onStartEdit}
            className="flex items-center text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300"
          >
            <Edit2 size={14} className="mr-1" /> Edit
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancelEdit}
              className="flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <X size={14} className="mr-1" /> Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center text-sm text-white bg-uw-blue dark:bg-blue-600 hover:bg-uw-blue-hover dark:hover:bg-blue-700 px-3 py-1 rounded"
            >
              <Save size={14} className="mr-1" /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        {isEditing ? (
          <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <JoditEditor
              value={editedValue}
              config={{
                readonly: false,
                height: 400,
                uploader: { insertImageAsBase64URI: true },
                askBeforePasteHTML: false,
                askBeforePasteFromWord: false,
                defaultActionOnPaste: 'insert_as_html' as any,
                theme: theme === 'dark' ? 'dark' : 'default',
                toolbarAdaptive: false,
              }}
              onBlur={newContent => setEditedValue(newContent)}
              onChange={() => {}}
            />
          </div>
        ) : (
          <div
            className={`prose ${fontSize.exp} dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 prose-p:my-2 prose-img:my-2 prose-ul:my-2 prose-li:my-0 prose-headings:my-3 leading-relaxed content-html`}
          >
            {renderContent(question.explanation)}
          </div>
        )}
      </div>

      {/* Choice Explanations */}
      <div className={`space-y-3 mb-6 ${fontSize.choice}`}>
        {[1, 2, 3, 4].map(num => {
          const choiceExp = question[`choice_${num}_explanation` as keyof Question] as string;
          if (!choiceExp) return null;

          const isCorrect = question.correct_answer === num;

          return (
            <div key={num} className="flex items-start">
              <span
                className={`font-bold mr-2 flex-shrink-0 ${
                  isCorrect ? 'text-uw-green dark:text-green-400' : 'text-uw-red dark:text-red-400'
                }`}
              >
                Choice {String.fromCharCode(64 + num)}:
              </span>
              <span className="text-slate-700 dark:text-slate-300 content-html">{renderContent(choiceExp)}</span>
            </div>
          );
        })}
      </div>

      {question.educational_objective && (
        <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
            Educational Objective
          </h4>
          <div className="text-slate-700 dark:text-slate-300 font-medium content-html leading-relaxed">
            {renderContent(question.educational_objective)}
          </div>
        </div>
      )}
    </div>
  );
}
