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
    <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {([
        { key: 'totalMatches', value: total                         },
        { key: 'wins',         value: wins                          },
        { key: 'streak',       value: streak > 0 ? `${streak}W` : '—' },
      ] as const).map(({ key, value }) => (
        <div key={key} className="py-5 text-center">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            {t(key)}
          </div>
        </div>
      ))}
    </div>
  );
}
