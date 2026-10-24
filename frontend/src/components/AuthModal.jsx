import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  isSupabaseConfigured,
} from '../utils/supabaseClient';

export default function AuthModal({ isOpen, onClose, theme = 'zen' }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onClose();
      } else {
        await signUpWithEmail(email, password, fullName);
        setSuccessMsg('Account created successfully! Check your email to verify, or sign in.');
        setMode('signin');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setErrorMsg(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setErrorMsg(err.message || `Failed to sign in with ${provider}.`);
    }
  };

  const themeClasses = {
    zen: {
      card: 'bg-white border-[#DDE5D9] text-[#142217]',
      input: 'bg-[#F3F6F1] border-[#DDE5D9] text-[#142217] focus:border-emerald-500',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    paper: {
      card: 'bg-white border-[#E7E2DA] text-[#1C1917]',
      input: 'bg-[#FAF7F2] border-[#E7E2DA] text-[#1C1917] focus:border-amber-500',
      buttonPrimary: 'bg-amber-600 hover:bg-amber-500 text-white',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    purple: {
      card: 'bg-white border-[#E9E3F5] text-[#1E162A]',
      input: 'bg-[#F8F6FC] border-[#E9E3F5] text-[#1E162A] focus:border-purple-500',
      buttonPrimary: 'bg-purple-600 hover:bg-purple-500 text-white',
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    dark: {
      card: 'bg-[#111827] border-[#1F293D] text-slate-100',
      input: 'bg-[#0B0F17] border-[#1F293D] text-slate-200 focus:border-emerald-500',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
    },
  }[theme] || {
    card: 'bg-white border-[#DDE5D9] text-[#142217]',
    input: 'bg-[#F3F6F1] border-[#DDE5D9] text-[#142217] focus:border-emerald-500',
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-2xl ${themeClasses.card}`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${themeClasses.badge}`}>
              Personal Cloud Vault
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Save interview prep notes, gotchas, and practice tasks permanently to your private cloud vault.
          </p>
        </div>

        {/* Supabase Not Configured Warning Banner */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Supabase Setup Needed</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Add your <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> to <code className="font-mono">.env</code> to activate cloud auth.
            </p>
          </div>
        )}

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={!isSupabaseConfigured}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={!isSupabaseConfigured}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* GitHub SVG */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-black/10 dark:border-white/10 w-full" />
          <span className="absolute px-3 bg-white dark:bg-[#111827] text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            or with email
          </span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none transition ${themeClasses.input}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none transition ${themeClasses.input}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none transition ${themeClasses.input}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.buttonPrimary}`}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Vault' : 'Create Free Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-5 pt-3 border-t border-black/5 dark:border-white/5 text-center">
          {mode === 'signin' ? (
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Sign up for free
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

