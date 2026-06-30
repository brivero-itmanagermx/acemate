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
      <div className="mb-1 flex items-center gap-3 text-[11px] font-medium text-white/35">
        <div className="w-14" />
        <div className="w-16 text-center">{t('you')}</div>
        <div className="w-4" />
        <div className="w-16 text-center">{t('opponent')}</div>
      </div>

      {sets.map((set, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-medium text-white/40">
            {t('set', { n: i + 1 })}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            value={set.home}
            onChange={e => update(i, 'home', e.target.value)}
            className="w-16 rounded-lg border border-am-border bg-am-card px-2 py-2 text-center text-sm font-semibold text-white focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
            placeholder="0"
          />
          <span className="w-4 text-center font-medium text-white/30">—</span>
          <input
            type="number"
            min={0}
            max={99}
            value={set.away}
            onChange={e => update(i, 'away', e.target.value)}
            className="w-16 rounded-lg border border-am-border bg-am-card px-2 py-2 text-center text-sm font-semibold text-white focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
            placeholder="0"
          />
          {sets.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(sets.filter((_, j) => j !== i))}
              className="ml-1 text-xs text-white/25 transition-colors hover:text-red-400"
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
          className="text-sm font-semibold text-ace-green hover:underline"
        >
          {t('addSet')}
        </button>
      )}
    </div>
  );
}
