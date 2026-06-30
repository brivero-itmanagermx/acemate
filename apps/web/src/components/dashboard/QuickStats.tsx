'use client';

import { useTranslations } from 'next-intl';

interface Props {
  total:  number;
  wins:   number;
  streak: number;
}

export default function QuickStats({ total, wins, streak }: Props) {
  const t = useTranslations('dashboard.stats');

  return (
    <div className="grid grid-cols-3 divide-x divide-[#2a2a2a] overflow-hidden rounded-xl border border-[#2a2a2a] bg-am-card" style={{ borderWidth: '0.5px' }}>
      {([
        { key: 'totalMatches', value: total,                              color: 'text-white'     },
        { key: 'wins',         value: wins,                               color: 'text-ace-green' },
        { key: 'streak',       value: streak > 0 ? `${streak}W` : '—',   color: 'text-ace-green' },
      ] as const).map(({ key, value, color }) => (
        <div key={key} className="py-5 text-center">
          <div className={`text-[28px] font-extrabold leading-none ${color}`}>{value}</div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
            {t(key)}
          </div>
        </div>
      ))}
    </div>
  );
}
