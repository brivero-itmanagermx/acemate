'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import PlayerCard from '@/components/PlayerCard';
import type {
  FriendEntry,
  FriendRequest,
  SentRequest,
  FriendshipStatusUI,
} from '@acemate/types';

type Tab = 'friends' | 'received' | 'sent';

const API = process.env.NEXT_PUBLIC_API_URL;

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mb-3 text-4xl">🎾</div>
      <p className="text-sm text-white/40">{message}</p>
    </div>
  );
}

export default function FriendsPage() {
  const t      = useTranslations('friends');
  const router = useRouter();

  const [userId,   setUserId]   = useState<string | null>(null);
  const [tab,      setTab]      = useState<Tab>('friends');
  const [friends,  setFriends]  = useState<FriendEntry[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent,     setSent]     = useState<SentRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);

      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        fetch(`${API}/api/v1/friendships?userId=${user.id}`),
        fetch(`${API}/api/v1/friendships/requests?userId=${user.id}`),
        fetch(`${API}/api/v1/friendships/sent?userId=${user.id}`),
      ]);

      if (friendsRes.ok)  setFriends(await friendsRes.json());
      if (requestsRes.ok) setReceived(await requestsRes.json());
      if (sentRes.ok)     setSent(await sentRes.json());
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-am-bg">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'friends',  label: t('tabs.friends'),  count: friends.length  },
    { key: 'received', label: t('tabs.received'), count: received.length },
    { key: 'sent',     label: t('tabs.sent'),     count: sent.length     },
  ];

  return (
    <div className="min-h-screen bg-am-bg">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">{t('title')}</h1>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl bg-am-surface p-1 border border-am-border" style={{ borderWidth: '0.5px' }}>
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-am-card text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  tab === key
                    ? 'bg-ace-green/15 text-ace-green'
                    : 'bg-white/8 text-white/40'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends tab */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0
              ? <EmptyTab message={t('noFriends')} />
              : friends.map(entry => (
                  <PlayerCard
                    key={entry.id}
                    player={{ ...entry.friend, friendshipStatus: 'accepted', friendshipId: entry.id }}
                    currentUserId={userId!}
                    onFriendshipChange={(_, status: FriendshipStatusUI) => {
                      if (status === 'none') setFriends(prev => prev.filter(f => f.id !== entry.id));
                    }}
                  />
                ))}
          </div>
        )}

        {/* Received tab */}
        {tab === 'received' && (
          <div className="space-y-3">
            {received.length === 0
              ? <EmptyTab message={t('noPending')} />
              : received.map(entry => (
                  <PlayerCard
                    key={entry.id}
                    player={{ ...entry.requester, friendshipStatus: 'pending_received', friendshipId: entry.id }}
                    currentUserId={userId!}
                    onFriendshipChange={() => {
                      setReceived(prev => prev.filter(r => r.id !== entry.id));
                    }}
                  />
                ))}
          </div>
        )}

        {/* Sent tab */}
        {tab === 'sent' && (
          <div className="space-y-3">
            {sent.length === 0
              ? <EmptyTab message={t('noSent')} />
              : sent.map(entry => (
                  <PlayerCard
                    key={entry.id}
                    player={{ ...entry.receiver, friendshipStatus: 'pending_sent', friendshipId: entry.id }}
                    currentUserId={userId!}
                    onFriendshipChange={() => {
                      setSent(prev => prev.filter(s => s.id !== entry.id));
                    }}
                  />
                ))}
          </div>
        )}
      </main>
    </div>
  );
}
