import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question, TestSession } from '../types';
import { Layers, ChevronRight, ChevronLeft, RotateCcw, Trash2, Upload, Play, Pause } from 'lucide-react';
import Papa from 'papaparse';

interface Flashcard {
  id: string;
  question_id?: string;
  user_id: string;
  front?: string;
  back?: string;
  type?: 'hierarchy';
  subject?: string;
  system?: string;
  topic?: string;
  subtopic?: string;
  year?: number;
  count?: number;
  created_at: string;
}

export default function Flashcards() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Flashcard Viewer State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'study' | 'manage' | 'hierarchy'>('study');

  // Hierarchy Flashcard State
  const [hierarchyIndex, setHierarchyIndex] = useState(0);
  const [isHierarchyPlaying, setIsHierarchyPlaying] = useState(false);
  const [hierarchyTimer, setHierarchyTimer] = useState(10); // seconds per card
  const [timeRemaining, setTimeRemaining] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const regularFlashcards = flashcards.filter(f => f.type !== 'hierarchy');
  const hierarchyCards = flashcards.filter(f => f.type === 'hierarchy');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch user's flashcards
        const fQuery = query(collection(db, 'flashcards'), where('user_id', '==', user.uid));
        const fSnap = await getDocs(fQuery);
        const cards = fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Flashcard));
        setFlashcards(cards);

        // 2. Fetch incorrect questions to suggest new flashcards
        const sQuery = query(collection(db, 'test_sessions'), where('user_id', '==', user.uid));
        const sSnap = await getDocs(sQuery);
        const sessions = sSnap.docs.map(d => d.data() as TestSession);

        const incorrectIds = new Set<string>();
        const correctIds = new Set<string>();

        sessions.forEach(session => {
          Object.entries(session.answers || {}).forEach(([qId, answer]) => {
            const question = session.questions?.find(q => q.id === qId);
            if (question) {
              if (question.correct_answer === answer) {
                correctIds.add(qId);
                incorrectIds.delete(qId);
              } else {
                incorrectIds.add(qId);
                correctIds.delete(qId);
              }
            }
          });
        });

        if (incorrectIds.size > 0) {
          // We need to fetch the actual question data for these IDs
          // Since we can't do a 'in' query with more than 10 items easily, we'll fetch all and filter
          const qQuery = query(collection(db, 'questions'));
          const qSnap = await getDocs(qQuery);
          const allQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
          
          const incorrectQs = allQuestions.filter(q => incorrectIds.has(q.id));
          setIncorrectQuestions(incorrectQs);
        } else {
          setIncorrectQuestions([]);
        }

      } catch (error) {
        console.error('Error fetching flashcard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const createFlashcard = async (question: Question) => {
    if (!user) return;
    
    // Check if already exists
    if (flashcards.some(f => f.question_id === question.id)) {
      alert('Flashcard already exists for this question.');
      return;
    }

    try {
      const newCard = {
        question_id: question.id,
        user_id: user.uid,
        front: question.educational_objective || question.stem.substring(0, 100) + '...',
        back: question.explanation || 'No explanation provided.',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'flashcards'), newCard);
      setFlashcards([...flashcards, { id: docRef.id, ...newCard }]);
      alert('Flashcard created successfully!');
    } catch (error) {
      console.error('Error creating flashcard:', error);
      alert('Failed to create flashcard.');
    }
  };

  const deleteFlashcard = async (id: string) => {
    if (!window.confirm('Delete this flashcard?')) return;
    try {
      await deleteDoc(doc(db, 'flashcards', id));
      setFlashcards(flashcards.filter(f => f.id !== id));
      if (currentIndex >= flashcards.length - 1) {
        setCurrentIndex(Math.max(0, flashcards.length - 2));
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % regularFlashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + regularFlashcards.length) % regularFlashcards.length);
  };

  const nextHierarchyCard = React.useCallback(() => {
    setHierarchyIndex((prev) => (prev + 1) % hierarchyCards.length);
    setTimeRemaining(hierarchyTimer);
  }, [hierarchyCards.length, hierarchyTimer]);

  const prevHierarchyCard = () => {
    setHierarchyIndex((prev) => (prev - 1 + hierarchyCards.length) % hierarchyCards.length);
    setTimeRemaining(hierarchyTimer);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHierarchyPlaying && hierarchyCards.length > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            nextHierarchyCard();
            return hierarchyTimer;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isHierarchyPlaying, hierarchyCards.length, hierarchyTimer, nextHierarchyCard]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const batch = writeBatch(db);
          const newCards: Flashcard[] = [];

          results.data.forEach((row: any) => {
            // If the row is a header row, skip it
            if (row[0] === 'Subject' && row[1] === 'System') return;
            
            if (row.length >= 4 && row[0] && row[1] && row[2] && row[3]) {
              const docRef = doc(collection(db, 'flashcards'));
              const cardData = {
                user_id: user.uid,
                type: 'hierarchy' as const,
                subject: row[0],
                system: row[1],
                topic: row[2],
                subtopic: row[3],
                year: parseInt(row[4]) || 0,
                count: parseInt(row[5]) || 0,
                created_at: new Date().toISOString()
              };
              batch.set(docRef, cardData);
              newCards.push({ id: docRef.id, ...cardData });
            }
          });

          await batch.commit();
          setFlashcards(prev => [...prev, ...newCards]);
          alert(`Successfully imported ${newCards.length} hierarchy flashcards!`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
          console.error('Error importing flashcards:', error);
          alert('Failed to import flashcards.');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Failed to parse CSV file.');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-uw-navy dark:text-slate-100">Flashcards</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review your custom flashcards and create new ones from incorrect questions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={() => setViewMode('study')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'study' 
                ? 'bg-uw-blue text-white dark:bg-blue-600' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Study Mode
          </button>
          <button
            onClick={() => setViewMode('manage')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'manage' 
                ? 'bg-uw-blue text-white dark:bg-blue-600' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Manage & Create
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'hierarchy' 
                ? 'bg-uw-blue text-white dark:bg-blue-600' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Hierarchy Mode
          </button>
        </div>
      </div>

      {viewMode === 'study' ? (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 p-8 min-h-[400px] flex flex-col items-center justify-center">
          {regularFlashcards.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400">
              <Layers className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <p>You don't have any regular flashcards yet.</p>
              <button 
                onClick={() => setViewMode('manage')}
                className="mt-4 text-uw-blue dark:text-blue-400 hover:underline"
              >
                Go create some from your incorrect questions
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <div className="mb-4 flex justify-between text-sm text-slate-500 dark:text-slate-400 font-medium">
                <span>Card {currentIndex + 1} of {regularFlashcards.length}</span>
                <button 
                  onClick={() => deleteFlashcard(regularFlashcards[currentIndex].id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </button>
              </div>
              
              <div 
                className="relative w-full h-64 perspective-1000 cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                  {/* Front */}
                  <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border-2 border-uw-blue dark:border-blue-500 rounded-xl p-8 flex items-center justify-center text-center shadow-md overflow-y-auto">
                    <div className="w-full">
                      <span className="absolute top-4 left-4 text-xs font-bold text-uw-blue dark:text-blue-400 uppercase tracking-wider">Front</span>
                      <p className="text-base font-medium text-uw-navy dark:text-slate-100 break-words">{regularFlashcards[currentIndex].front}</p>
                    </div>
                  </div>
                  
                  {/* Back */}
                  <div className="absolute w-full h-full backface-hidden bg-blue-50 dark:bg-slate-700 border-2 border-uw-blue dark:border-blue-500 rounded-xl p-8 flex items-center justify-center text-center shadow-md rotate-y-180 overflow-y-auto">
                    <div className="w-full">
                      <span className="absolute top-4 left-4 text-xs font-bold text-uw-blue dark:text-blue-400 uppercase tracking-wider">Back</span>
                      <p className="text-sm text-uw-navy dark:text-slate-200 break-words">{regularFlashcards[currentIndex].back}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center items-center space-x-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); prevCard(); }}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                  className="flex items-center px-6 py-3 bg-uw-blue dark:bg-blue-600 text-white rounded-full font-medium hover:bg-uw-blue-hover dark:hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Flip Card
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCard(); }}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'manage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incorrect Questions Panel */}
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-semibold text-uw-navy dark:text-slate-100">Incorrect Questions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create flashcards from questions you missed.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {incorrectQuestions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p>No incorrect questions found.</p>
                  <p className="text-sm mt-1">Take some tests to generate data!</p>
                </div>
              ) : (
                incorrectQuestions.map(q => {
                  const hasCard = regularFlashcards.some(f => f.question_id === q.id);
                  return (
                    <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-uw-blue dark:hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                          Incorrect
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{q.subject}</span>
                      </div>
                      <p className="text-sm font-medium text-uw-navy dark:text-slate-200 mb-3 line-clamp-2">{q.stem}</p>
                      <button
                        onClick={() => createFlashcard(q)}
                        disabled={hasCard}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          hasCard ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-uw-blue hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700'
                        }`}
                      >
                        {hasCard ? 'Flashcard Created' : 'Create Flashcard'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Existing Flashcards List */}
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-semibold text-uw-navy dark:text-slate-100">Your Flashcards ({regularFlashcards.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {regularFlashcards.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p>No flashcards yet.</p>
                </div>
              ) : (
                regularFlashcards.map(f => (
                  <div key={f.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-uw-navy dark:text-slate-200 truncate">{f.front}</p>
                    </div>
                    <button
                      onClick={() => deleteFlashcard(f.id)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 p-8 min-h-[400px] flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-uw-navy dark:text-slate-100">Hierarchy Flashcards</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 bg-uw-green text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Upload size={16} className="mr-2" />
                  Import CSV
                </button>
              </div>
            </div>

            {hierarchyCards.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                <Layers className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p>You don't have any hierarchy flashcards yet.</p>
                <p className="text-sm mt-2">Import a CSV file with columns: Subject, System, Topic, Subtopic, Year, Count</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full mb-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsHierarchyPlaying(!isHierarchyPlaying)}
                      className={`flex items-center px-4 py-2 rounded-md font-medium text-white ${isHierarchyPlaying ? 'bg-uw-amber hover:bg-yellow-600' : 'bg-uw-blue hover:bg-blue-600'}`}
                    >
                      {isHierarchyPlaying ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
                      {isHierarchyPlaying ? 'Pause' : 'Play'}
                    </button>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-slate-600 dark:text-slate-400">Timer (s):</label>
                      <input
                        type="number"
                        min="1"
                        value={hierarchyTimer}
                        onChange={(e) => setHierarchyTimer(Math.max(1, parseInt(e.target.value) || 10))}
                        className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Card {hierarchyIndex + 1} of {hierarchyCards.length}
                    </div>
                    {isHierarchyPlaying && (
                      <div className="text-lg font-bold text-uw-blue dark:text-blue-400">
                        {timeRemaining}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Single View Flashcard */}
                <div className="w-full bg-white dark:bg-slate-800 border-2 border-uw-blue dark:border-blue-500 rounded-2xl p-8 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-uw-blue via-blue-400 to-uw-green"></div>
                  
                  <div className="flex flex-col space-y-6">
                    {/* Hierarchy Path */}
                    <div className="flex flex-wrap items-center text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span className="text-uw-blue dark:text-blue-400">{hierarchyCards[hierarchyIndex].subject}</span>
                      <ChevronRight size={16} className="mx-2" />
                      <span className="text-uw-navy dark:text-slate-300">{hierarchyCards[hierarchyIndex].system}</span>
                      <ChevronRight size={16} className="mx-2" />
                      <span className="text-slate-700 dark:text-slate-200">{hierarchyCards[hierarchyIndex].topic}</span>
                    </div>

                    {/* Subtopic Body */}
                    <div className="py-12 my-4 border-t border-b border-slate-100 dark:border-slate-700 flex items-center justify-center min-h-[200px] overflow-hidden">
                      <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-uw-blue via-blue-500 to-uw-green leading-tight text-center drop-shadow-sm break-words w-full px-4">
                        {hierarchyCards[hierarchyIndex].subtopic}
                      </h3>
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                      <span>Year: {hierarchyCards[hierarchyIndex].year || 'N/A'}</span>
                      <span>Count: {hierarchyCards[hierarchyIndex].count || 0}</span>
                      <button 
                        onClick={() => deleteFlashcard(hierarchyCards[hierarchyIndex].id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-center items-center space-x-6">
                  <button 
                    onClick={prevHierarchyCard}
                    className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button 
                    onClick={nextHierarchyCard}
                    className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
