import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question } from '../types';
import { Search, Filter, ChevronDown, ChevronUp, Edit2, Trash2, Database } from 'lucide-react';

export default function QuestionBank() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Options for filters
  const [subjects, setSubjects] = useState<string[]>([]);
  const [systems, setSystems] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [user, subjectFilter, systemFilter, difficultyFilter, yearFilter]);

  const fetchQuestions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let q = query(collection(db, 'questions'), where('user_id', '==', user.uid));

      if (subjectFilter) q = query(q, where('subject', '==', subjectFilter));
      if (systemFilter) q = query(q, where('system', '==', systemFilter));
      if (difficultyFilter) q = query(q, where('difficulty', '==', difficultyFilter));
      if (yearFilter) q = query(q, where('exam_year', '==', parseInt(yearFilter)));

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));

      // Sort by created_at descending manually since we can't easily combine where and orderBy without composite indexes in Firestore
      data.sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setQuestions(data);

      // Extract unique values for filters if not already set
      if (subjects.length === 0 && data.length > 0) {
        const uniqueSubjects = Array.from(new Set(data.map(q => q.subject).filter(Boolean)));
        const uniqueSystems = Array.from(new Set(data.map(q => q.system).filter(Boolean)));
        const uniqueYears = Array.from(new Set(data.map(q => q.exam_year).filter(Boolean))).sort((a, b) => b - a);

        setSubjects(uniqueSubjects as string[]);
        setSystems(uniqueSystems as string[]);
        setYears(uniqueYears as number[]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteDoc(doc(db, 'questions', id));
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredQuestions = questions.filter(q => 
    q.stem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.explanation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and review your UPSC CMS questions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-slate-200 mb-6 p-4">
        <div className="flex items-center text-sm font-medium text-slate-700 mb-3">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
          >
            <option value="">All Systems</option>
            {systems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-white shadow rounded-lg border border-slate-200">
          <Database className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">No questions found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your filters or search term, or upload a new CSV.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => (
            <div key={q.id} className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
              <div 
                className="p-4 sm:p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(q.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {q.subject}
                      </span>
                      {q.system && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {q.system}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        q.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                        q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {q.difficulty}
                      </span>
                      {q.exam_year && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {q.exam_year} {q.paper_number ? `(${q.paper_number})` : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-medium text-slate-900 leading-relaxed">
                      {q.stem}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    {expandedId === q.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedId === q.id && (
                <div className="px-4 sm:px-6 pb-6 border-t border-slate-100 pt-4 bg-slate-50">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((num) => {
                        const isCorrect = q.correct_answer === num;
                        const choiceText = q[`choice_${num}` as keyof Question] as string;
                        const choiceExp = q[`choice_${num}_explanation` as keyof Question] as string;
                        
                        if (!choiceText) return null;

                        return (
                          <div 
                            key={num} 
                            className={`p-3 rounded-md border ${
                              isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start">
                              <span className={`flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mr-3 ${
                                isCorrect ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {String.fromCharCode(64 + num)}
                              </span>
                              <div>
                                <p className={`text-sm ${isCorrect ? 'font-medium text-green-900' : 'text-slate-700'}`}>
                                  {choiceText}
                                </p>
                                {choiceExp && (
                                  <p className="mt-1 text-xs text-slate-500 italic">
                                    {choiceExp}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Explanation</h4>
                        <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}

                    {q.educational_objective && (
                      <div className="mt-2">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Educational Objective</h4>
                        <p className="text-sm text-slate-700">{q.educational_objective}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
