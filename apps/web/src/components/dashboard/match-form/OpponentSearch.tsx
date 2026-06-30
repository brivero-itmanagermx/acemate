'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface ProfileResult {
  id:          string;
  username:    string;
  full_name:   string | null;
  avatar_url:  string | null;
}

export interface OpponentState {
  isGuest:     boolean;
  playerId:    string | null;
  displayName: string;
  avatarUrl:   string | null;
  guestEmail:  string;
}

interface Props {
  value:      OpponentState;
  onChange:   (v: OpponentState) => void;
  excludeId?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function OpponentSearch({ value, onChange, excludeId }: Props) {
  const t = useTranslations('dashboard.newMatch.opponent');

  const [query,   setQuery]   = useState(value.isGuest ? '' : value.displayName);
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  function switchToGuest() {
    onChange({ isGuest: true, playerId: null, displayName: '', avatarUrl: null, guestEmail: '' });
    setQuery(''); setResults([]); setOpen(false);
  }

  function switchToSearch() {
    onChange({ isGuest: false, playerId: null, displayName: '', avatarUrl: null, guestEmail: '' });
    setQuery('');
  }

  function selectPlayer(player: ProfileResult) {
    const name = player.full_name ?? player.username;
    onChange({ ...value, isGuest: false, playerId: player.id, displayName: name, avatarUrl: player.avatar_url });
    setQuery(name);
    setOpen(false);
  }

  useEffect(() => {
    if (value.isGuest || query.length < 2) {
      setResults([]); setOpen(false); return;
    }
    if (value.playerId && query === value.displayName) return;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: '6' });
        if (excludeId) params.set('excludeId', excludeId);
        const res  = await fetch(`${API}/api/v1/profiles/search?${params}`);
        const data = await res.json() as ProfileResult[];
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, value.isGuest, value.playerId, value.displayName, excludeId]);

  if (value.isGuest) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/50">{t('guestLabel')}</span>
          <button type="button" onClick={switchToSearch}
            className="text-xs font-semibold text-ace-green hover:underline">
            {t('switchToSearch')}
          </button>
        </div>
        <input
          type="text"
          placeholder={t('guestName')}
          value={value.displayName}
          onChange={e => onChange({ ...value, displayName: e.target.value })}
          className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
          required
        />
        <input
          type="email"
          placeholder={t('guestEmail')}
          value={value.guestEmail}
          onChange={e => onChange({ ...value, guestEmail: e.target.value })}
          className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (value.playerId) onChange({ ...value, playerId: null, displayName: '', avatarUrl: null });
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-ace-green" />
          )}
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-am-border bg-[#1e1e1e] shadow-xl">
              {results.map(player => (
                <button
                  key={player.id}
                  type="button"
                  onMouseDown={() => selectPlayer(player)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ace-green/10"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ace-green/20 text-sm">
                    {player.avatar_url
                      ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" />
                      : <span className="text-ace-green">🎾</span>}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {player.full_name ?? player.username}
                    </div>
                    <div className="text-xs text-white/40">@{player.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={switchToGuest}
          className="shrink-0 rounded-lg border border-am-border px-3 py-2.5 text-xs font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/80"
        >
          {t('switchToGuest')}
        </button>
      </div>

      {value.playerId && (
        <p className="mt-1.5 text-xs font-semibold text-ace-green">✓ {t('selected', { name: value.displayName })}</p>
      )}
    </div>
  );
}
