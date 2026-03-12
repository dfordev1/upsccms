import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-uw-blue dark:bg-blue-600 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-uw-navy dark:text-slate-100">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Or{' '}
          <Link to="/login" className="font-medium text-uw-blue dark:text-blue-400 hover:text-uw-blue-hover dark:hover:text-blue-300">
            sign in to your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
          {success ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-400">Registration successful!</h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-500">
                    <p>You can now sign in with your new account.</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/login"
                      className="text-sm font-medium text-uw-blue dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                    >
                      Go to login &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleRegister}>
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-uw-blue dark:focus:ring-blue-500 focus:border-uw-blue dark:focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-uw-blue hover:bg-uw-blue-hover dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uw-blue dark:focus:ring-offset-slate-800 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Creating account...' : 'Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
