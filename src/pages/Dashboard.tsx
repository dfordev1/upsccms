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
        const q = query(collection(db, 'questions'));
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
        const tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
        
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
    { name: 'Total Questions', value: stats.totalQuestions, icon: Database, color: 'bg-uw-blue' },
    { name: 'Subjects Covered', value: stats.subjects, icon: BrainCircuit, color: 'bg-[#0D47A1]' },
    { name: 'Systems Covered', value: stats.systems, icon: Clock, color: 'bg-[#0A192F]' },
    { name: 'Recent Uploads (7d)', value: stats.recentUploads, icon: Upload, color: 'bg-uw-green' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-uw-navy dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back! Here's an overview of your question bank and recent activity.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                  <div className="ml-5 w-full">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((item) => (
            <div key={item.name} className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${item.color} rounded-md p-3`}>
                      <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{item.name}</dt>
                      <dd>
                        <div className="text-2xl font-semibold text-uw-navy dark:text-slate-100">{item.value}</div>
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
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-medium text-uw-navy dark:text-slate-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/test/create"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-uw-blue hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
            >
              <BrainCircuit className="mr-2 h-5 w-5" />
              Create Test
            </Link>
            <Link
              to="/upload"
              className="flex items-center justify-center px-4 py-3 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
            >
              <Upload className="mr-2 h-5 w-5 text-slate-400 dark:text-slate-500" />
              Upload CSV
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-uw-navy dark:text-slate-100">Recent Tests</h2>
            <Link to="/test/history" className="text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300 font-medium">
              View All
            </Link>
          </div>
          {recentTests.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent tests found.</p>
              <Link to="/test/create" className="mt-2 inline-block text-sm text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300 font-medium">
                Start your first test &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTests.map(test => (
                <Link 
                  key={test.id} 
                  to={`/test/${test.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center">
                    {test.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-uw-green dark:text-green-400 mr-3" />
                    ) : (
                      <PlayCircle className="h-5 w-5 text-uw-blue dark:text-blue-400 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-uw-navy dark:text-slate-200">
                        {test.mode === 'tutor' ? 'Tutor Mode' : test.mode === 'auto' ? 'Auto Solver' : 'Timed Mode'} - {test.questions.length} Qs
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {test.status === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-uw-green-bg dark:bg-green-900/30 text-uw-green dark:text-green-400">
                        {test.score}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-uw-amber dark:text-yellow-400">
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
