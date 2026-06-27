'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Props {
  userName: string | null;
}

export default function EmptyState({ userName }: Props) {
  const t = useTranslations('dashboard.empty');

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="text-7xl mb-6">🎾</div>
      <h1 className="text-3xl font-bold text-gray-900">
        {t('title', { name: userName ?? 'there' })}
      </h1>
      <p className="mt-3 text-lg text-gray-500 max-w-md">{t('subtitle')}</p>
      <p className="mt-2 text-sm text-gray-400 max-w-sm">{t('description')}</p>
      <Link
        href="/dashboard/match/new"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green-700 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-green-800"
      >
        <span>+</span> {t('cta')}
      </Link>
    </div>
  );
}
