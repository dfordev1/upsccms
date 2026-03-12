import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Question, TestSession } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ChevronRight, ChevronDown, Folder, FileText, Activity, Download, Play } from 'lucide-react';

// Define the hierarchy structure
interface HierarchyNode {
  name: string;
  level: 'subject' | 'system' | 'topic' | 'subtopic';
  count: number;
  yearDistribution: Record<number, number>;
  children: Record<string, HierarchyNode>;
  isExpanded?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function PYQAnalysis() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [testMode, setTestMode] = useState<'tutor' | 'timed' | 'auto'>('tutor');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for the selected node to display in charts
  const [selectedNodePath, setSelectedNodePath] = useState<string[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'questions'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(data);
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build the hierarchy tree
  const hierarchy = useMemo(() => {
    const root: Record<string, HierarchyNode> = {};

    questions.forEach(q => {
      const year = q.exam_year || 0;
      const subject = q.subject || 'Uncategorized Subject';
      const system = q.system || 'Uncategorized System';
      const topic = q.topic || 'Uncategorized Topic';
      const subtopic = q.subtopic || '';
      
      // Subject Level
      if (!root[subject]) {
        root[subject] = { name: subject, level: 'subject', count: 0, yearDistribution: {}, children: {} };
      }
      root[subject].count++;
      root[subject].yearDistribution[year] = (root[subject].yearDistribution[year] || 0) + 1;

      // System Level
      if (!root[subject].children[system]) {
        root[subject].children[system] = { name: system, level: 'system', count: 0, yearDistribution: {}, children: {} };
      }
      root[subject].children[system].count++;
      root[subject].children[system].yearDistribution[year] = (root[subject].children[system].yearDistribution[year] || 0) + 1;

      // Topic Level
      if (!root[subject].children[system].children[topic]) {
        root[subject].children[system].children[topic] = { name: topic, level: 'topic', count: 0, yearDistribution: {}, children: {} };
      }
      root[subject].children[system].children[topic].count++;
      root[subject].children[system].children[topic].yearDistribution[year] = (root[subject].children[system].children[topic].yearDistribution[year] || 0) + 1;

      // Subtopic Level
      if (subtopic) {
        if (!root[subject].children[system].children[topic].children[subtopic]) {
          root[subject].children[system].children[topic].children[subtopic] = { name: subtopic, level: 'subtopic', count: 0, yearDistribution: {}, children: {} };
        }
        root[subject].children[system].children[topic].children[subtopic].count++;
        root[subject].children[system].children[topic].children[subtopic].yearDistribution[year] = (root[subject].children[system].children[topic].children[subtopic].yearDistribution[year] || 0) + 1;
      }
    });

    return root;
  }, [questions]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleSelectNode = (path: string[]) => {
    setSelectedNodePath(path);
  };

  const handleSolveQuestions = async () => {
    if (!user || !selectedNode || selectedNode.count === 0) return;
    
    setIsCreatingTest(true);
    try {
      // Filter questions based on selected path
      let filteredQuestions = questions;
      
      if (selectedNodePath.length > 0) {
        const subject = selectedNodePath[0];
        filteredQuestions = filteredQuestions.filter(q => (q.subject || 'Uncategorized Subject') === subject);
      }
      if (selectedNodePath.length > 1) {
        const system = selectedNodePath[1];
        filteredQuestions = filteredQuestions.filter(q => (q.system || 'Uncategorized System') === system);
      }
      if (selectedNodePath.length > 2) {
        const topic = selectedNodePath[2];
        filteredQuestions = filteredQuestions.filter(q => (q.topic || 'Uncategorized Topic') === topic);
      }
      if (selectedNodePath.length > 3) {
        const subtopic = selectedNodePath[3];
        filteredQuestions = filteredQuestions.filter(q => (q.subtopic || '') === subtopic);
      }

      // Shuffle and take up to 240 questions
      const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, 240);

      // Create TestSession in Firestore
      const sessionData: Omit<TestSession, 'id'> = {
        user_id: user.uid,
        mode: testMode,
        status: 'in-progress',
        questions: selectedQuestions,
        answers: {},
        marked: [],
        crossed_out: {},
        time_spent: {},
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'test_sessions'), sessionData);
      
      // Navigate to Test Interface
      navigate(`/test/${docRef.id}`);
    } catch (error) {
      console.error('Error creating test session:', error);
      alert('Failed to start practice session');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const exportTreeToCSV = () => {
    const rows: string[] = [];
    rows.push(['Subject', 'System', 'Topic', 'Subtopic', 'Year', 'Count'].join(','));

    const aggregated: Record<string, number> = {};
    questions.forEach(q => {
      const subject = q.subject || 'Uncategorized Subject';
      const system = q.system || 'Uncategorized System';
      const topic = q.topic || 'Uncategorized Topic';
      const subtopic = q.subtopic || '';
      const year = q.exam_year || 0;
      
      const key = `${subject}|${system}|${topic}|${subtopic}|${year}`;
      aggregated[key] = (aggregated[key] || 0) + 1;
    });

    Object.entries(aggregated).forEach(([key, count]) => {
      const [subject, system, topic, subtopic, year] = key.split('|');
      rows.push([
        `"${subject.replace(/"/g, '""')}"`,
        `"${system.replace(/"/g, '""')}"`,
        `"${topic.replace(/"/g, '""')}"`,
        `"${subtopic.replace(/"/g, '""')}"`,
        year === '0' ? 'Unknown' : year,
        count
      ].join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pyq_analysis_tree.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get the currently selected node
  const selectedNode = useMemo(() => {
    if (selectedNodePath.length === 0) {
      // Return an aggregated root node
      const aggregated: HierarchyNode = {
        name: 'All Subjects',
        level: 'subject',
        count: questions.length,
        yearDistribution: {},
        children: hierarchy
      };
      questions.forEach(q => {
        const year = q.exam_year || 0;
        aggregated.yearDistribution[year] = (aggregated.yearDistribution[year] || 0) + 1;
      });
      return aggregated;
    }

    let current: HierarchyNode | undefined;
    let currentChildren = hierarchy;
    
    for (const segment of selectedNodePath) {
      if (currentChildren[segment]) {
        current = currentChildren[segment];
        currentChildren = current.children;
      } else {
        return null; // Path invalid
      }
    }
    return current;
  }, [selectedNodePath, hierarchy, questions]);

  // Prepare chart data
  const yearChartData = useMemo(() => {
    if (!selectedNode) return [];
    return Object.entries(selectedNode.yearDistribution)
      .map(([year, count]) => ({ year: year === '0' ? 'Unknown' : year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [selectedNode]);

  const childrenChartData = useMemo(() => {
    if (!selectedNode) return [];
    return Object.values(selectedNode.children)
      .map(child => ({ name: child.name, count: child.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 for pie chart
  }, [selectedNode]);

  // Recursive component to render the tree
  const renderTree = (nodes: Record<string, HierarchyNode>, currentPath: string[]) => {
    return Object.values(nodes)
      .sort((a, b) => b.count - a.count)
      .map((node) => {
        const path = [...currentPath, node.name];
        const pathString = path.join('||');
        const isExpanded = expandedPaths.has(pathString);
        const isSelected = selectedNodePath.join('||') === pathString;
        const hasChildren = Object.keys(node.children).length > 0;

        return (
          <div key={pathString} className="ml-4">
            <div 
              className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 ${isSelected ? 'bg-uw-blue/10 dark:bg-blue-900/30 text-uw-blue dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
              onClick={() => handleSelectNode(path)}
            >
              <div 
                className="w-5 h-5 flex items-center justify-center mr-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) toggleExpand(pathString);
                }}
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                ) : (
                  <span className="w-4"></span>
                )}
              </div>
              {hasChildren ? <Folder size={16} className="mr-2 text-slate-400 dark:text-slate-500" /> : <FileText size={16} className="mr-2 text-slate-400 dark:text-slate-500" />}
              <span className="truncate">{node.name}</span>
              <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full">
                {node.count}
              </span>
            </div>
            {isExpanded && hasChildren && (
              <div className="border-l border-slate-200 dark:border-slate-700 ml-2.5 pl-1 mt-1">
                {renderTree(node.children, path)}
              </div>
            )}
          </div>
        );
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">PYQ Pattern Analysis</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Analyze previous year questions by Subject, System, Topic, and Subtopic.</p>
        </div>
        <button
          onClick={exportTreeToCSV}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-uw-blue rounded-md hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          <Download size={16} className="mr-2" />
          Export Tree to CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Left Panel: Hierarchy Tree */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
              <Activity size={18} className="mr-2 text-uw-blue dark:text-blue-400" />
              Study Hierarchy
            </h2>
            <button 
              onClick={() => setSelectedNodePath([])}
              className="text-xs text-uw-blue dark:text-blue-400 hover:underline"
            >
              Reset View
            </button>
          </div>
          <div className="p-2 overflow-y-auto flex-1">
            {Object.keys(hierarchy).length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">No questions available.</div>
            ) : (
              <div className="-ml-4">
                {renderTree(hierarchy, [])}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Analysis Charts */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">
          {selectedNode ? (
            <>
              {/* Header for selected node */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <span className="cursor-pointer hover:text-uw-blue dark:hover:text-blue-400" onClick={() => setSelectedNodePath([])}>All Subjects</span>
                  {selectedNodePath.map((segment, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight size={14} className="mx-1" />
                      <span 
                        className={`cursor-pointer hover:text-uw-blue dark:hover:text-blue-400 ${idx === selectedNodePath.length - 1 ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}`}
                        onClick={() => setSelectedNodePath(selectedNodePath.slice(0, idx + 1))}
                      >
                        {segment}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedNode.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 capitalize">{selectedNode.level === 'subject' && selectedNodePath.length === 0 ? 'Overview' : selectedNode.level}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={testMode}
                          onChange={(e) => setTestMode(e.target.value as 'tutor' | 'timed' | 'auto')}
                          className="text-sm border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500"
                        >
                          <option value="tutor">Tutor Mode</option>
                          <option value="timed">Timed Mode</option>
                          <option value="auto">Auto Solver</option>
                        </select>
                        <button
                          onClick={handleSolveQuestions}
                          disabled={isCreatingTest || selectedNode.count === 0}
                          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-uw-blue rounded-md hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Play size={16} className="mr-2" />
                          {isCreatingTest ? 'Starting...' : 'Solve'}
                        </button>
                      </div>
                    </div>
                    <div className="ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                      <div className="text-3xl font-bold text-uw-blue dark:text-blue-400">{selectedNode.count}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Total Questions</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Year Distribution Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Questions per Year</h3>
                  <div className="h-64">
                    {yearChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip 
                            cursor={{ fill: 'var(--tw-colors-slate-100)' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} name="Questions" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No year data available</div>
                    )}
                  </div>
                </div>

                {/* Children Breakdown Chart */}
                {Object.keys(selectedNode.children).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                      Breakdown by {Object.values(selectedNode.children)[0]?.level || 'Sub-category'}
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={childrenChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="count"
                          >
                            {childrenChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Table of Sub-categories */}
              {Object.keys(selectedNode.children).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {Object.values(selectedNode.children)[0]?.level.charAt(0).toUpperCase() + Object.values(selectedNode.children)[0]?.level.slice(1)} Breakdown
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Questions
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            % of Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {Object.values(selectedNode.children)
                          .sort((a, b) => b.count - a.count)
                          .map((child, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => handleSelectNode([...selectedNodePath, child.name])}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-uw-blue dark:text-blue-400">
                                {child.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">
                                {child.count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">
                                {((child.count / selectedNode.count) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center h-full">
              <Activity size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">Select a category to analyze</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Click on any Subject, System, Topic, or Subtopic in the hierarchy tree on the left to view its PYQ pattern and distribution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
