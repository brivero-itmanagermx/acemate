'use client';

import { useTranslations } from 'next-intl';

export default function Sidebar() {
  const t = useTranslations('dashboard.sidebar');

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-am-border bg-am-surface p-5" style={{ borderWidth: '0.5px' }}>
        <h3 className="mb-3 text-sm font-semibold text-white/60">⚔️ {t('challenges')}</h3>
        <p className="text-sm text-white/40">{t('challengesEmpty')}</p>
        <p className="mt-2 text-xs italic text-white/25">{t('challengesTease')}</p>
      </div>

      <div className="rounded-xl border border-am-border bg-am-surface p-5" style={{ borderWidth: '0.5px' }}>
        <h3 className="mb-3 text-sm font-semibold text-white/60">🏆 {t('leagues')}</h3>
        <p className="text-sm text-white/40">{t('leaguesTeaser')}</p>
        <div className="mt-3 rounded-lg border border-ace-green/20 bg-ace-green/8 px-3 py-2">
          <p className="text-xs text-ace-green/70">Phase 2 — leagues, draws, and rankings.</p>
        </div>
      </div>
    </div>
  );
}
