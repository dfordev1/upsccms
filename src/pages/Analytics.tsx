import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession, Question } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Target, TrendingUp, CheckCircle, XCircle, MinusCircle, BrainCircuit } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [overallStats, setOverallStats] = useState({
    totalBankSize: 0,
    totalUsed: 0,
    correct: 0,
    incorrect: 0,
    omitted: 0,
  });

  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [systemData, setSystemData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;

      try {
        // 1. Fetch all questions to know the total bank size
        const qQuery = query(collection(db, 'questions'), where('user_id', '==', user.uid));
        const qSnap = await getDocs(qQuery);
        const allQuestions = qSnap.docs.map(d => d.data() as Question);
        const totalBankSize = allQuestions.length;

        // 2. Fetch all completed test sessions
        const sQuery = query(
          collection(db, 'test_sessions'), 
          where('user_id', '==', user.uid),
          where('status', '==', 'completed')
        );
        const sSnap = await getDocs(sQuery);
        const sessions = sSnap.docs.map(d => d.data() as TestSession);

        let correct = 0;
        let incorrect = 0;
        let omitted = 0;
        const usedQuestionIds = new Set<string>();

        const subjectStats: Record<string, { correct: number, total: number }> = {};
        const systemStats: Record<string, { correct: number, total: number }> = {};

        sessions.forEach(session => {
          session.questions.forEach(q => {
            usedQuestionIds.add(q.id);
            const ans = session.answers[q.id];

            // Initialize stats objects
            if (!subjectStats[q.subject]) subjectStats[q.subject] = { correct: 0, total: 0 };
            if (q.system && !systemStats[q.system]) systemStats[q.system] = { correct: 0, total: 0 };

            subjectStats[q.subject].total += 1;
            if (q.system) systemStats[q.system].total += 1;

            if (!ans) {
              omitted += 1;
            } else if (ans === q.correct_answer) {
              correct += 1;
              subjectStats[q.subject].correct += 1;
              if (q.system) systemStats[q.system].correct += 1;
            } else {
              incorrect += 1;
            }
          });
        });

        setOverallStats({
          totalBankSize,
          totalUsed: usedQuestionIds.size,
          correct,
          incorrect,
          omitted
        });

        // Format for Recharts
        const formattedSubjectData = Object.entries(subjectStats)
          .map(([name, stats]) => ({
            name,
            score: Math.round((stats.correct / stats.total) * 100),
            total: stats.total
          }))
          .sort((a, b) => b.score - a.score);

        const formattedSystemData = Object.entries(systemStats)
          .map(([name, stats]) => ({
            name,
            score: Math.round((stats.correct / stats.total) * 100),
            total: stats.total
          }))
          .sort((a, b) => b.score - a.score);

        setSubjectData(formattedSubjectData);
        setSystemData(formattedSystemData);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue"></div>
      </div>
    );
  }

  const totalAnswered = overallStats.correct + overallStats.incorrect + overallStats.omitted;
  const overallPercentage = totalAnswered > 0 ? Math.round((overallStats.correct / totalAnswered) * 100) : 0;
  const usagePercentage = overallStats.totalBankSize > 0 ? Math.round((overallStats.totalUsed / overallStats.totalBankSize) * 100) : 0;

  const pieData = [
    { name: 'Correct', value: overallStats.correct, color: '#388E3C' }, // uw-green
    { name: 'Incorrect', value: overallStats.incorrect, color: '#E57373' }, // uw-red
    { name: 'Omitted', value: overallStats.omitted, color: '#94a3b8' } // slate-400
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-uw-navy">Performance Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your progress, identify weak areas, and review your overall performance.
        </p>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Target className="h-6 w-6 text-uw-blue" />
          </div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Overall Score</h2>
          <div className="mt-2 flex items-baseline text-4xl font-extrabold text-uw-navy">
            {overallPercentage}%
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {overallStats.correct} correct out of {totalAnswered} questions taken
          </p>
        </div>

        {/* QBank Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">QBank Usage</h2>
            <TrendingUp className="h-5 w-5 text-uw-blue" />
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-uw-navy">{usagePercentage}%</span>
            <span className="text-sm text-slate-500 mb-1">{overallStats.totalUsed} / {overallStats.totalBankSize} Qs</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-uw-blue h-3 rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-uw-green mr-2" />
              <span className="text-sm font-medium text-slate-700">Correct</span>
            </div>
            <span className="text-sm font-bold text-uw-navy">{overallStats.correct}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-uw-red mr-2" />
              <span className="text-sm font-medium text-slate-700">Incorrect</span>
            </div>
            <span className="text-sm font-bold text-uw-navy">{overallStats.incorrect}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MinusCircle className="h-5 w-5 text-slate-400 mr-2" />
              <span className="text-sm font-medium text-slate-700">Omitted</span>
            </div>
            <span className="text-sm font-bold text-uw-navy">{overallStats.omitted}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 col-span-1">
          <h2 className="text-base font-semibold text-uw-navy mb-6">Performance Breakdown</h2>
          {totalAnswered > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} Questions`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <BrainCircuit className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No tests completed yet</p>
            </div>
          )}
        </div>

        {/* Subject Performance Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 col-span-1 lg:col-span-2">
          <h2 className="text-base font-semibold text-uw-navy mb-6">Performance by Subject (%)</h2>
          {subjectData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.total} Qs)`, 
                      'Score'
                    ]}
                  />
                  <Bar dataKey="score" fill="#1565C0" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm">Not enough data to display</p>
            </div>
          )}
        </div>
      </div>

      {/* System Performance Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-base font-semibold text-uw-navy mb-6">Performance by System (%)</h2>
        {systemData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={systemData} margin={{ top: 5, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  dy={10}
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.total} Qs)`, 
                    'Score'
                  ]}
                />
                <Bar dataKey="score" fill="#0D47A1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm">Not enough data to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
