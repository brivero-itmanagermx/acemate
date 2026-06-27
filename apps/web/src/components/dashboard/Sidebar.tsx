'use client';

import { useTranslations } from 'next-intl';

export default function Sidebar() {
  const t = useTranslations('dashboard.sidebar');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">⚔️ {t('challenges')}</h3>
        <p className="text-sm text-gray-500">{t('challengesEmpty')}</p>
        <p className="mt-2 text-xs text-gray-400 italic">{t('challengesTease')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 {t('leagues')}</h3>
        <p className="text-sm text-gray-500">{t('leaguesTeaser')}</p>
        <div className="mt-3 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
          <p className="text-xs text-green-700">Phase 2 — leagues, draws, and rankings.</p>
        </div>
      </div>
    </div>
  );
}
