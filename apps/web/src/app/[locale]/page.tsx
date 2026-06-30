'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import GrassHeader from '@/components/GrassHeader';

export default function HomePage() {
  const t = useTranslations('home');
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        setHasSession(false);
      }
    });
  }, [router]);

  if (hasSession !== false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-am-bg">
      {/* Grass hero */}
      <GrassHeader height="h-72">
        <div className="flex flex-col items-start gap-1 pb-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎾</span>
            <span className="text-4xl font-extrabold tracking-tight text-white">AceMate</span>
          </div>
          <p className="text-base font-medium text-white/80">{t('tagline')}</p>
        </div>
      </GrassHeader>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 text-center">
          <p className="text-base text-white/60">{t('description')}</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/signup"
              className="w-full rounded-lg bg-ace-green py-3 text-center text-base font-bold text-[#1a1a1a] transition-opacity hover:opacity-90"
            >
              {t('getStarted')}
            </Link>
            <Link
              href="/auth/signin"
              className="w-full rounded-lg border border-ace-green py-3 text-center text-base font-semibold text-ace-green transition-colors hover:bg-ace-green/10"
            >
              {t('signIn')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
