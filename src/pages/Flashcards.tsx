import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Question, TestSession } from '../types';
import { Layers, ChevronRight, ChevronLeft, RotateCcw, Trash2 } from 'lucide-react';

interface Flashcard {
  id: string;
  question_id: string;
  user_id: string;
  front: string;
  back: string;
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
  const [viewMode, setViewMode] = useState<'study' | 'manage'>('study');

  useEffect(() => {
    fetchData();
  }, [user]);

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
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uw-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-uw-navy">Flashcards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your custom flashcards and create new ones from incorrect questions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={() => setViewMode('study')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'study' 
                ? 'bg-uw-blue text-white' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Study Mode
          </button>
          <button
            onClick={() => setViewMode('manage')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'manage' 
                ? 'bg-uw-blue text-white' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Manage & Create
          </button>
        </div>
      </div>

      {viewMode === 'study' ? (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center">
          {flashcards.length === 0 ? (
            <div className="text-center text-slate-500">
              <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p>You don't have any flashcards yet.</p>
              <button 
                onClick={() => setViewMode('manage')}
                className="mt-4 text-uw-blue hover:underline"
              >
                Go create some from your incorrect questions
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <div className="mb-4 flex justify-between text-sm text-slate-500 font-medium">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <button 
                  onClick={() => deleteFlashcard(flashcards[currentIndex].id)}
                  className="text-red-500 hover:text-red-700 flex items-center"
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
                  <div className="absolute w-full h-full backface-hidden bg-white border-2 border-uw-blue rounded-xl p-8 flex items-center justify-center text-center shadow-md">
                    <div>
                      <span className="absolute top-4 left-4 text-xs font-bold text-uw-blue uppercase tracking-wider">Front</span>
                      <p className="text-lg font-medium text-uw-navy">{flashcards[currentIndex].front}</p>
                    </div>
                  </div>
                  
                  {/* Back */}
                  <div className="absolute w-full h-full backface-hidden bg-blue-50 border-2 border-uw-blue rounded-xl p-8 flex items-center justify-center text-center shadow-md rotate-y-180 overflow-y-auto">
                    <div>
                      <span className="absolute top-4 left-4 text-xs font-bold text-uw-blue uppercase tracking-wider">Back</span>
                      <p className="text-base text-uw-navy">{flashcards[currentIndex].back}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center items-center space-x-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); prevCard(); }}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                  className="flex items-center px-6 py-3 bg-uw-blue text-white rounded-full font-medium hover:bg-uw-blue-hover transition-colors shadow-sm"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Flip Card
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCard(); }}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incorrect Questions Panel */}
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-uw-navy">Incorrect Questions</h2>
              <p className="text-xs text-slate-500">Create flashcards from questions you missed.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {incorrectQuestions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No incorrect questions found.</p>
                  <p className="text-sm mt-1">Take some tests to generate data!</p>
                </div>
              ) : (
                incorrectQuestions.map(q => {
                  const hasCard = flashcards.some(f => f.question_id === q.id);
                  return (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-4 hover:border-uw-blue transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Incorrect
                        </span>
                        <span className="text-xs text-slate-500">{q.subject}</span>
                      </div>
                      <p className="text-sm font-medium text-uw-navy mb-3 line-clamp-2">{q.stem}</p>
                      <button
                        onClick={() => createFlashcard(q)}
                        disabled={hasCard}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          hasCard ? 'bg-slate-300 cursor-not-allowed' : 'bg-uw-blue hover:bg-uw-blue-hover'
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
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-uw-navy">Your Flashcards ({flashcards.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {flashcards.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No flashcards yet.</p>
                </div>
              ) : (
                flashcards.map(f => (
                  <div key={f.id} className="border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-uw-navy truncate">{f.front}</p>
                    </div>
                    <button
                      onClick={() => deleteFlashcard(f.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
