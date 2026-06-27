'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import FriendshipButton from './FriendshipButton';
import type { FriendshipStatusUI } from '@acemate/types';

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'text-blue-600 bg-blue-50 border-blue-100',
  intermediate: 'text-green-600 bg-green-50 border-green-100',
  advanced:     'text-orange-600 bg-orange-50 border-orange-100',
  competitive:  'text-red-600 bg-red-50 border-red-100',
};

export interface PlayerCardData {
  id:               string;
  username:         string;
  full_name:        string | null;
  avatar_url:       string | null;
  level?:           string | null;
  friendshipId?:    string | null;
  friendshipStatus?: FriendshipStatusUI;
}

interface Props {
  player:              PlayerCardData;
  currentUserId:       string;
  onFriendshipChange?: (playerId: string, status: FriendshipStatusUI, id: string | null) => void;
}

export default function PlayerCard({ player, currentUserId, onFriendshipChange }: Props) {
  const t    = useTranslations('players');
  const isSelf = player.id === currentUserId;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* Avatar */}
      <Link href={`/players/${player.id}`} className="shrink-0">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {player.avatar_url
            ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" />
            : <span className="text-xl">🎾</span>}
        </div>
      </Link>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link href={`/players/${player.id}`} className="hover:underline">
          <p className="truncate font-semibold text-gray-900">
            {player.full_name ?? player.username}
          </p>
        </Link>
        <p className="text-xs text-gray-500">@{player.username}</p>
        {player.level && (
          <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[player.level] ?? 'text-gray-600 bg-gray-100 border-gray-200'}`}>
            {t(`level.${player.level}` as 'level.beginner')}
          </span>
        )}
      </div>

      {/* Friendship button — hidden for self */}
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
