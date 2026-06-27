'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import MatchCard from './MatchCard';
import type { MatchFeedItem } from '@acemate/types';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  initialMatches: MatchFeedItem[];
  currentUserId:  string;
}

export default function MatchFeed({ initialMatches, currentUserId }: Props) {
  const t = useTranslations('dashboard.feed');
  const [matches, setMatches] = useState(initialMatches);

  async function handleAce(matchId: string) {
    const original = matches.find(m => m.id === matchId);
    if (!original) return;

    // Optimistic update
    setMatches(prev => prev.map(m =>
      m.id !== matchId ? m : {
        ...m,
        userHasAced: !m.userHasAced,
        aceCount:     m.userHasAced ? m.aceCount - 1 : m.aceCount + 1,
      }
    ));

    try {
      await fetch(`${API}/api/v1/matches/${matchId}/react`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: currentUserId }),
      });
    } catch {
      // Revert to original on network error
      setMatches(prev => prev.map(m => m.id !== matchId ? m : original));
    }
  }

  if (matches.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <div className="text-4xl">📋</div>
        <p className="mt-3 text-sm">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('title')}</h2>
      {matches.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          currentUserId={currentUserId}
          onAce={() => handleAce(match.id)}
        />
      ))}
    </div>
  );
}
