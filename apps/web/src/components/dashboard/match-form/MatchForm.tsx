'use client';

import { useState, useEffect } from 'react';
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

const EMPTY_OPPONENT: OpponentState = {
  isGuest: false, playerId: null, displayName: '', avatarUrl: null, guestEmail: '',
};

interface NudgeOpponent {
  id:        string;
  name:      string;
  avatarUrl: string | null;
}
type NudgeState = 'idle' | 'sending' | 'sent';

interface SuccessData {
  nudgeOpponent: NudgeOpponent | null;
}

interface Props {
  currentUserId: string;
}

// ── Friend-nudge card ──────────────────────────────────────────────────────────
function FriendNudge({
  opponent,
  currentUserId,
  onDone,
}: {
  opponent:      NudgeOpponent;
  currentUserId: string;
  onDone:        () => void;
}) {
  const t = useTranslations('dashboard.newMatch.nudge');
  const [nudgeState, setNudgeState] = useState<NudgeState>('idle');

  useEffect(() => {
    if (nudgeState !== 'sent') return;
    const id = setTimeout(onDone, 2000);
    return () => clearTimeout(id);
  }, [nudgeState, onDone]);

  async function handleAddFriend() {
    setNudgeState('sending');
    try {
      await fetch(`${API}/api/v1/friendships`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requester_id: currentUserId, receiver_id: opponent.id }),
      });
      setNudgeState('sent');
    } catch {
      setNudgeState('idle');
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-ace-green/20 bg-ace-green/8 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ace-green/20 text-base">
          {opponent.avatarUrl
            ? <img src={opponent.avatarUrl} className="h-full w-full object-cover" alt="" />
            : <span className="text-ace-green">🎾</span>}
        </div>
        <p className="flex-1 text-sm text-white/70">
          {t('prompt', { name: opponent.name })}
        </p>
      </div>

      {nudgeState === 'sent' ? (
        <p className="mt-3 text-center text-sm font-medium text-ace-green">{t('sent')}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={nudgeState === 'sending'}
            onClick={handleAddFriend}
            className="flex-1 rounded-xl bg-ace-green py-2 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {nudgeState === 'sending' ? '…' : t('addFriend')}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-xl border border-am-border py-2 text-sm font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/80"
          >
            {t('maybeLater')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessScreen({
  data,
  currentUserId,
}: {
  data:          SuccessData;
  currentUserId: string;
}) {
  const t      = useTranslations('dashboard.newMatch');
  const router = useRouter();

  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const showNudge = !!data.nudgeOpponent && !nudgeDismissed;

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ace-green/15 text-3xl">
        ✅
      </div>
      <h2 className="text-xl font-bold text-white">{t('successTitle')}</h2>
      <p className="mt-1 text-sm text-white/50">{t('successSubtitle')}</p>

      {showNudge && (
        <div className="mt-4 w-full max-w-sm">
          <FriendNudge
            opponent={data.nudgeOpponent!}
            currentUserId={currentUserId}
            onDone={() => {
              setNudgeDismissed(true);
              router.push('/dashboard');
            }}
          />
        </div>
      )}

      {!showNudge && (
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-8 rounded-xl bg-ace-green px-8 py-3 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90"
        >
          {t('goToDashboard')}
        </button>
      )}
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────
export default function MatchForm({ currentUserId }: Props) {
  const t      = useTranslations('dashboard.newMatch');
  const router = useRouter();

  const [matchType,  setMatchType]  = useState<'singles' | 'doubles'>('singles');
  const [partner,    setPartner]    = useState<OpponentState>(EMPTY_OPPONENT);
  const [opponent,   setOpponent]   = useState<OpponentState>(EMPTY_OPPONENT);
  const [opponent2,  setOpponent2]  = useState<OpponentState>(EMPTY_OPPONENT);
  const [sets,       setSets]       = useState<SetItem[]>([{ home: '', away: '' }]);
  const [surface,    setSurface]    = useState('');
  const [venue,      setVenue]      = useState<VenueState>({ venueId: null, venueName: null });
  const [playedAt,   setPlayedAt]   = useState(toDatetimeLocal(new Date()));
  const [winner,     setWinner]     = useState<'home' | 'away' | null>(null);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<SuccessData | null>(null);

  const isDoubles = matchType === 'doubles';

  const opponentValid =
    (opponent.isGuest && opponent.displayName.trim().length > 0) ||
    (!opponent.isGuest && !!opponent.playerId);

  const partnerValid =
    !isDoubles ||
    (partner.isGuest && partner.displayName.trim().length > 0) ||
    (!partner.isGuest && !!partner.playerId);

  const opponent2Valid =
    !isDoubles ||
    (opponent2.isGuest && opponent2.displayName.trim().length > 0) ||
    (!opponent2.isGuest && !!opponent2.playerId);

  const isValid = opponentValid && partnerValid && opponent2Valid;

  function handleTypeChange(type: 'singles' | 'doubles') {
    setMatchType(type);
    if (type === 'singles') {
      setPartner(EMPTY_OPPONENT);
      setOpponent2(EMPTY_OPPONENT);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    const parsedSets = sets
      .filter(s => s.home !== '' || s.away !== '')
      .map(s => ({ home: Number(s.home) || 0, away: Number(s.away) || 0 }));

    const body: Record<string, unknown> = {
      match_type:     matchType,
      player_home_id: currentUserId,
      player_away_id: opponent.isGuest ? null : opponent.playerId,
      opponent_name:  opponent.isGuest ? opponent.displayName.trim() : null,
      opponent_email: opponent.isGuest && opponent.guestEmail.trim() ? opponent.guestEmail.trim() : null,
      sets:           parsedSets,
      surface:        surface || null,
      venue_id:       venue.venueId ?? null,
      played_at:      new Date(playedAt).toISOString(),
      winner,
      notes:          notes.trim() || null,
    };

    if (isDoubles) {
      body.player_home2_id = partner.isGuest   ? null : partner.playerId;
      body.partner_name    = partner.isGuest   ? partner.displayName.trim()   : null;
      body.partner_email   = partner.isGuest && partner.guestEmail.trim()   ? partner.guestEmail.trim()   : null;
      body.player_away2_id = opponent2.isGuest ? null : opponent2.playerId;
      body.opponent2_name  = opponent2.isGuest ? opponent2.displayName.trim() : null;
      body.opponent2_email = opponent2.isGuest && opponent2.guestEmail.trim() ? opponent2.guestEmail.trim() : null;
    }

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

      let nudgeOpponent: NudgeOpponent | null = null;
      const awayId = opponent.isGuest ? null : opponent.playerId;

      if (awayId) {
        try {
          const fRes = await fetch(
            `${API}/api/v1/friendships/between?userA=${currentUserId}&userB=${awayId}`
          );
          if (fRes.ok) {
            const fd = await fRes.json() as { friendshipStatus: string };
            if (fd.friendshipStatus === 'none') {
              nudgeOpponent = { id: awayId, name: opponent.displayName, avatarUrl: opponent.avatarUrl };
            }
          }
        } catch {
          // Friendship check failed silently — skip nudge
        }
      }

      setSuccess({ nudgeOpponent });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (success) return <SuccessScreen data={success} currentUserId={currentUserId} />;

  const sectionTitle = 'mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/35';
  const inputClass   = 'w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Match type toggle */}
      <section>
        <h3 className={sectionTitle}>{t('matchType.label')}</h3>
        <div className="flex gap-2">
          {(['singles', 'doubles'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                matchType === type
                  ? 'border-ace-green bg-ace-green/10 text-ace-green'
                  : 'border-am-border text-white/50 hover:border-ace-green/40'
              }`}
            >
              {type === 'singles' ? t('matchType.singles') : t('matchType.doubles')}
            </button>
          ))}
        </div>
      </section>

      {/* Partner (doubles only) */}
      {isDoubles && (
        <section>
          <h3 className={sectionTitle}>{t('partner.label')}</h3>
          <OpponentSearch value={partner} onChange={setPartner} excludeId={currentUserId} />
        </section>
      )}

      {/* Opponent */}
      <section>
        <h3 className={sectionTitle}>{isDoubles ? t('opponent.labelDoubles1') : t('opponent.label')}</h3>
        <OpponentSearch value={opponent} onChange={setOpponent} excludeId={currentUserId} />
      </section>

      {/* Opponent 2 (doubles only) */}
      {isDoubles && (
        <section>
          <h3 className={sectionTitle}>{t('opponent.labelDoubles2')}</h3>
          <OpponentSearch value={opponent2} onChange={setOpponent2} excludeId={currentUserId} />
        </section>
      )}

      {/* Score */}
      <section>
        <h3 className={sectionTitle}>
          {t('sets.label')}
          <span className="ml-2 normal-case font-normal text-white/25">
            ({isDoubles ? t('sets.myTeam') : t('sets.you')} — {isDoubles ? t('sets.theirTeam') : t('sets.opponent')})
          </span>
        </h3>
        <SetsInput sets={sets} onChange={setSets} />
      </section>

      {/* Surface */}
      <section>
        <h3 className={sectionTitle}>{t('surface')}</h3>
        <div className="flex flex-wrap gap-2">
          {SURFACES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSurface(surface === s ? '' : s)}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                surface === s
                  ? 'border-ace-green bg-ace-green/10 text-ace-green'
                  : 'border-am-border text-white/50 hover:border-ace-green/40'
              }`}
            >
              {SURFACE_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Date */}
      <div>
        <label className={`block ${sectionTitle}`}>{t('playedAt')}</label>
        <input
          type="datetime-local"
          required
          value={playedAt}
          onChange={e => setPlayedAt(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Venue */}
      <section>
        <h3 className={sectionTitle}>{t('venue.label')}</h3>
        <VenueSelector value={venue} onChange={setVenue} currentUserId={currentUserId} />
      </section>

      {/* Winner */}
      <section>
        <h3 className={sectionTitle}>{t('winner.label')}</h3>
        <div className="flex gap-2">
          {(['home', 'away', null] as const).map(val => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setWinner(winner === val ? null : val)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                winner === val
                  ? 'border-ace-green bg-ace-green/10 text-ace-green'
                  : 'border-am-border text-white/50 hover:border-ace-green/40'
              }`}
            >
              {val === 'home'
                ? (isDoubles ? t('winner.myTeam')    : t('winner.me'))
                : val === 'away'
                  ? (isDoubles ? t('winner.theirTeam') : t('winner.opponent'))
                  : t('winner.none')}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <div>
        <label className={`block ${sectionTitle}`}>{t('notes')}</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-am-border pt-5">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-am-border px-5 py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/80"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="rounded-lg bg-ace-green px-6 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
