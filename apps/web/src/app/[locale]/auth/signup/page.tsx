'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

type Feedback = { kind: 'error' | 'info'; message: string };

export default function SignUpPage() {
  const t = useTranslations('auth.signup');
  const router = useRouter();

  const [fields,   setFields]   = useState({ username: '', fullName: '', email: '', password: '' });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading,  setLoading]  = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
          username:  fields.username.toLowerCase().trim(),
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
      setFeedback({ kind: 'info', message: t('confirmEmail') });
      return;
    }

    router.push('/onboarding');
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

          {feedback && (
            <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              feedback.kind === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : 'border-ace-green/30 bg-ace-green/10 text-ace-green'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-white/60">
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
                  className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
                />
              </div>
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-white/60">
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
                  className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/60">
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
                className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/60">
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
                className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 transition focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
              />
              <p className="mt-1.5 text-xs text-white/30">{t('passwordHint')}</p>
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
            {t('hasAccount')}{' '}
            <Link href="/auth/signin" className="font-semibold text-ace-green hover:underline">
              {t('signinLink')}
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
