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

  useEffect(() => {
    fetch(`${API}/api/v1/venues?userId=${currentUserId}&limit=5`)
      .then(r => r.ok ? r.json() : [])
      .then((data: VenueOption[]) => setOwnVenues(data))
      .catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setOpen(false); return; }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, userId: currentUserId, limit: '8' });
        const data   = await fetch(`${API}/api/v1/venues?${params}`).then(r => r.json()) as VenueOption[];
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
      const venue = await res.json() as VenueOption;
      setOwnVenues(prev => [venue, ...prev.filter(v => v.id !== venue.id)].slice(0, 5));
      onChange({ venueId: venue.id, venueName: venue.name });
      setQuery('');
      setOpen(false);
    } catch {
      // Silently fail — user can retry
    } finally {
      setCreating(false);
    }
  }

  if (value.venueId) {
    return (
      <button
        type="button"
        onClick={() => onChange({ venueId: null, venueName: null })}
        className="inline-flex items-center gap-2 rounded-xl border border-ace-green/30 bg-ace-green/10 px-4 py-2.5 text-sm font-medium text-ace-green transition-colors hover:border-ace-green/50 hover:bg-ace-green/15"
      >
        <span>📍</span>
        <span className="max-w-[200px] truncate">{value.venueName}</span>
        <span className="ml-1 text-ace-green/50 hover:text-red-400">×</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {ownVenues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ownVenues.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVenue(v)}
              className="rounded-lg border border-am-border bg-am-card px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:border-ace-green/40 hover:bg-ace-green/8 hover:text-ace-green"
            >
              📍 {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || query.trim()) && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-ace-green" />
        )}

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-am-border bg-[#1e1e1e] shadow-xl">
            {results.map(v => (
              <button
                key={v.id}
                type="button"
                onMouseDown={() => selectVenue(v)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-ace-green/10"
              >
                <span className="text-white/40">📍</span>
                <span className="flex-1 font-medium text-white">{v.name}</span>
                {v.created_by === currentUserId && (
                  <span className="text-xs text-white/30">{t('yours')}</span>
                )}
              </button>
            ))}

            {query.trim() && (
              <button
                type="button"
                onMouseDown={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2 border-t border-am-border px-4 py-3 text-left text-sm font-semibold text-ace-green transition-colors hover:bg-ace-green/10 disabled:opacity-50"
              >
                <span className="text-base">+</span>
                <span>{creating ? t('creating') : t('addNew', { name: query.trim() })}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
