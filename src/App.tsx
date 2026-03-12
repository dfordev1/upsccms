import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuestionBank from './pages/QuestionBank';
import UploadCSV from './pages/UploadCSV';
import CreateTest from './pages/CreateTest';
import TestInterface from './pages/TestInterface';
import TestHistory from './pages/TestHistory';
import Analytics from './pages/Analytics';
import Flashcards from './pages/Flashcards';
import PYQAnalysis from './pages/PYQAnalysis';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Full screen test interface */}
            <Route path="/test/:id" element={<ProtectedRoute><TestInterface /></ProtectedRoute>} />

            {/* Layout wrapped routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="questions" element={<QuestionBank />} />
              <Route path="upload" element={<UploadCSV />} />
              <Route path="test/create" element={<CreateTest />} />
              <Route path="test/history" element={<TestHistory />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="flashcards" element={<Flashcards />} />
              <Route path="pyq-analysis" element={<PYQAnalysis />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
