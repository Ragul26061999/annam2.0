import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmail } from '../lib/supabase';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await signInWithEmail(email, password);
      
      if (error) {
        setError(error.message || 'Failed to sign in');
        return;
      }

      if (data?.user) {
        onLogin();
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left side with Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 sm:p-12">
        <div className="max-w-md w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Log In</h1>
          <p className="text-gray-500 mb-8">Please enter your credentials to access your account.</p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                placeholder="doctor@annam.com"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
{loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>

      {/* Right side with Gradient and Logo */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-orange-400 to-orange-600 p-12 text-white">
        <div className="max-w-md w-full text-center">
          <img 
            src="/images/logo.png" 
            alt="Annam Hospital Logo" 
            className="h-28 w-auto mx-auto mb-8 bg-white p-4 rounded-full shadow-2xl"
          />
          <p className="text-lg text-white">
            Streamlining healthcare management for better patient outcomes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;