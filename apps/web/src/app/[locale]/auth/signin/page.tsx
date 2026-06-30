'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const t = useTranslations('auth.signin');
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(t('error'));
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-am-bg px-4 py-10">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <span className="text-5xl">🎾</span>
          <h1 className="mt-3 text-3xl font-extrabold text-white">AceMate</h1>
        </div>

        <div className="rounded-2xl border border-am-border bg-am-surface p-8">
          <h2 className="mb-6 text-xl font-bold text-white">{t('title')}</h2>

          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/60">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/60">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-ace-green py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="font-semibold text-ace-green hover:underline">
              {t('signupLink')}
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
