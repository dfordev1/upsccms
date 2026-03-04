import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestSession } from '../types';
import { Link } from 'react-router-dom';
import { PlayCircle, CheckCircle, Clock, Trash2, Database } from 'lucide-react';

export default function TestHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'test_sessions'), where('user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
      
      // Sort manually by created_at descending
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSessions(data);
    } catch (error) {
      console.error('Error fetching test sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test session? This action cannot be undone.')) return;
    
    try {
      await deleteDoc(doc(db, 'test_sessions', id));
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting test session:', error);
      alert('Failed to delete test session');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-uw-navy">Test History</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your past test sessions and resume incomplete ones.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/test/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uw-blue hover:bg-uw-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue"
          >
            Create New Test
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white shadow rounded-lg border border-slate-200">
          <Database className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-uw-navy">No test history</h3>
          <p className="mt-1 text-sm text-slate-500">
            You haven't taken any tests yet.
          </p>
          <div className="mt-6">
            <Link
              to="/test/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uw-blue hover:bg-uw-blue-hover"
            >
              Start Your First Test
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {sessions.map((session) => {
              const answeredCount = Object.keys(session.answers || {}).length;
              const totalCount = session.questions?.length || 0;
              const isCompleted = session.status === 'completed';

              return (
                <li key={session.id} className="hover:bg-slate-50 transition-colors">
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {isCompleted ? (
                        <CheckCircle className="h-8 w-8 text-uw-green flex-shrink-0" />
                      ) : (
                        <PlayCircle className="h-8 w-8 text-uw-amber flex-shrink-0" />
                      )}
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-uw-navy truncate">
                            {session.mode === 'tutor' ? 'Tutor Mode' : 'Timed Mode'} Block
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            {isCompleted ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-uw-green-bg text-uw-green">
                                Score: {session.score}%
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-uw-amber">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-slate-500 sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center">
                              <Database className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                              {answeredCount} / {totalCount} Questions
                            </p>
                            <p className="mt-2 flex items-center sm:mt-0 sm:ml-6">
                              <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                              {formatTime(session.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0 flex items-center space-x-4">
                      <Link
                        to={`/test/${session.id}`}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                          isCompleted ? 'bg-uw-blue hover:bg-uw-blue-hover' : 'bg-uw-amber hover:bg-yellow-600'
                        }`}
                      >
                        {isCompleted ? 'Review' : 'Resume'}
                      </Link>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
