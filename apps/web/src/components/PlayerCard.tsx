'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import FriendshipButton from './FriendshipButton';
import type { FriendshipStatusUI } from '@acemate/types';

const LEVEL_CHIP: Record<string, string> = {
  beginner:     'border-blue-500/30  bg-blue-500/10  text-blue-400',
  intermediate: 'border-ace-green/30 bg-ace-green/10 text-ace-green',
  advanced:     'border-rally-orange/30 bg-rally-orange/10 text-rally-orange',
  competitive:  'border-red-500/30   bg-red-500/10   text-red-400',
};

export interface PlayerCardData {
  id:                string;
  username:          string;
  full_name:         string | null;
  avatar_url:        string | null;
  level?:            string | null;
  friendshipId?:     string | null;
  friendshipStatus?: FriendshipStatusUI;
}

interface Props {
  player:              PlayerCardData;
  currentUserId:       string;
  onFriendshipChange?: (playerId: string, status: FriendshipStatusUI, id: string | null) => void;
}

export default function PlayerCard({ player, currentUserId, onFriendshipChange }: Props) {
  const t      = useTranslations('players');
  const isSelf = player.id === currentUserId;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-am-border bg-am-surface p-4" style={{ borderWidth: '0.5px' }}>
      <Link href={`/players/${player.id}`} className="shrink-0">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ace-green/15 text-xl font-bold text-ace-green">
          {player.avatar_url
            ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" />
            : <span>🎾</span>}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/players/${player.id}`} className="hover:underline">
          <p className="truncate font-semibold text-white">
            {player.full_name ?? player.username}
          </p>
        </Link>
        <p className="text-xs text-white/40">@{player.username}</p>
        {player.level && (
          <span className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_CHIP[player.level] ?? 'border-white/10 bg-white/5 text-white/40'}`}>
            {t(`level.${player.level}` as 'level.beginner')}
          </span>
        )}
      </div>

      {!isSelf && (
        <div className="shrink-0">
          <FriendshipButton
            initialStatus={player.friendshipStatus ?? 'none'}
            initialFriendshipId={player.friendshipId ?? null}
            targetUserId={player.id}
            currentUserId={currentUserId}
            onStatusChange={(status, id) => onFriendshipChange?.(player.id, status, id)}
          />
        </div>
      )}
    </div>
  );
}
