'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FriendshipStatusUI } from '@acemate/types';

interface Props {
  initialStatus:       FriendshipStatusUI;
  initialFriendshipId: string | null;
  targetUserId:        string;
  currentUserId:       string;
  onStatusChange?:     (status: FriendshipStatusUI, id: string | null) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function FriendshipButton({
  initialStatus,
  initialFriendshipId,
  targetUserId,
  currentUserId,
  onStatusChange,
}: Props) {
  const t = useTranslations('friendship');

  const [status,       setStatus]       = useState<FriendshipStatusUI>(initialStatus);
  const [friendshipId, setFriendshipId] = useState<string | null>(initialFriendshipId);
  const [loading,      setLoading]      = useState(false);

  function apply(newStatus: FriendshipStatusUI, newId: string | null) {
    setStatus(newStatus);
    setFriendshipId(newId);
    onStatusChange?.(newStatus, newId);
  }

  async function sendRequest() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/friendships`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requester_id: currentUserId, receiver_id: targetUserId }),
      });
      if (res.ok) {
        const data = await res.json() as { id: string };
        apply('pending_sent', data.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function respond(newStatus: 'accepted' | 'rejected') {
    if (!friendshipId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/friendships/${friendshipId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        apply(newStatus === 'accepted' ? 'accepted' : 'none', newStatus === 'accepted' ? friendshipId : null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!friendshipId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/friendships/${friendshipId}`, { method: 'DELETE' });
      if (res.ok) apply('none', null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-am-border border-t-ace-green" />
      </div>
    );
  }

  switch (status) {
    case 'none':
      return (
        <button
          type="button"
          onClick={sendRequest}
          className="rounded-lg border border-ace-green/50 px-3 py-1.5 text-xs font-semibold text-ace-green transition-colors hover:border-ace-green hover:bg-ace-green/10"
        >
          {t('add')}
        </button>
      );

    case 'pending_sent':
      return (
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-rally-orange/30 bg-rally-orange/10 px-3 py-1 text-xs font-medium text-rally-orange">
            {t('pending')}
          </span>
          <button
            type="button"
            onClick={remove}
            className="text-xs text-white/30 transition-colors hover:text-red-400"
          >
            {t('cancel')}
          </button>
        </div>
      );

    case 'pending_received':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond('accepted')}
            className="rounded-lg bg-ace-green px-3 py-1.5 text-xs font-bold text-[#1a1a1a] transition-opacity hover:opacity-90"
          >
            {t('accept')}
          </button>
          <button
            type="button"
            onClick={() => respond('rejected')}
            className="rounded-lg border border-am-border px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/70"
          >
            {t('reject')}
          </button>
        </div>
      );

    case 'accepted':
      return (
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-ace-green/30 bg-ace-green/10 px-3 py-1 text-xs font-medium text-ace-green">
            {t('friends')} ✓
          </span>
          <button
            type="button"
            onClick={remove}
            className="text-xs text-white/30 transition-colors hover:text-red-400"
          >
            {t('remove')}
          </button>
        </div>
      );
  }
}
