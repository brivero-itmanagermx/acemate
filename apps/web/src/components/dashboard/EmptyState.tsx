'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Props {
  userName: string | null;
}

export default function EmptyState({ userName }: Props) {
  const t = useTranslations('dashboard.empty');

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 text-7xl">🎾</div>
      <h1 className="text-2xl font-bold text-white">
        {t('title', { name: userName ?? 'there' })}
      </h1>
      <p className="mt-3 max-w-md text-base text-white/50">{t('subtitle')}</p>
      <p className="mt-2 max-w-sm text-sm text-white/30">{t('description')}</p>
      <Link
        href="/dashboard/match/new"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-ace-green px-8 py-3.5 text-base font-bold text-[#1a1a1a] transition-opacity hover:opacity-90"
      >
        <span>+</span> {t('cta')}
      </Link>
    </div>
  );
}
