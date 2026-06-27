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
  guestEmail:  string;
}

interface Props {
  value:     OpponentState;
  onChange:  (v: OpponentState) => void;
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
    onChange({ isGuest: true, playerId: null, displayName: '', guestEmail: '' });
    setQuery(''); setResults([]); setOpen(false);
  }

  function switchToSearch() {
    onChange({ isGuest: false, playerId: null, displayName: '', guestEmail: '' });
    setQuery('');
  }

  function selectPlayer(player: ProfileResult) {
    const name = player.full_name ?? player.username;
    onChange({ ...value, isGuest: false, playerId: player.id, displayName: name });
    setQuery(name);
    setOpen(false);
  }

  useEffect(() => {
    if (value.isGuest || query.length < 2) {
      setResults([]); setOpen(false); return;
    }
    // Don't search if the current query matches an already-selected player
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
          <span className="text-sm font-medium text-gray-600">{t('guestLabel')}</span>
          <button type="button" onClick={switchToSearch}
            className="text-xs text-green-700 hover:underline">
            {t('switchToSearch')}
          </button>
        </div>
        <input
          type="text"
          placeholder={t('guestName')}
          value={value.displayName}
          onChange={e => onChange({ ...value, displayName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          required
        />
        <input
          type="email"
          placeholder={t('guestEmail')}
          value={value.guestEmail}
          onChange={e => onChange({ ...value, guestEmail: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
              // Clear selection when user types again
              if (value.playerId) onChange({ ...value, playerId: null, displayName: '' });
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          )}
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {results.map(player => (
                <button
                  key={player.id}
                  type="button"
                  onMouseDown={() => selectPlayer(player)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-green-50 transition-colors"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {player.avatar_url
                      ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" />
                      : '🎾'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {player.full_name ?? player.username}
                    </div>
                    <div className="text-xs text-gray-500">@{player.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={switchToGuest}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('switchToGuest')}
        </button>
      </div>

      {value.playerId && (
        <p className="mt-1.5 text-xs text-green-600">✓ {t('selected', { name: value.displayName })}</p>
      )}
    </div>
  );
}
