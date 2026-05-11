import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession, Question } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  StickyNote,
  List,
  BarChart3,
  Info,
  Eye,
} from 'lucide-react';

type Tab = 'results' | 'analysis';
type FilterType = 'all' | 'correct' | 'incorrect' | 'omitted';

export default function TestResults() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [filter, setFilter] = useState<FilterType>('all');
  const [aggregateStats, setAggregateStats] = useState<Record<string, { correct: number; total: number }>>({});

  useEffect(() => {
    const fetchSession = async () => {
      if (!id || !user) return;
      try {
        const docRef = doc(db, 'test_sessions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as TestSession;
          if (data.user_id !== user.uid) { navigate('/'); return; }
          setSession(data);
        } else {
          navigate('/test/history');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id, user, navigate]);

  // Fetch aggregate stats for % correct others
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

  const results = useMemo(() => {
    if (!session) return { correct: 0, incorrect: 0, omitted: 0, total: 0, score: 0 };
    const total = session.questions.length;
    let correct = 0, incorrect = 0, omitted = 0;
    session.questions.forEach(q => {
      const ans = session.answers?.[q.id];
      if (ans === undefined) omitted++;
      else if (ans === q.correct_answer) correct++;
      else incorrect++;
    });
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, incorrect, omitted, total, score };
  }, [session]);

  const filteredQuestions = useMemo(() => {
    if (!session) return [];
    return session.questions.filter(q => {
      const ans = session.answers?.[q.id];
      if (filter === 'correct') return ans === q.correct_answer;
      if (filter === 'incorrect') return ans !== undefined && ans !== q.correct_answer;
      if (filter === 'omitted') return ans === undefined;
      return true;
    });
  }, [session, filter]);

  // Analysis data
  const analysisData = useMemo(() => {
    if (!session) return { bySubject: {}, bySystem: {}, byTopic: {}, byDifficulty: {} };
    const bySubject: Record<string, { correct: number; total: number }> = {};
    const bySystem: Record<string, { correct: number; total: number }> = {};
    const byTopic: Record<string, { correct: number; total: number }> = {};
    const byDifficulty: Record<string, { correct: number; total: number }> = {};

    session.questions.forEach(q => {
      const ans = session.answers?.[q.id];
      const isCorrect = ans === q.correct_answer;
      const wasAnswered = ans !== undefined;

      const addTo = (map: Record<string, { correct: number; total: number }>, key: string) => {
        if (!key) return;
        if (!map[key]) map[key] = { correct: 0, total: 0 };
        map[key].total++;
        if (wasAnswered && isCorrect) map[key].correct++;
      };

      addTo(bySubject, q.subject);
      addTo(bySystem, q.system);
      addTo(byTopic, q.topic);
      addTo(byDifficulty, q.difficulty);
    });

    return { bySubject, bySystem, byTopic, byDifficulty };
  }, [session]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue"></div>
      </div>
    );
  }

  const avgTimePerQuestion = session.questions.length > 0
    ? Math.round(Object.values(session.time_spent || {}).reduce((a, b) => a + b, 0) / session.questions.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/test/history" className="flex items-center text-uw-blue dark:text-blue-400 hover:underline text-sm font-medium">
            <ChevronLeft size={16} className="mr-1" /> Previous Tests
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/test/${session.id}`}
            className="inline-flex items-center px-4 py-2 bg-uw-blue text-white text-sm font-medium rounded-md hover:bg-uw-blue-hover transition-colors"
          >
            <Eye size={16} className="mr-2" /> Review Test
          </Link>
        </div>
      </div>

      {/* Test Name Header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-uw-navy dark:text-slate-100">
              Test Results
            </h1>
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Custom Test Id: {session.id?.slice(0, 12)}</span>
              <Info size={14} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('results')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-uw-blue text-uw-blue dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analysis'
                  ? 'border-uw-blue text-uw-blue dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Test Analysis
            </button>
          </div>
        </div>

        {activeTab === 'results' && (
          <div className="p-6">
            {/* Score + Settings Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Score Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Your Score</h3>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold mb-2 ${
                    results.score >= 70 ? 'text-uw-green' : results.score >= 40 ? 'text-uw-amber' : 'text-uw-red'
                  }`}>
                    {results.score}%
                  </span>
                  {/* Score Bar */}
                  <div className="w-full max-w-md h-8 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden flex">
                    <div
                      className="h-full bg-uw-green transition-all duration-500"
                      style={{ width: `${(results.correct / results.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-uw-red transition-all duration-500"
                      style={{ width: `${(results.incorrect / results.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-500"
                      style={{ width: `${(results.omitted / results.total) * 100}%` }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center space-x-6 mt-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-uw-green mr-1.5"></span>Correct: {results.correct}</span>
                    <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-uw-red mr-1.5"></span>Incorrect: {results.incorrect}</span>
                    <span className="flex items-center"><span className="w-3 h-3 rounded-sm bg-slate-400 mr-1.5"></span>Omitted: {results.omitted}</span>
                  </div>
                </div>
              </div>

              {/* Test Settings */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Test Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Mode</span>
                    <div className="flex space-x-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        session.mode === 'tutor' ? 'bg-blue-100 dark:bg-blue-900/30 text-uw-blue dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>Tutored</span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        session.mode !== 'tutor' ? 'bg-blue-100 dark:bg-blue-900/30 text-uw-blue dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>{session.mode === 'timed' ? 'Timed' : 'Untimed'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Questions</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{results.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Avg Time/Question</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{avgTimePerQuestion} sec</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Date</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-1 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Show:</span>
                {(['all', 'correct', 'incorrect', 'omitted'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      filter === f
                        ? 'bg-uw-blue text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {filteredQuestions.length} of {results.total} questions
              </span>
            </div>

            {/* Questions Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-16">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">SUBJECTS</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">SYSTEMS</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">TOPICS</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">DIFFICULTY</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">% CORRECT OTHERS</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">TIME SPENT</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQuestions.map((q, idx) => {
                    const ans = session.answers?.[q.id];
                    const isCorrect = ans === q.correct_answer;
                    const isOmitted = ans === undefined;
                    const timeForQ = session.time_spent?.[q.id] || 0;
                    const agg = aggregateStats[q.id];
                    const pctCorrect = agg && agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : null;
                    const qNumber = session.questions.indexOf(q) + 1;

                    return (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {isOmitted ? (
                              <MinusCircle size={16} className="text-slate-400" />
                            ) : isCorrect ? (
                              <CheckCircle size={16} className="text-uw-green" />
                            ) : (
                              <XCircle size={16} className="text-uw-red" />
                            )}
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{qNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{q.subject || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{q.system || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{q.topic || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            q.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            q.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {pctCorrect !== null ? `${pctCorrect}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {timeForQ} sec
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/test/${session.id}`}
                            className="text-slate-400 hover:text-uw-blue dark:hover:text-blue-400 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="p-6">
            <TestAnalysis data={analysisData} results={results} session={session} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Test Analysis Component ===== */
interface AnalysisProps {
  data: {
    bySubject: Record<string, { correct: number; total: number }>;
    bySystem: Record<string, { correct: number; total: number }>;
    byTopic: Record<string, { correct: number; total: number }>;
    byDifficulty: Record<string, { correct: number; total: number }>;
  };
  results: { correct: number; incorrect: number; omitted: number; total: number; score: number };
  session: TestSession;
}

function TestAnalysis({ data, results, session }: AnalysisProps) {
  return (
    <div className="space-y-8">
      {/* Overall Performance */}
      <div>
        <h3 className="text-lg font-semibold text-uw-navy dark:text-slate-100 mb-4">Overall Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Score" value={`${results.score}%`} color="blue" />
          <StatCard label="Correct" value={`${results.correct}/${results.total}`} color="green" />
          <StatCard label="Incorrect" value={`${results.incorrect}`} color="red" />
          <StatCard label="Omitted" value={`${results.omitted}`} color="gray" />
        </div>
      </div>

      {/* By Subject */}
      <BreakdownSection title="Performance by Subject" data={data.bySubject} />

      {/* By System */}
      <BreakdownSection title="Performance by System" data={data.bySystem} />

      {/* By Topic */}
      <BreakdownSection title="Performance by Topic" data={data.byTopic} />

      {/* By Difficulty */}
      <BreakdownSection title="Performance by Difficulty" data={data.byDifficulty} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-uw-blue dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-uw-green dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-uw-red dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  return (
    <div className={`rounded-lg border p-4 text-center ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1 opacity-75">{label}</div>
    </div>
  );
}

function BreakdownSection({ title, data }: { title: string; data: Record<string, { correct: number; total: number }> }) {
  const entries = Object.entries(data).sort((a, b) => {
    const pctA = a[1].total > 0 ? a[1].correct / a[1].total : 0;
    const pctB = b[1].total > 0 ? b[1].correct / b[1].total : 0;
    return pctB - pctA;
  });

  if (entries.length === 0) return null;

  return (
    <div>
      <h3 className="text-base font-semibold text-uw-navy dark:text-slate-100 mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map(([key, val]) => {
          const pct = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
          return (
            <div key={key} className="flex items-center space-x-3">
              <span className="text-sm text-slate-700 dark:text-slate-300 w-40 truncate font-medium">{key}</span>
              <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-md overflow-hidden relative">
                <div
                  className={`h-full rounded-md transition-all duration-500 ${
                    pct >= 70 ? 'bg-uw-green' : pct >= 40 ? 'bg-uw-amber' : 'bg-uw-red'
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {pct}% ({val.correct}/{val.total})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
