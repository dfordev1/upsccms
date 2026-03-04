import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Database, BrainCircuit, Upload, Clock, PlayCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TestSession } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    subjects: 0,
    systems: 0,
    recentUploads: 0
  });
  const [recentTests, setRecentTests] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Fetch Questions Stats
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

        // Fetch Recent Tests
        const testsQuery = query(
          collection(db, 'test_sessions'), 
          where('user_id', '==', user.uid)
        );
        const testsSnapshot = await getDocs(testsQuery);
        let tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
        
        // Sort manually since we can't easily combine where and orderBy without composite indexes
        tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentTests(tests.slice(0, 5));

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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
          Welcome back! Here's an overview of your question bank and recent activity.
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
              to="/test/create"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <BrainCircuit className="mr-2 h-5 w-5" />
              Create Test
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
          <h2 className="text-lg font-medium text-slate-900 mb-4">Recent Tests</h2>
          {recentTests.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No recent tests found.</p>
              <Link to="/test/create" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                Start your first test &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTests.map(test => (
                <Link 
                  key={test.id} 
                  to={`/test/${test.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center">
                    {test.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    ) : (
                      <PlayCircle className="h-5 w-5 text-indigo-500 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {test.mode === 'tutor' ? 'Tutor Mode' : 'Timed Mode'} - {test.questions.length} Qs
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {test.status === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {test.score}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Progress
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
