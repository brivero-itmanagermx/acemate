'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { MatchFeedItem, PlayerSummary } from '@acemate/types';

const SURFACE: Record<string, { emoji: string; label: string }> = {
  clay:   { emoji: '🟤', label: 'clay'   },
  hard:   { emoji: '🔵', label: 'hard'   },
  grass:  { emoji: '🟢', label: 'grass'  },
  indoor: { emoji: '🏠', label: 'indoor' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({
  player,
  guestName,
  winner,
  small = false,
}: {
  player:    PlayerSummary | null;
  guestName?: string | null;
  winner:    boolean;
  small?:    boolean;
}) {
  const name = player?.full_name ?? player?.username ?? guestName;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${
      small ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
    } ${winner ? 'bg-ace-green text-[#1a1a1a]' : 'bg-[#2e2e2e] text-white/45'}`}>
      {player?.avatar_url
        ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" />
        : <span>{initials(name)}</span>}
    </div>
  );
}

function PlayerName({
  player,
  guestName,
  winner,
  guestLabel,
}: {
  player:     PlayerSummary | null;
  guestName:  string | null;
  winner:     boolean;
  guestLabel: string;
}) {
  const name    = player?.full_name ?? player?.username ?? guestName ?? '?';
  const classes = winner
    ? 'text-sm font-bold text-white truncate leading-tight'
    : 'text-sm font-medium text-white/50 truncate leading-tight';

  if (player) {
    return (
      <Link href={`/players/${player.id}`} className={`${classes} hover:underline`}>
        {name}
      </Link>
    );
  }
  return (
    <span className={classes}>
      {name}
      {!player && guestName && (
        <span className="ml-1 text-xs text-white/25">({guestLabel})</span>
      )}
    </span>
  );
}

interface Props {
  match:         MatchFeedItem;
  currentUserId: string;
  onAce:         () => void;
}

export default function MatchCard({ match, currentUserId, onAce }: Props) {
  const t = useTranslations('dashboard.matchCard');

  const isDoubles = match.match_type === 'doubles';
  const isHome    = match.player_home_id === currentUserId || match.player_home2_id === currentUserId;
  const surface   = match.surface ? SURFACE[match.surface] : null;

  const homeWon = !!match.winner_id && match.winner_id === match.player_home_id;
  const awayWon = !!match.winner_id && match.winner_id === match.player_away_id;
  const iWon    = isHome ? homeWon : awayWon;
  const theyWon = isHome ? awayWon : homeWon;

  const mySets    = match.sets.map(s => isHome ? s.home : s.away);
  const theirSets = match.sets.map(s => isHome ? s.away : s.home);

  const myPlayer1    = isHome ? match.homePlayer  : match.awayPlayer;
  const myPlayer2    = isHome ? match.homePlayer2 : match.awayPlayer2;
  const myGuest1     = isHome ? null : (match.opponent_name ?? null);
  const myGuest2     = isHome ? (match.partner_name ?? null) : (match.opponent2_name ?? null);

  const theirPlayer1 = isHome ? match.awayPlayer  : match.homePlayer;
  const theirPlayer2 = isHome ? match.awayPlayer2 : match.homePlayer2;
  const theirGuest1  = isHome ? (match.opponent_name ?? null) : null;
  const theirGuest2  = isHome ? (match.opponent2_name ?? null) : (match.partner_name ?? null);

  const guestLabel = t('guest');
  const hasSets    = match.sets.length > 0;

  // Avatar column width: 32px singles / 24px (stacked) doubles
  const avatarColClass = isDoubles ? 'w-6 shrink-0' : 'w-8 shrink-0';
  // Divider indentation: avatar col + gap = 24+12=36px (doubles) or 32+12=44px (singles)
  const dividerIndent  = isDoubles ? 'ml-9' : 'ml-10';

  return (
    <div className="overflow-hidden rounded-xl border border-[#333] bg-am-surface" style={{ borderWidth: '0.5px' }}>

      {/* Meta bar */}
      <div className="flex items-center gap-2 border-b border-[#333] px-4 py-2" style={{ borderBottomWidth: '0.5px' }}>
        {isDoubles && (
          <span className="rounded-full bg-ace-green/15 px-2.5 py-0.5 text-[11px] font-semibold text-ace-green">
            {t('doubles')}
          </span>
        )}
        {surface && (
          <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-white/55">
            {surface.emoji} {t(`surface.${surface.label}` as `surface.${typeof surface.label}`)}
          </span>
        )}
        <span className="ml-auto text-[11px] text-white/35">{formatDate(match.played_at)}</span>
        {match.location_name && (
          <span className="max-w-[110px] truncate text-[11px] text-white/35">· {match.location_name}</span>
        )}
      </div>

      {/* Score grid */}
      <div className="px-4 pt-3.5 pb-3">

        {/* Column headers (S1, S2…) — only when there are sets */}
        {hasSets && (
          <div className="mb-1 flex items-center gap-3">
            <div className={avatarColClass} />
            <div className="flex-1" />
            {match.sets.map((_, i) => (
              <div key={i} className="w-8 shrink-0 text-center text-[11px] font-medium text-white/30">
                S{i + 1}
              </div>
            ))}
            <div className="w-16 shrink-0" />
          </div>
        )}

        {/* My team */}
        <div className={`flex gap-3 py-1.5 ${isDoubles ? 'items-start' : 'items-center'}`}>
          {/* Avatar(s) — stacked vertically for doubles */}
          <div className={`${avatarColClass} ${isDoubles ? 'flex flex-col gap-1 pt-0.5' : 'flex'}`}>
            <Avatar player={myPlayer1} guestName={myGuest1} winner={iWon} small={isDoubles} />
            {isDoubles && (
              <Avatar player={myPlayer2} guestName={myGuest2} winner={iWon} small />
            )}
          </div>

          {/* Name(s) */}
          <div className={`flex min-w-0 flex-1 flex-col ${isDoubles ? 'gap-2 pt-0.5' : ''}`}>
            <PlayerName player={myPlayer1} guestName={myGuest1} winner={iWon} guestLabel={guestLabel} />
            {isDoubles && (
              <PlayerName player={myPlayer2} guestName={myGuest2} winner={iWon} guestLabel={guestLabel} />
            )}
          </div>

          {/* Set scores */}
          {mySets.map((score, i) => (
            <div
              key={i}
              className={`w-8 shrink-0 text-center text-xl ${isDoubles ? 'self-center' : ''} ${
                iWon ? 'font-extrabold text-white' : 'font-medium text-white/28'
              }`}
            >
              {score}
            </div>
          ))}

          {/* Result badge */}
          <div className={`w-16 shrink-0 text-right ${isDoubles ? 'self-center' : ''}`}>
            {iWon ? (
              <span className="inline-block rounded-full bg-ace-green/18 px-2.5 py-0.5 text-xs font-semibold text-ace-green">
                {t('won')}
              </span>
            ) : theyWon ? (
              <span className="inline-block rounded-full bg-white/8 px-2.5 py-0.5 text-xs font-medium text-white/50">
                {t('lost')}
              </span>
            ) : null}
          </div>
        </div>

        {/* Divider */}
        <div className={`${dividerIndent} border-t border-[#333]`} style={{ borderTopWidth: '0.5px' }} />

        {/* Their team */}
        <div className={`flex gap-3 py-1.5 ${isDoubles ? 'items-start' : 'items-center'}`}>
          <div className={`${avatarColClass} ${isDoubles ? 'flex flex-col gap-1 pt-0.5' : 'flex'}`}>
            <Avatar player={theirPlayer1} guestName={theirGuest1} winner={theyWon} small={isDoubles} />
            {isDoubles && (
              <Avatar player={theirPlayer2} guestName={theirGuest2} winner={theyWon} small />
            )}
          </div>

          <div className={`flex min-w-0 flex-1 flex-col ${isDoubles ? 'gap-2 pt-0.5' : ''}`}>
            <PlayerName player={theirPlayer1} guestName={theirGuest1} winner={theyWon} guestLabel={guestLabel} />
            {isDoubles && (
              <PlayerName player={theirPlayer2} guestName={theirGuest2} winner={theyWon} guestLabel={guestLabel} />
            )}
          </div>

          {theirSets.map((score, i) => (
            <div
              key={i}
              className={`w-8 shrink-0 text-center text-xl ${isDoubles ? 'self-center' : ''} ${
                theyWon ? 'font-extrabold text-white' : 'font-medium text-white/28'
              }`}
            >
              {score}
            </div>
          ))}

          <div className={`w-16 shrink-0 text-right ${isDoubles ? 'self-center' : ''}`}>
            {theyWon && (
              <span className="inline-block rounded-full bg-ace-green/18 px-2.5 py-0.5 text-xs font-semibold text-ace-green">
                {t('won')}
              </span>
            )}
          </div>
        </div>

        {!hasSets && (
          <p className="py-1 text-sm italic text-white/30">No score recorded</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-[#333] px-4 py-2.5" style={{ borderTopWidth: '0.5px' }}>
        <button
          type="button"
          onClick={onAce}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all active:scale-95 ${
            match.userHasAced
              ? 'border border-rally-orange bg-rally-orange/18 text-rally-orange'
              : 'border border-[#333] bg-transparent text-white/50 hover:border-rally-orange hover:bg-rally-orange/10 hover:text-rally-orange'
          }`}
          style={{ borderWidth: '1.5px' }}
        >
          <span>🎾</span>
          <span>{t('ace')}</span>
          {match.aceCount > 0 && (
            <span className={match.userHasAced ? 'text-rally-orange' : 'text-white/40'}>
              {match.aceCount}
            </span>
          )}
        </button>

        {!match.winner_id && (
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/40" style={{ borderWidth: '0.5px' }}>
            {t('pending')}
          </span>
        )}
      </div>
    </div>
  );
}
