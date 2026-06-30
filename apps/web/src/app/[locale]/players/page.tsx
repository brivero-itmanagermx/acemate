'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import PlayerCard from '@/components/PlayerCard';
import type { PlayerSearchResult, FriendshipStatusUI } from '@acemate/types';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PlayersPage() {
  const t      = useTranslations('players');
  const router = useRouter();

  const [userId,  setUserId]  = useState<string | null>(null);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!query.trim() || !userId) { setResults([]); return; }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q:           query,
          requesterId: userId,
          excludeId:   userId,
          limit:       '20',
        });
        const res  = await fetch(`${API}/api/v1/profiles/search?${params}`);
        const data = await res.json() as PlayerSearchResult[];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, userId]);

  function handleFriendshipChange(playerId: string, status: FriendshipStatusUI, id: string | null) {
    setResults(prev =>
      prev.map(p => p.id !== playerId ? p : { ...p, friendshipStatus: status, friendshipId: id })
    );
  }

  return (
    <div className="min-h-screen bg-am-bg">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">{t('title')}</h1>

        <div className="relative mb-6">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-am-border bg-am-surface px-4 py-3 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-ace-green" />
          )}
        </div>

        {userId && (
          <div className="space-y-3">
            {results.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                currentUserId={userId}
                onFriendshipChange={handleFriendshipChange}
              />
            ))}
            {query.trim() && !loading && results.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">{t('noResults')}</p>
            )}
            {!query.trim() && (
              <div className="py-16 text-center">
                <div className="mb-3 text-4xl">🔍</div>
                <p className="text-sm text-white/40">{t('searchPrompt')}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
