'use client';

import { useTranslations } from 'next-intl';

export interface SetItem {
  home: string;
  away: string;
}

interface Props {
  sets:     SetItem[];
  onChange: (sets: SetItem[]) => void;
}

export default function SetsInput({ sets, onChange }: Props) {
  const t = useTranslations('dashboard.newMatch.sets');

  function update(index: number, field: 'home' | 'away', value: string) {
    if (value !== '' && !/^\d{0,2}$/.test(value)) return;
    onChange(sets.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs font-medium text-gray-400 mb-1">
        <div className="w-14" />
        <div className="w-16 text-center">{t('you')}</div>
        <div className="w-4" />
        <div className="w-16 text-center">{t('opponent')}</div>
      </div>

      {sets.map((set, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-14 text-xs font-medium text-gray-500 shrink-0">
            {t('set', { n: i + 1 })}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            value={set.home}
            onChange={e => update(i, 'home', e.target.value)}
            className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm font-medium focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="0"
          />
          <span className="w-4 text-center text-gray-400 font-medium">—</span>
          <input
            type="number"
            min={0}
            max={99}
            value={set.away}
            onChange={e => update(i, 'away', e.target.value)}
            className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm font-medium focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="0"
          />
          {sets.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(sets.filter((_, j) => j !== i))}
              className="ml-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              aria-label={t('remove')}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {sets.length < 5 && (
        <button
          type="button"
          onClick={() => onChange([...sets, { home: '', away: '' }])}
          className="text-sm font-medium text-green-700 hover:underline"
        >
          {t('addSet')}
        </button>
      )}
    </div>
  );
}
