import React, { useState } from 'react';
import { 
  Bot, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        const res = await api.signUp(name.trim(), email.trim(), password);
        onAuthSuccess(res.user);
      } else {
        const res = await api.signIn(email.trim(), password);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    const demoEmail = 'agent@continuo.ai';
    const demoPassword = 'password123';
    const demoName = 'Continuo Support Lead';

    try {
      // First try signing in
      try {
        const res = await api.signIn(demoEmail, demoPassword);
        onAuthSuccess(res.user);
        return;
      } catch (signInErr: any) {
        // If not found, automatically register the demo user
        const res = await api.signUp(demoName, demoEmail, demoPassword);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/20 text-white font-bold mx-auto mb-2 relative">
            <Bot className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">CONTINUO</h1>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AI Support
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            The AI Support Agent That Remembers. Persistent customer memory powered by Hindsight & Groq.
          </p>
        </div>

        {/* Card Container */}
        <div className="p-7 rounded-3xl bg-[#0f172a]/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Quick Demo Access CTA */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-indigo-950/60 hover:from-emerald-900/60 hover:to-indigo-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>1-Click Hackathon Demo Login</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-[#0f172a] px-3 text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">
              or continue with email
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="agent@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-500 block mt-1">Must be at least 6 characters</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/60 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to Continuo' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & Feature Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Isolated Tenants</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hindsight Memory</span>
          </span>
        </div>
      </div>
    </div>
  );
};
