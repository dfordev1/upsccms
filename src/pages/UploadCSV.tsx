import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { QuestionInsert } from '../types';

export default function UploadCSV() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          if (data.length === 0) {
            throw new Error('The CSV file is empty');
          }

          // Validate headers
          const requiredHeaders = [
            'exam_year', 'paper_number', 'question_number', 'stem', 'difficulty',
            'explanation', 'educational_objective', 'subject', 'system', 'topic',
            'subtopic', 'choice_1', 'choice_2', 'choice_3', 'choice_4', 'correct_answer',
            'choice_1_explanation', 'choice_2_explanation', 'choice_3_explanation', 'choice_4_explanation'
          ];

          const missingHeaders = requiredHeaders.filter(
            header => !Object.keys(data[0]).includes(header)
          );

          if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
          }

          // Map and insert data in batches
          const batchSize = 500; // Firestore batch limit is 500
          let insertedCount = 0;

          for (let i = 0; i < data.length; i += batchSize) {
            const batch = writeBatch(db);
            const currentBatchData = data.slice(i, i + batchSize);
            
            currentBatchData.forEach(row => {
              const newDocRef = doc(collection(db, 'questions'));
              batch.set(newDocRef, {
                user_id: user.uid,
                exam_year: parseInt(row.exam_year) || null,
                paper_number: row.paper_number,
                question_number: parseInt(row.question_number) || null,
                stem: row.stem,
                difficulty: row.difficulty?.toLowerCase() || 'medium',
                explanation: row.explanation,
                educational_objective: row.educational_objective,
                subject: row.subject,
                system: row.system,
                topic: row.topic,
                subtopic: row.subtopic,
                choice_1: row.choice_1,
                choice_2: row.choice_2,
                choice_3: row.choice_3,
                choice_4: row.choice_4,
                correct_answer: parseInt(row.correct_answer) || 1,
                choice_1_explanation: row.choice_1_explanation,
                choice_2_explanation: row.choice_2_explanation,
                choice_3_explanation: row.choice_3_explanation,
                choice_4_explanation: row.choice_4_explanation,
                created_at: new Date().toISOString()
              });
            });

            await batch.commit();

            insertedCount += currentBatchData.length;
            setProgress(Math.round((insertedCount / data.length) * 100));
          }

          setSuccess(`Successfully uploaded ${insertedCount} questions!`);
          setFile(null);
          // Reset file input
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
        } catch (err: any) {
          setError(err.message || 'An error occurred during upload');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
        setLoading(false);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-uw-navy">Upload Questions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV file containing your UPSC CMS questions.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <div className="flex text-sm text-slate-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-uw-blue hover:text-uw-blue focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-slate-500">CSV files only</p>
            </div>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-indigo-500 mr-3" />
                <span className="text-sm font-medium text-slate-900">{file.name}</span>
                <span className="ml-2 text-xs text-slate-500">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              <button
                onClick={() => setFile(null)}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )}

          {loading && (
            <div className="mt-6">
              <div className="flex justify-between text-sm font-medium text-slate-900 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className="bg-uw-blue h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-uw-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                (!file || loading) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="-ml-1 mr-2 h-5 w-5" />
                  Upload Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4">CSV Format Requirements</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your CSV file must include the following headers exactly as written:
        </p>
        <div className="bg-slate-50 rounded-md p-4 overflow-x-auto">
          <code className="text-xs text-slate-800 whitespace-nowrap">
            exam_year,paper_number,question_number,stem,difficulty,explanation,educational_objective,subject,system,topic,subtopic,choice_1,choice_2,choice_3,choice_4,correct_answer,choice_1_explanation,choice_2_explanation,choice_3_explanation,choice_4_explanation
          </code>
        </div>
      </div>
    </div>
  );
}
