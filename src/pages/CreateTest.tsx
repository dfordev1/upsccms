import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question, TestSession } from '../types';
import { ChevronUp, ChevronDown, Plus, Info } from 'lucide-react';

type QuestionStatus = 'unused' | 'incorrect' | 'marked' | 'omitted' | 'correct';

export default function CreateTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);

  // Config state
  const [mode, setMode] = useState<'tutor' | 'timed'>('tutor');
  const [questionMode, setQuestionMode] = useState<'standard' | 'custom'>('standard');
  const [selectedStatuses, setSelectedStatuses] = useState<QuestionStatus[]>(['unused']);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [autoQuestionTime, setAutoQuestionTime] = useState(10);
  const [autoAnswerTime, setAutoAnswerTime] = useState(15);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    testMode: true,
    questionMode: true,
    subjects: true,
    systems: true,
    count: true,
  });

  // Stats from user sessions
  const [questionStats, setQuestionStats] = useState<{
    answered: Set<string>;
    correct: Set<string>;
    incorrect: Set<string>;
    marked: Set<string>;
    omitted: Set<string>;
  }>({ answered: new Set(), correct: new Set(), incorrect: new Set(), marked: new Set(), omitted: new Set() });

  // Fetch questions and stats
  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setFetchingQuestions(true);
      try {
        // Fetch all questions
        const qSnap = await getDocs(query(collection(db, 'questions')));
        const questions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        setAllQuestions(questions);

        // Fetch user sessions for status
        const sessSnap = await getDocs(query(collection(db, 'test_sessions'), where('user_id', '==', user.uid)));
        const sessions = sessSnap.docs.map(doc => doc.data() as TestSession);

        const answered = new Set<string>();
        const correct = new Set<string>();
        const incorrect = new Set<string>();
        const marked = new Set<string>();

        sessions.forEach(session => {
          session.marked?.forEach(id => marked.add(id));
          Object.entries(session.answers || {}).forEach(([qId, answer]) => {
            answered.add(qId);
            const question = session.questions?.find(q => q.id === qId);
            if (question) {
              if (question.correct_answer === answer) {
                correct.add(qId);
                incorrect.delete(qId);
              } else {
                incorrect.add(qId);
                correct.delete(qId);
              }
            }
          });
        });

        // Omitted = questions that appeared in a completed session but weren't answered
        const omitted = new Set<string>();
        sessions.filter(s => s.status === 'completed').forEach(session => {
          session.questions?.forEach(q => {
            if (!session.answers?.[q.id]) omitted.add(q.id);
          });
        });

        setQuestionStats({ answered, correct, incorrect, marked, omitted });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setFetchingQuestions(false);
      }
    };
    fetchAll();
  }, [user]);

  // Compute available subjects with counts
  const subjectData = useMemo(() => {
    const map: Record<string, number> = {};
    allQuestions.forEach(q => {
      if (q.subject) map[q.subject] = (map[q.subject] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allQuestions]);

  // Compute available systems with counts
  const systemData = useMemo(() => {
    const map: Record<string, number> = {};
    allQuestions.forEach(q => {
      if (q.system) map[q.system] = (map[q.system] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allQuestions]);

  // Status counts
  const statusCounts = useMemo(() => {
    const total = allQuestions.length;
    return {
      unused: allQuestions.filter(q => !questionStats.answered.has(q.id)).length,
      incorrect: questionStats.incorrect.size,
      marked: questionStats.marked.size,
      omitted: questionStats.omitted.size,
      correct: questionStats.correct.size,
    };
  }, [allQuestions, questionStats]);

  // Total available based on filters
  const totalAvailable = useMemo(() => {
    let filtered = [...allQuestions];

    // Apply status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(q => {
        return selectedStatuses.some(status => {
          if (status === 'unused') return !questionStats.answered.has(q.id);
          if (status === 'incorrect') return questionStats.incorrect.has(q.id);
          if (status === 'marked') return questionStats.marked.has(q.id);
          if (status === 'omitted') return questionStats.omitted.has(q.id);
          if (status === 'correct') return questionStats.correct.has(q.id);
          return false;
        });
      });
    }

    // Apply subject filter
    if (selectedSubjects.length > 0) {
      filtered = filtered.filter(q => selectedSubjects.includes(q.subject));
    }

    // Apply system filter
    if (selectedSystems.length > 0) {
      filtered = filtered.filter(q => selectedSystems.includes(q.system));
    }

    return filtered.length;
  }, [allQuestions, selectedStatuses, selectedSubjects, selectedSystems, questionStats]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleStatus = (status: QuestionStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleAllSubjects = () => {
    if (selectedSubjects.length === subjectData.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(subjectData.map(([name]) => name));
    }
  };

  const toggleSystem = (system: string) => {
    setSelectedSystems(prev =>
      prev.includes(system) ? prev.filter(s => s !== system) : [...prev, system]
    );
  };

  const toggleAllSystems = () => {
    if (selectedSystems.length === systemData.length) {
      setSelectedSystems([]);
    } else {
      setSelectedSystems(systemData.map(([name]) => name));
    }
  };

  const handleGenerateTest = async () => {
    if (!user || questionCount === 0) return;
    setLoading(true);

    try {
      let filtered = [...allQuestions];

      if (selectedStatuses.length > 0) {
        filtered = filtered.filter(q => {
          return selectedStatuses.some(status => {
            if (status === 'unused') return !questionStats.answered.has(q.id);
            if (status === 'incorrect') return questionStats.incorrect.has(q.id);
            if (status === 'marked') return questionStats.marked.has(q.id);
            if (status === 'omitted') return questionStats.omitted.has(q.id);
            if (status === 'correct') return questionStats.correct.has(q.id);
            return false;
          });
        });
      }

      if (selectedSubjects.length > 0) {
        filtered = filtered.filter(q => selectedSubjects.includes(q.subject));
      }

      if (selectedSystems.length > 0) {
        filtered = filtered.filter(q => selectedSystems.includes(q.system));
      }

      if (filtered.length === 0) {
        alert('No questions found matching these criteria.');
        setLoading(false);
        return;
      }

      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, Math.min(questionCount, filtered.length));

      const sessionData: Omit<TestSession, 'id'> = {
        user_id: user.uid,
        mode,
        status: 'in-progress',
        questions: selectedQuestions,
        answers: {},
        marked: [],
        crossed_out: {},
        time_spent: {},
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'test_sessions'), sessionData);
      navigate(`/test/${docRef.id}`);
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('Failed to start practice session');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingQuestions) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Title */}
      <h1 className="text-2xl font-normal text-slate-700 dark:text-slate-200 mb-6">Create Test</h1>

      {/* Test Mode Section */}
      <Section
        title="Test Mode"
        titleRight={<Info size={14} className="text-slate-400 ml-1.5" />}
        expanded={expandedSections.testMode}
        onToggle={() => toggleSection('testMode')}
      >
        <div className="flex items-center space-x-6 py-2">
          <ToggleSwitch
            label="Tutor"
            active={mode === 'tutor'}
            onChange={() => setMode('tutor')}
          />
          <ToggleSwitch
            label="Timed"
            active={mode === 'timed'}
            onChange={() => setMode('timed')}
          />
        </div>
      </Section>

      {/* Question Mode Section */}
      <Section
        title="Question Mode"
        titleRight={
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            Total Available <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 text-xs font-semibold ml-1">{totalAvailable}</span>
          </span>
        }
        expanded={expandedSections.questionMode}
        onToggle={() => toggleSection('questionMode')}
      >
        {/* Standard / Custom toggle */}
        <div className="flex mb-4">
          <button
            onClick={() => setQuestionMode('standard')}
            className={`px-5 py-1.5 text-sm font-medium border transition-colors ${
              questionMode === 'standard'
                ? 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            } rounded-l-md`}
          >
            Standard
          </button>
          <button
            onClick={() => setQuestionMode('custom')}
            className={`px-5 py-1.5 text-sm font-medium border-t border-b border-r transition-colors ${
              questionMode === 'custom'
                ? 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            } rounded-r-md`}
          >
            Custom
          </button>
        </div>

        {/* Status checkboxes */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {([
            { key: 'unused' as QuestionStatus, label: 'Unused' },
            { key: 'incorrect' as QuestionStatus, label: 'Incorrect' },
            { key: 'marked' as QuestionStatus, label: 'Marked' },
            { key: 'omitted' as QuestionStatus, label: 'Omitted' },
            { key: 'correct' as QuestionStatus, label: 'Correct' },
          ]).map(({ key, label }) => (
            <label key={key} className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(key)}
                onChange={() => toggleStatus(key)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 dark:bg-slate-700"
              />
              <span className="ml-2 text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                {label}
              </span>
              <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                {statusCounts[key]}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Subjects Section */}
      <Section
        title={
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedSubjects.length === subjectData.length && subjectData.length > 0}
              onChange={toggleAllSubjects}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 dark:bg-slate-700 mr-2.5"
            />
            <span>Subjects</span>
          </label>
        }
        expanded={expandedSections.subjects}
        onToggle={() => toggleSection('subjects')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5 pl-1">
          {subjectData.map(([name, count]) => (
            <label key={name} className="flex items-center cursor-pointer py-1 group">
              <input
                type="checkbox"
                checked={selectedSubjects.includes(name)}
                onChange={() => toggleSubject(name)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 dark:bg-slate-700"
              />
              <span className="ml-2.5 text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                {name}
              </span>
              <span className="ml-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {count}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Systems Section */}
      <Section
        title={
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedSystems.length === systemData.length && systemData.length > 0}
              onChange={toggleAllSystems}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 dark:bg-slate-700 mr-2.5"
            />
            <span>Systems</span>
          </label>
        }
        titleRight={
          <button className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium flex items-center">
            + Expand All
          </button>
        }
        expanded={expandedSections.systems}
        onToggle={() => toggleSection('systems')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5 pl-1">
          {systemData.map(([name, count]) => (
            <div key={name} className="flex items-center justify-between py-1">
              <label className="flex items-center cursor-pointer group flex-1">
                <input
                  type="checkbox"
                  checked={selectedSystems.includes(name)}
                  onChange={() => toggleSystem(name)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 dark:bg-slate-700"
                />
                <span className="ml-2.5 text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                  {name}
                </span>
                <span className="ml-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {count}
                </span>
              </label>
              <button className="ml-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* No. of Questions Section */}
      <Section
        title="No. of Questions"
        expanded={expandedSections.count}
        onToggle={() => toggleSection('count')}
      >
        <div className="flex items-center space-x-4 py-1">
          <input
            type="number"
            min={0}
            max={totalAvailable}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.min(parseInt(e.target.value) || 0, totalAvailable))}
            className="w-16 h-9 text-center text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Max allowed per block <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 text-xs font-semibold ml-1">{totalAvailable}</span>
          </span>
        </div>
      </Section>

      {/* Generate Test Button */}
      <div className="mt-6 flex items-center space-x-3">
        <button
          onClick={handleGenerateTest}
          disabled={loading || questionCount === 0}
          className={`px-5 py-2 text-sm font-semibold text-white rounded-md transition-colors shadow-sm ${
            loading || questionCount === 0
              ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
          }`}
        >
          {loading ? 'GENERATING...' : 'GENERATE TEST'}
        </button>
        <Info size={16} className="text-slate-400" />
      </div>
    </div>
  );
}

/* ===== Collapsible Section Component ===== */
function Section({
  title,
  titleRight,
  expanded,
  onToggle,
  children,
}: {
  title: React.ReactNode;
  titleRight?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md mb-3 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200">
          {title}
          {titleRight}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/* ===== Toggle Switch Component ===== */
function ToggleSwitch({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center cursor-pointer">
      <div
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          active ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            active ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="ml-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium">{label}</span>
    </label>
  );
}
