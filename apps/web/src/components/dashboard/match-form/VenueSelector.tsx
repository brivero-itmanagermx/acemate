'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface VenueOption {
  id:         string;
  name:       string;
  created_by: string;
}

export interface VenueState {
  venueId:   string | null;
  venueName: string | null;
}

interface Props {
  value:         VenueState;
  onChange:      (v: VenueState) => void;
  currentUserId: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function VenueSelector({ value, onChange, currentUserId }: Props) {
  const t = useTranslations('dashboard.newMatch.venue');

  const [ownVenues, setOwnVenues] = useState<VenueOption[]>([]);
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<VenueOption[]>([]);
  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [creating,  setCreating]  = useState(false);

  // Load user's own venues on mount for quick-select chips
  useEffect(() => {
    fetch(`${API}/api/v1/venues?userId=${currentUserId}&limit=5`)
      .then(r => r.ok ? r.json() : [])
      .then((data: VenueOption[]) => setOwnVenues(data))
      .catch(() => {});
  }, [currentUserId]);

  // Debounced search while typing
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setOpen(false); return; }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, userId: currentUserId, limit: '8' });
        const res  = await fetch(`${API}/api/v1/venues?${params}`);
        const data = (await res.json()) as VenueOption[];
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  function selectVenue(venue: VenueOption) {
    onChange({ venueId: venue.id, venueName: venue.name });
    setQuery('');
    setOpen(false);
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/v1/venues`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, created_by: currentUserId }),
      });
      if (!res.ok) return;
      const venue = (await res.json()) as VenueOption;
      setOwnVenues(prev => [venue, ...prev.filter(v => v.id !== venue.id)].slice(0, 5));
      onChange({ venueId: venue.id, venueName: venue.name });
      setQuery('');
      setOpen(false);
    } catch {
      // Silently fail — user can try again
    } finally {
      setCreating(false);
    }
  }

  // ── Selected state: show badge with clear button ──────────────────────────
  if (value.venueId) {
    return (
      <button
        type="button"
        onClick={() => onChange({ venueId: null, venueName: null })}
        className="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
      >
        <span>📍</span>
        <span className="max-w-[200px] truncate">{value.venueName}</span>
        <span className="ml-1 text-green-500 hover:text-red-500">×</span>
      </button>
    );
  }

  // ── Empty / searching state ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Quick-select chips: user's own venues */}
      {ownVenues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ownVenues.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVenue(v)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-green-400 hover:bg-green-50 hover:text-green-800"
            >
              📍 {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || query.trim()) && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        )}

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {results.map(v => (
              <button
                key={v.id}
                type="button"
                onMouseDown={() => selectVenue(v)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-green-50"
              >
                <span className="text-gray-400">📍</span>
                <span className="flex-1 font-medium text-gray-900">{v.name}</span>
                {v.created_by === currentUserId && (
                  <span className="text-xs text-gray-400">{t('yours')}</span>
                )}
              </button>
            ))}

            {/* Create new venue */}
            {query.trim() && (
              <button
                type="button"
                onMouseDown={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
              >
                <span className="text-base font-bold">+</span>
                <span>{creating ? t('creating') : t('addNew', { name: query.trim() })}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
