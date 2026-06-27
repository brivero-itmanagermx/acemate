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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← {t('back')}
          </Link>
          <h1 className="text-base font-semibold text-gray-900">{t('title')}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <MatchForm currentUserId={userId} />
      </main>
    </div>
  );
}
