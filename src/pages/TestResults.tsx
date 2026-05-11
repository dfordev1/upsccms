import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession, Question } from '../types';
import {
  ArrowLeft,
  StickyNote,
  ListOrdered,
  PlayCircle,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronRight,
  Clock,
  Filter,
} from 'lucide-react';

type FilterType = 'all' | 'correct' | 'incorrect' | 'omitted';

export default function TestResults() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'analysis'>('results');
  const [filter, setFilter] = useState<FilterType>('all');

  // Aggregate stats: % correct by others for each question
  const [aggregateStats, setAggregateStats] = useState<Record<string, { correct: number; total: number }>>({});
  // Average time spent per question (from all sessions)
  const [avgTimeSpent, setAvgTimeSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSession = async () => {
      if (!id || !user) return;
      try {
        const docRef = doc(db, 'test_sessions', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as TestSession;
          if (data.user_id !== user.uid) {
            navigate('/');
            return;
          }
          setSession(data);
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

  // Fetch aggregate stats from all completed sessions
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
        const correctMap: Record<string, { correct: number; total: number }> = {};
        const timeMap: Record<string, { total: number; count: number }> = {};

        snap.docs.forEach(d => {
          const s = d.data() as TestSession;
          s.questions?.forEach(qq => {
            const ans = s.answers?.[qq.id];
            if (!correctMap[qq.id]) correctMap[qq.id] = { correct: 0, total: 0 };
            if (!timeMap[qq.id]) timeMap[qq.id] = { total: 0, count: 0 };

            if (ans !== undefined) {
              correctMap[qq.id].total++;
              if (ans === qq.correct_answer) correctMap[qq.id].correct++;
            }

            const t = s.time_spent?.[qq.id];
            if (t && t > 0) {
              timeMap[qq.id].total += t;
              timeMap[qq.id].count++;
            }
          });
        });

        setAggregateStats(correctMap);

        const avgMap: Record<string, number> = {};
        Object.entries(timeMap).forEach(([qid, v]) => {
          avgMap[qid] = v.count > 0 ? Math.round(v.total / v.count) : 0;
        });
        setAvgTimeSpent(avgMap);
      } catch (error) {
        console.warn('Could not fetch aggregate stats:', error);
      }
    };
    run();
  }, [user, session]);

  if (loading || !session) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue dark:border-blue-400"></div>
      </div>
    );
  }

  const totalQuestions = session.questions.length;
  const answeredQuestions = Object.keys(session.answers || {}).length;
  const correctCount = session.questions.filter(
    q => session.answers[q.id] === q.correct_answer
  ).length;
  const incorrectCount = session.questions.filter(
    q => session.answers[q.id] && session.answers[q.id] !== q.correct_answer
  ).length;
  const omittedCount = totalQuestions - answeredQuestions;
  const scorePercent = session.score ?? (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);

  // Compute average score from aggregate
  let avgPercent = 0;
  let avgTotal = 0;
  let avgCorrect = 0;
  session.questions.forEach(q => {
    const agg = aggregateStats[q.id];
    if (agg && agg.total > 0) {
      avgTotal += agg.total;
      avgCorrect += agg.correct;
    }
  });
  if (avgTotal > 0) avgPercent = Math.round((avgCorrect / avgTotal) * 100);

  // Filter questions
  const filteredQuestions = session.questions.filter(q => {
    const ans = session.answers[q.id];
    if (filter === 'correct') return ans === q.correct_answer;
    if (filter === 'incorrect') return ans !== undefined && ans !== q.correct_answer;
    if (filter === 'omitted') return ans === undefined;
    return true;
  });

  const formatSec = (s: number | undefined) => {
    if (!s || s <= 0) return '0 sec';
    if (s < 60) return `${s} sec`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const getStatusIcon = (q: Question) => {
    const ans = session.answers[q.id];
    if (ans === undefined) return <MinusCircle size={18} className="text-slate-400 dark:text-slate-500" />;
    if (ans === q.correct_answer) return <CheckCircle size={18} className="text-uw-green dark:text-green-400" />;
    return <XCircle size={18} className="text-uw-red dark:text-red-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Test Results
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {session.mode === 'tutor' ? 'Tutor Mode' : session.mode === 'auto' ? 'Auto Solver' : 'Timed Mode'} — {totalQuestions} Questions
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Link
              to="/test/history"
              className="inline-flex items-center text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300 font-medium"
            >
              <ArrowLeft size={16} className="mr-1" />
              Previous Tests
            </Link>
            <Link
              to={`/test/${id}`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-uw-blue hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md shadow-sm"
            >
              <PlayCircle size={16} className="mr-2" />
              Review Test
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('results')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-uw-blue text-uw-blue dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analysis'
                  ? 'border-uw-blue text-uw-blue dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Test Analysis
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'results' ? (
        <>
          {/* Score + Settings Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Your Score */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                Your Score
              </h3>
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-uw-green dark:text-green-400">{scorePercent}%</span>
              </div>
              {/* Score bar */}
              <div className="mt-4 w-full h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-uw-green dark:bg-green-500 transition-all duration-500"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              {avgPercent > 0 && (
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Avg: {avgPercent}%
                </div>
              )}
              {/* Stats row */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-uw-green dark:text-green-400">{correctCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-uw-red dark:text-red-400">{incorrectCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-500 dark:text-slate-400">{omittedCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Omitted</div>
                </div>
              </div>
            </div>

            {/* Test Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                Test Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Mode</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {session.mode === 'tutor' ? 'Tutored' : session.mode === 'auto' ? 'Auto' : 'Timed'}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {session.mode === 'timed' ? 'Timed' : 'Untimed'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Questions</span>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Created</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {session.completed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Completed</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(session.completed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {session.mode === 'auto' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Question Timer</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{session.auto_question_time || 10}s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Answer Timer</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{session.auto_answer_time || 15}s</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 text-sm">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 mr-1" />
              <span className="text-slate-500 dark:text-slate-400 mr-2">Show:</span>
              {(['all', 'correct', 'incorrect', 'omitted'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-uw-blue text-white dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f} {f === 'all' ? `(${totalQuestions})` : f === 'correct' ? `(${correctCount})` : f === 'incorrect' ? `(${incorrectCount})` : `(${omittedCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Question Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="col-span-1">ID</div>
              <div className="col-span-2">Subject</div>
              <div className="col-span-2">System</div>
              <div className="col-span-2">Topic</div>
              <div className="col-span-2">Subtopic</div>
              <div className="col-span-1">% Correct</div>
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Avg Time</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No questions match the selected filter.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const qIndex = session.questions.indexOf(q);
                  const agg = aggregateStats[q.id];
                  const pctCorrect = agg && agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : null;
                  const myTime = session.time_spent?.[q.id] || 0;
                  const avgTime = avgTimeSpent[q.id] || 0;

                  return (
                    <div
                      key={q.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer items-center"
                      onClick={() => navigate(`/test/${id}`)}
                    >
                      {/* ID + Status */}
                      <div className="col-span-1 flex items-center space-x-2">
                        {getStatusIcon(q)}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {qIndex + 1}
                        </span>
                      </div>

                      {/* Subject */}
                      <div className="col-span-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{q.subject || '—'}</span>
                      </div>

                      {/* System */}
                      <div className="col-span-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{q.system || '—'}</span>
                      </div>

                      {/* Topic */}
                      <div className="col-span-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate block">{q.topic || '—'}</span>
                      </div>

                      {/* Subtopic */}
                      <div className="col-span-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate block">{q.subtopic || '—'}</span>
                      </div>

                      {/* % Correct Others */}
                      <div className="col-span-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {pctCorrect !== null ? `${pctCorrect}%` : '—'}
                        </span>
                      </div>

                      {/* Time Spent */}
                      <div className="col-span-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{formatSec(myTime)}</span>
                      </div>

                      {/* Avg Time */}
                      <div className="col-span-1 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{formatSec(avgTime)}</span>
                        <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 hidden md:block" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        /* Test Analysis Tab */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Performance Breakdown</h3>

          {/* Subject breakdown */}
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">By Subject</h4>
              <div className="space-y-3">
                {getSubjectBreakdown(session).map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {item.correct}/{item.total} ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-uw-blue dark:bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">By System</h4>
              <div className="space-y-3">
                {getSystemBreakdown(session).map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {item.correct}/{item.total} ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-uw-navy dark:bg-slate-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time analysis */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Time Analysis</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <Clock size={20} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatSec(getTotalTime(session))}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Time</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <Clock size={20} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatSec(getAvgTime(session))}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg per Question</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <Clock size={20} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatSec(getMedianTime(session))}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Median per Question</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getSubjectBreakdown(session: TestSession) {
  const map: Record<string, { correct: number; total: number }> = {};
  session.questions.forEach(q => {
    const subj = q.subject || 'Unknown';
    if (!map[subj]) map[subj] = { correct: 0, total: 0 };
    map[subj].total++;
    if (session.answers[q.id] === q.correct_answer) map[subj].correct++;
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v, percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

function getSystemBreakdown(session: TestSession) {
  const map: Record<string, { correct: number; total: number }> = {};
  session.questions.forEach(q => {
    const sys = q.system || 'Unknown';
    if (!map[sys]) map[sys] = { correct: 0, total: 0 };
    map[sys].total++;
    if (session.answers[q.id] === q.correct_answer) map[sys].correct++;
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v, percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

function getTotalTime(session: TestSession) {
  return Object.values(session.time_spent || {}).reduce((sum, t) => sum + t, 0);
}

function getAvgTime(session: TestSession) {
  const times = Object.values(session.time_spent || {});
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
}

function getMedianTime(session: TestSession) {
  const times = Object.values(session.time_spent || {}).sort((a, b) => a - b);
  if (times.length === 0) return 0;
  const mid = Math.floor(times.length / 2);
  return times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
}
