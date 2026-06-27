'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { MatchFeedItem, PlayerSummary } from '@acemate/types';

const SURFACE: Record<string, { emoji: string; label: string; color: string }> = {
  clay:   { emoji: '🟤', label: 'clay',   color: 'text-amber-700 bg-amber-50 border-amber-200'  },
  hard:   { emoji: '🔵', label: 'hard',   color: 'text-blue-700 bg-blue-50 border-blue-200'     },
  grass:  { emoji: '🟢', label: 'grass',  color: 'text-green-700 bg-green-50 border-green-200'  },
  indoor: { emoji: '🏠', label: 'indoor', color: 'text-gray-700 bg-gray-100 border-gray-200'    },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function Avatar({ player, fallback }: { player: PlayerSummary | null; fallback: string }) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs">
      {player?.avatar_url
        ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
        : fallback}
    </div>
  );
}

interface Props {
  match:         MatchFeedItem;
  currentUserId: string;
  onAce:         () => void;
}

export default function MatchCard({ match, currentUserId, onAce }: Props) {
  const t = useTranslations('dashboard.matchCard');

  const isHome      = match.player_home_id === currentUserId;
  const surface     = match.surface ? SURFACE[match.surface] : null;
  const myPlayer    = isHome ? match.homePlayer : match.awayPlayer;
  const theirPlayer = isHome ? match.awayPlayer : match.homePlayer;

  const iWon    = match.winner_id === currentUserId;
  const theyWon = !!match.winner_id && match.winner_id !== currentUserId;

  const mySets    = match.sets.map(s => isHome ? s.home : s.away);
  const theirSets = match.sets.map(s => isHome ? s.away : s.home);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Meta bar */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50/80 border-b border-gray-100">
        {surface && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${surface.color}`}>
            {surface.emoji} {t(`surface.${surface.label}` as `surface.${typeof surface.label}`)}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{formatDate(match.played_at)}</span>
        {match.location_name && (
          <span className="text-xs text-gray-400 truncate max-w-[120px]">· {match.location_name}</span>
        )}
      </div>

      {/* Score grid */}
      <div className="px-5 pt-4 pb-3">
        {match.sets.length > 0 && (
          <div className="flex items-center mb-1.5">
            <div className="flex-1" />
            {match.sets.map((_, i) => (
              <div key={i} className="w-8 text-center text-xs text-gray-400 font-medium">
                S{i + 1}
              </div>
            ))}
          </div>
        )}

        {/* My row */}
        <div className={`flex items-center gap-2 py-1 ${iWon ? 'text-gray-900' : 'text-gray-500'}`}>
          <Avatar player={myPlayer} fallback="🎾" />
          {myPlayer ? (
            <Link
              href={`/players/${myPlayer.id}`}
              className={`flex-1 text-sm truncate hover:underline ${iWon ? 'font-semibold' : ''}`}
            >
              {myPlayer.full_name ?? myPlayer.username}
              {iWon && <span className="ml-1.5 text-xs text-green-600">🏆</span>}
            </Link>
          ) : (
            <span className={`flex-1 text-sm truncate ${iWon ? 'font-semibold' : ''}`}>
              You{iWon && <span className="ml-1.5 text-xs text-green-600">🏆</span>}
            </span>
          )}
          {mySets.map((score, i) => (
            <div key={i} className={`w-8 text-center text-sm ${iWon ? 'font-bold' : ''}`}>
              {score}
            </div>
          ))}
        </div>

        {/* Their row */}
        <div className={`flex items-center gap-2 py-1 ${theyWon ? 'text-gray-900' : 'text-gray-500'}`}>
          <Avatar player={theirPlayer} fallback="👤" />
          {theirPlayer ? (
            <Link
              href={`/players/${theirPlayer.id}`}
              className={`flex-1 text-sm truncate hover:underline ${theyWon ? 'font-semibold' : ''}`}
            >
              {theirPlayer.full_name ?? theirPlayer.username}
              {theyWon && <span className="ml-1.5 text-xs text-green-600">🏆</span>}
            </Link>
          ) : (
            <span className={`flex-1 text-sm truncate ${theyWon ? 'font-semibold' : ''}`}>
              {match.opponent_name ?? '?'}
              {theyWon && <span className="ml-1.5 text-xs text-green-600">🏆</span>}
              <span className="ml-1 text-xs text-gray-400">({t('guest')})</span>
            </span>
          )}
          {theirSets.map((score, i) => (
            <div key={i} className={`w-8 text-center text-sm ${theyWon ? 'font-bold' : ''}`}>
              {score}
            </div>
          ))}
        </div>

        {match.sets.length === 0 && (
          <p className="text-sm text-gray-400 italic py-1">No score recorded</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-50">
        <button
          type="button"
          onClick={onAce}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
            match.userHasAced
              ? 'border-green-400 bg-green-100 text-green-800'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
          }`}
        >
          <span>🎾</span>
          <span>{t('ace')}</span>
          {match.aceCount > 0 && (
            <span className={`font-semibold ${match.userHasAced ? 'text-green-700' : 'text-gray-500'}`}>
              {match.aceCount}
            </span>
          )}
        </button>

        {!match.winner_id && (
          <span className="text-xs rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-600">
            {t('pending')}
          </span>
        )}
      </div>
    </div>
  );
}
