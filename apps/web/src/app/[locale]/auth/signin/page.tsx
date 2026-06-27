'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const t = useTranslations('auth.signin');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <span className="text-5xl">🎾</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">AceMate</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('title')}</h2>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="font-medium text-green-700 hover:underline">
              {t('signupLink')}
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
