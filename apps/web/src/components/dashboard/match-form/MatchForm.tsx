'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import SetsInput,      { type SetItem }       from './SetsInput';
import OpponentSearch, { type OpponentState } from './OpponentSearch';
import VenueSelector,  { type VenueState }    from './VenueSelector';

const SURFACES = ['clay', 'hard', 'grass', 'indoor'] as const;
const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

function toDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const API = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  currentUserId: string;
}

export default function MatchForm({ currentUserId }: Props) {
  const t      = useTranslations('dashboard.newMatch');
  const router = useRouter();

  const [opponent,     setOpponent]     = useState<OpponentState>({ isGuest: false, playerId: null, displayName: '', guestEmail: '' });
  const [sets,         setSets]         = useState<SetItem[]>([{ home: '', away: '' }]);
  const [surface,  setSurface]  = useState('');
  const [venue,    setVenue]    = useState<VenueState>({ venueId: null, venueName: null });
  const [playedAt, setPlayedAt] = useState(toDatetimeLocal(new Date()));
  const [winner,       setWinner]       = useState<'home' | 'away' | null>(null);
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const isValid =
    (opponent.isGuest && opponent.displayName.trim().length > 0) ||
    (!opponent.isGuest && !!opponent.playerId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    const parsedSets = sets
      .filter(s => s.home !== '' || s.away !== '')
      .map(s => ({ home: Number(s.home) || 0, away: Number(s.away) || 0 }));

    const body = {
      player_home_id:  currentUserId,
      player_away_id:  opponent.isGuest ? null : opponent.playerId,
      opponent_name:   opponent.isGuest ? opponent.displayName.trim() : null,
      opponent_email:  opponent.isGuest && opponent.guestEmail.trim() ? opponent.guestEmail.trim() : null,
      sets:            parsedSets,
      surface:    surface || null,
      venue_id:   venue.venueId   ?? null,
      played_at:  new Date(playedAt).toISOString(),
      winner,
      notes:           notes.trim() || null,
    };

    try {
      const res = await fetch(`${API}/api/v1/matches`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? 'Something went wrong');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Opponent */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('opponent.label')}
        </h3>
        <OpponentSearch value={opponent} onChange={setOpponent} excludeId={currentUserId} />
      </section>

      {/* Score */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('sets.label')}
          <span className="ml-2 normal-case font-normal text-gray-400">
            ({t('sets.you')} — {t('sets.opponent')})
          </span>
        </h3>
        <SetsInput sets={sets} onChange={setSets} />
      </section>

      {/* Surface */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('surface')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {SURFACES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSurface(surface === s ? '' : s)}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                surface === s
                  ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-500'
                  : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              {SURFACE_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Date */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('playedAt')}
        </label>
        <input
          type="datetime-local"
          required
          value={playedAt}
          onChange={e => setPlayedAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Venue */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('venue.label')}
        </h3>
        <VenueSelector value={venue} onChange={setVenue} currentUserId={currentUserId} />
      </section>

      {/* Winner */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('winner.label')}
        </h3>
        <div className="flex gap-2">
          {(['home', 'away', null] as const).map(val => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setWinner(winner === val ? null : val)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                winner === val
                  ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-500'
                  : 'border-gray-200 text-gray-600 hover:border-green-300'
              }`}
            >
              {val === 'home' ? t('winner.me') : val === 'away' ? t('winner.opponent') : t('winner.none')}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t('notes')}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
