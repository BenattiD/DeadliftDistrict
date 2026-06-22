import React, { useState } from 'react';
import { account } from '../lib/appwrite';
import { Dumbbell, Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate form inputs
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // According to specifications: handle via Appwrite Web SDK: account.createEmailPasswordSession()
      await account.createEmailPasswordSession(email, password);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Authentication failed. Please check your qualifications and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden">
      {/* Dynamic Background Element */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      <div id="login-card" className="w-full max-w-md bg-zinc-90 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div id="login-icon-box" className="p-4 bg-emerald-500/15 rounded-2xl border border-emerald-500/30 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-display text-zinc-100 tracking-tight">
            Workout Tracker
          </h1>
          <p className="text-zinc-400 text-sm mt-2 text-center">
            Sign in to access your workout metrics and session dashboard
          </p>
        </div>

        {error && (
          <div id="login-error-alert" className="mb-6 p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-3 text-red-300 text-sm leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Authentication Error</p>
              <p className="text-red-350">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Mail className="w-5 h-5" />
              </span>
              <input
                id="login-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="login-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm disabled:opacity-50"
                required
              />
            </div>
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full mt-2 font-semibold bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Submit Credentials
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/50 pt-6">
          <p className="text-xs text-zinc-500 font-mono">
            ENDPOINTID: ...v1 • PROJECTID: 681723df
          </p>
        </div>
      </div>
    </div>
  );
}
