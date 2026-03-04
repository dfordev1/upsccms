import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question, TestSession } from '../types';
import { BrainCircuit, Play, Settings } from 'lucide-react';

export default function CreateTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Configuration State
  const [config, setConfig] = useState({
    mode: 'tutor' as 'tutor' | 'timed',
    subject: '',
    system: '',
    difficulty: '',
    count: 10
  });

  // Options
  const [subjects, setSubjects] = useState<string[]>([]);
  const [systems, setSystems] = useState<string[]>([]);

  useEffect(() => {
    fetchOptions();
  }, [user]);

  const fetchOptions = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'questions'), where('user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => doc.data() as Question);
      
      if (data.length > 0) {
        setSubjects(Array.from(new Set(data.map(q => q.subject).filter(Boolean))));
        setSystems(Array.from(new Set(data.map(q => q.system).filter(Boolean))));
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const startPractice = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let q = query(collection(db, 'questions'), where('user_id', '==', user.uid));

      if (config.subject) q = query(q, where('subject', '==', config.subject));
      if (config.system) q = query(q, where('system', '==', config.system));
      if (config.difficulty) q = query(q, where('difficulty', '==', config.difficulty));

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));

      if (data && data.length > 0) {
        // Shuffle and take requested count
        const shuffled = data.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, config.count);
        
        // Create TestSession in Firestore
        const sessionData: Omit<TestSession, 'id'> = {
          user_id: user.uid,
          mode: config.mode,
          status: 'in-progress',
          questions: selectedQuestions,
          answers: {},
          marked: [],
          crossed_out: {},
          time_spent: {},
          created_at: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'test_sessions'), sessionData);
        
        // Navigate to Test Interface
        navigate(`/test/${docRef.id}`);
      } else {
        alert('No questions found matching these criteria.');
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('Failed to start practice session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
          <BrainCircuit className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Create Test</h1>
        <p className="mt-2 text-lg text-slate-600">
          Configure your practice session to focus on specific areas.
        </p>
      </div>

      <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex items-center mb-6">
            <Settings className="h-5 w-5 text-slate-400 mr-2" />
            <h2 className="text-xl font-semibold text-slate-900">Test Settings</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Test Mode</label>
                <div className="flex space-x-4">
                  <label className={`flex-1 flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${config.mode === 'tutor' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" className="sr-only" checked={config.mode === 'tutor'} onChange={() => setConfig({...config, mode: 'tutor'})} />
                    <span className="font-medium">Tutor Mode</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${config.mode === 'timed' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" className="sr-only" checked={config.mode === 'timed'} onChange={() => setConfig({...config, mode: 'timed'})} />
                    <span className="font-medium">Timed Mode</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
                <select
                  id="subject"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  value={config.subject}
                  onChange={(e) => setConfig({...config, subject: e.target.value})}
                >
                  <option value="">Any Subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="system" className="block text-sm font-medium text-slate-700">System</label>
                <select
                  id="system"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  value={config.system}
                  onChange={(e) => setConfig({...config, system: e.target.value})}
                >
                  <option value="">Any System</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700">Difficulty</label>
                <select
                  id="difficulty"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  value={config.difficulty}
                  onChange={(e) => setConfig({...config, difficulty: e.target.value})}
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label htmlFor="count" className="block text-sm font-medium text-slate-700">Number of Questions</label>
                <select
                  id="count"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  value={config.count}
                  onChange={(e) => setConfig({...config, count: parseInt(e.target.value)})}
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={40}>40 Questions</option>
                  <option value={50}>50 Questions</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button
                onClick={startPractice}
                disabled={loading}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Loading...' : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Generate Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
