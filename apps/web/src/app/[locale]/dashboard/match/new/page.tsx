'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import MatchForm    from '@/components/dashboard/match-form/MatchForm';

export default function NewMatchPage() {
  const t      = useTranslations('dashboard.newMatch');
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);
    });
  }, [router]);

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-am-bg">
      <header className="border-b border-am-border bg-am-bg px-4 py-4 sticky top-0 z-10" style={{ borderBottomWidth: '0.5px' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            ← {t('back')}
          </Link>
          <h1 className="text-base font-semibold text-white">{t('title')}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <MatchForm currentUserId={userId} />
      </main>
    </div>
  );
}
