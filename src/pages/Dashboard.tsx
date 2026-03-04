import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Database, BrainCircuit, Upload, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    subjects: 0,
    systems: 0,
    recentUploads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        const q = query(collection(db, 'questions'), where('user_id', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const questions = querySnapshot.docs.map(doc => doc.data());
        
        const totalCount = questions.length;
        
        const uniqueSubjects = new Set(questions.map(q => q.subject).filter(Boolean)).size;
        const uniqueSystems = new Set(questions.map(q => q.system).filter(Boolean)).size;
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentCount = questions.filter(q => {
          if (!q.created_at) return false;
          const createdAt = new Date(q.created_at);
          return createdAt >= sevenDaysAgo;
        }).length;

        setStats({
          totalQuestions: totalCount,
          subjects: uniqueSubjects,
          systems: uniqueSystems,
          recentUploads: recentCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  const statCards = [
    { name: 'Total Questions', value: stats.totalQuestions, icon: Database, color: 'bg-blue-500' },
    { name: 'Subjects Covered', value: stats.subjects, icon: BrainCircuit, color: 'bg-indigo-500' },
    { name: 'Systems Covered', value: stats.systems, icon: Clock, color: 'bg-purple-500' },
    { name: 'Recent Uploads (7d)', value: stats.recentUploads, icon: Upload, color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back! Here's an overview of your question bank.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-md"></div>
                  <div className="ml-5 w-full">
                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg border border-slate-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${item.color} rounded-md p-3`}>
                      <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 truncate">{item.name}</dt>
                      <dd>
                        <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg border border-slate-100 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/practice"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <BrainCircuit className="mr-2 h-5 w-5" />
              Start Practice
            </Link>
            <Link
              to="/upload"
              className="flex items-center justify-center px-4 py-3 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
            >
              <Upload className="mr-2 h-5 w-5 text-slate-400" />
              Upload CSV
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg border border-slate-100 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Getting Started</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 mr-3 flex-shrink-0 font-medium text-xs">1</span>
              <span>Go to the <strong>Upload CSV</strong> page to add questions to your bank.</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 mr-3 flex-shrink-0 font-medium text-xs">2</span>
              <span>Browse and manage your questions in the <strong>Question Bank</strong>.</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 mr-3 flex-shrink-0 font-medium text-xs">3</span>
              <span>Test your knowledge in <strong>Practice Mode</strong> with custom filters.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
