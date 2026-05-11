import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession, Question } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceDot } from 'recharts';
import { Printer } from 'lucide-react';

interface StatRow {
  label: string;
  value: string | number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalCorrect: 0,
    totalIncorrect: 0,
    totalOmitted: 0,
    usedQuestions: 0,
    unusedQuestions: 0,
    totalQuestions: 0,
    correctToIncorrect: 0,
    incorrectToCorrect: 0,
    incorrectToIncorrect: 0,
    testsCreated: 0,
    testsCompleted: 0,
    suspendedTests: 0,
    yourAvgTime: 0,
    othersAvgTime: 65, // placeholder since we don't have cross-user data
  });

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;

      try {
        // All questions (bank size)
        const qSnap = await getDocs(query(collection(db, 'questions')));
        const allQuestions = qSnap.docs.map(d => d.data() as Question);
        const totalQuestions = allQuestions.length;

        // All user sessions
        const sSnap = await getDocs(query(collection(db, 'test_sessions'), where('user_id', '==', user.uid)));
        const allSessions = sSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as TestSession))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const completedSessions = allSessions.filter(s => s.status === 'completed');
        const suspendedSessions = allSessions.filter(s => s.status === 'in-progress');

        let correct = 0;
        let incorrect = 0;
        let omitted = 0;
        const usedQuestionIds = new Set<string>();
        let totalTimeSpent = 0;
        let timeQuestionCount = 0;

        // Track answer history per question for "Answer Changes"
        const questionAnswerHistory: Record<string, { answer: number; correct: number }[]> = {};

        completedSessions.forEach(session => {
          session.questions.forEach(q => {
            usedQuestionIds.add(q.id);
            const ans = session.answers?.[q.id];
            if (ans === undefined) {
              omitted++;
            } else if (ans === q.correct_answer) {
              correct++;
            } else {
              incorrect++;
            }

            if (ans !== undefined) {
              if (!questionAnswerHistory[q.id]) questionAnswerHistory[q.id] = [];
              questionAnswerHistory[q.id].push({ answer: ans, correct: q.correct_answer });
            }

            const t = session.time_spent?.[q.id] || 0;
            if (t > 0) {
              totalTimeSpent += t;
              timeQuestionCount++;
            }
          });
        });

        // Compute answer changes
        let correctToIncorrect = 0;
        let incorrectToCorrect = 0;
        let incorrectToIncorrect = 0;
        Object.values(questionAnswerHistory).forEach(history => {
          for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            const prevCorrect = prev.answer === prev.correct;
            const currCorrect = curr.answer === curr.correct;
            if (prevCorrect && !currCorrect) correctToIncorrect++;
            else if (!prevCorrect && currCorrect) incorrectToCorrect++;
            else if (!prevCorrect && !currCorrect && prev.answer !== curr.answer) incorrectToIncorrect++;
          }
        });

        const yourAvgTime = timeQuestionCount > 0 ? Math.round(totalTimeSpent / timeQuestionCount) : 0;

        setStats({
          totalCorrect: correct,
          totalIncorrect: incorrect,
          totalOmitted: omitted,
          usedQuestions: usedQuestionIds.size,
          unusedQuestions: totalQuestions - usedQuestionIds.size,
          totalQuestions,
          correctToIncorrect,
          incorrectToCorrect,
          incorrectToIncorrect,
          testsCreated: allSessions.length,
          testsCompleted: completedSessions.length,
          suspendedTests: suspendedSessions.length,
          yourAvgTime,
          othersAvgTime: 65,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user]);

  // Compute score percentage
  const totalAnswered = stats.totalCorrect + stats.totalIncorrect + stats.totalOmitted;
  const scorePercent = totalAnswered > 0 ? Math.round((stats.totalCorrect / totalAnswered) * 100) : 0;
  const unusedPercent = stats.totalQuestions > 0
    ? Math.round((stats.unusedQuestions / stats.totalQuestions) * 100)
    : 100;

  // Generate bell curve data for percentile rank
  const bellCurveData = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const mean = 50;
    const stdDev = 20;
    for (let x = 0; x <= 100; x += 2) {
      const y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI));
      points.push({ x, y: y * 1000 });
    }
    return points;
  }, []);

  // Approximate percentile rank (your score vs. bell curve mean)
  const yourRank = scorePercent === 0 ? 0 : Math.min(99, Math.max(1, Math.round(scorePercent)));
  const medianRank = 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue dark:border-blue-400"></div>
      </div>
    );
  }

  // Donut chart segments
  const donutSegments = [
    { label: 'Correct', value: stats.totalCorrect, color: '#22C55E' },
    { label: 'Incorrect', value: stats.totalIncorrect, color: '#EF4444' },
    { label: 'Omitted', value: stats.totalOmitted, color: '#94A3B8' },
    { label: 'Unused', value: stats.unusedQuestions, color: '#E2E8F0' },
  ];
  const donutTotal = donutSegments.reduce((a, b) => a + b.value, 0) || 1;

  // Compute stroke-dasharray offsets for donut
  const circumference = 2 * Math.PI * 70;
  let cumulativeOffset = 0;
  const donutRendered = donutSegments.map(seg => {
    const pct = seg.value / donutTotal;
    const segLen = pct * circumference;
    const dashArray = `${segLen} ${circumference - segLen}`;
    const dashOffset = -cumulativeOffset;
    cumulativeOffset += segLen;
    return { ...seg, dashArray, dashOffset, pct };
  });

  const centerLabel = totalAnswered > 0 ? `${scorePercent}%` : `${unusedPercent}%`;
  const centerSubLabel = totalAnswered > 0 ? 'Score' : 'Unused';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-normal text-slate-700 dark:text-slate-200">Overall Performance</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
        {/* Statistics + Print header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Statistics</h2>
          <button
            onClick={() => window.print()}
            className="flex items-center text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300 font-medium"
          >
            <Printer size={15} className="mr-1.5" /> Print
          </button>
        </div>

        {/* Main grid: Donut + 4 Stat Sections */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                {donutRendered.map((seg, i) => (
                  <circle
                    key={i}
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold text-slate-700 dark:text-slate-200">{centerLabel}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{centerSubLabel}</span>
              </div>
            </div>
          </div>

          {/* Right: 2x2 grid of stat sections */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <StatSection
              title="Your Score"
              rows={[
                { label: 'Total Correct', value: stats.totalCorrect },
                { label: 'Total Incorrect', value: stats.totalIncorrect },
                { label: 'Total Omitted', value: stats.totalOmitted },
              ]}
            />
            <StatSection
              title="Answer Changes"
              rows={[
                { label: 'Correct to Incorrect', value: stats.correctToIncorrect },
                { label: 'Incorrect to Correct', value: stats.incorrectToCorrect },
                { label: 'Incorrect to Incorrect', value: stats.incorrectToIncorrect },
              ]}
            />
            <StatSection
              title="QBank Usage"
              rows={[
                { label: 'Used Questions', value: stats.usedQuestions },
                { label: 'Unused Questions', value: stats.unusedQuestions },
                { label: 'Total Questions', value: stats.totalQuestions },
              ]}
            />
            <StatSection
              title="Test Count"
              rows={[
                { label: 'Tests Created', value: stats.testsCreated },
                { label: 'Tests Completed', value: stats.testsCompleted },
                { label: 'Suspended Tests', value: stats.suspendedTests },
              ]}
            />
          </div>
        </div>

        {/* Percentile Rank Section */}
        <div className="px-6 pb-6 pt-2 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bellCurveData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="0" stroke="transparent" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}th`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={() => null} cursor={false} />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  {/* Your score dot */}
                  <ReferenceDot
                    x={yourRank}
                    y={Math.exp(-0.5 * Math.pow((yourRank - 50) / 20, 2)) / (20 * Math.sqrt(2 * Math.PI)) * 1000}
                    r={6}
                    fill="#22C55E"
                    stroke="#22C55E"
                  />
                  {/* Median dot */}
                  <ReferenceDot
                    x={medianRank}
                    y={Math.exp(-0.5 * Math.pow((medianRank - 50) / 20, 2)) / (20 * Math.sqrt(2 * Math.PI)) * 1000}
                    r={6}
                    fill="#0EA5E9"
                    stroke="#0EA5E9"
                  />
                </LineChart>
              </ResponsiveContainer>
              {/* x-axis labels beneath dots */}
              <div className="absolute bottom-8 left-[0%] text-[10px] text-slate-500">
                {yourRank}th
              </div>
            </div>
          </div>

          {/* Right side legend */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Percentile Rank</h3>
            <div className="space-y-3 text-sm">
              <LegendRow
                color="#22C55E"
                label={`Your Score (${yourRank}th rank)`}
                value={`${scorePercent}%`}
              />
              <LegendRow
                color="#0EA5E9"
                label={`Median Score (${medianRank}th rank)`}
                value={`${medianRank}%`}
              />
              <LegendRow
                color="transparent"
                label="Your Average Time Spent (sec)"
                value={stats.yourAvgTime}
                noDot
              />
              <LegendRow
                color="transparent"
                label="Other's Average Time Spent (sec)"
                value={stats.othersAvgTime}
                noDot
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Stat Section ===== */
function StatSection({ title, rows }: { title: string; rows: StatRow[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{title}</h3>
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Legend Row ===== */
function LegendRow({ color, label, value, noDot }: { color: string; label: string; value: string | number; noDot?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {!noDot && (
          <span className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: color }} />
        )}
        {noDot && <span className="inline-block w-3 h-3 mr-2 flex-shrink-0" />}
        <span className="text-slate-700 dark:text-slate-300 text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
