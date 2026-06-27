'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

type Feedback = { kind: 'error' | 'info'; message: string };

export default function SignUpPage() {
  const t = useTranslations('auth.signup');
  const router = useRouter();

  const [fields, setFields] = useState({ username: '', fullName: '', email: '', password: '' });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        data: {
          username: fields.username.toLowerCase().trim(),
          full_name: fields.fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (authError) {
      setFeedback({ kind: 'error', message: authError.message });
      return;
    }

    if (!data.session) {
      // Supabase requires email confirmation — user is not immediately signed in
      setFeedback({ kind: 'info', message: t('confirmEmail') });
      return;
    }

    // Email confirmation disabled — user is immediately authenticated
    router.push('/onboarding');
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

          {feedback && (
            <div
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
                feedback.kind === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('username')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={fields.username}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('fullName')}
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={fields.fullName}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={fields.email}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                value={fields.password}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <p className="mt-1.5 text-xs text-gray-400">{t('passwordHint')}</p>
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
            {t('hasAccount')}{' '}
            <Link href="/auth/signin" className="font-medium text-green-700 hover:underline">
              {t('signinLink')}
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
