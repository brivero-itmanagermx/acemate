'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { supabase }  from '@/lib/supabase';
import Navbar        from '@/components/Navbar';
import EmptyState    from '@/components/dashboard/EmptyState';
import QuickStats    from '@/components/dashboard/QuickStats';
import MatchFeed     from '@/components/dashboard/MatchFeed';
import Sidebar       from '@/components/dashboard/Sidebar';
import type { Profile, MatchFeedItem } from '@acemate/types';

const API = process.env.NEXT_PUBLIC_API_URL;

function computeStats(matches: MatchFeedItem[], userId: string) {
  const total     = matches.length;
  const confirmed = matches.filter(m => m.status === 'confirmed');
  const wins      = confirmed.filter(m => m.winner_id === userId).length;

  let streak = 0;
  for (const m of [...confirmed].sort((a, b) =>
    new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  )) {
    if (m.winner_id === userId) streak++;
    else break;
  }

  return { total, wins, streak };
}

export default function DashboardPage() {
  const router = useRouter();

  const [userId,  setUserId]  = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/signin'); return; }

      setUserId(user.id);

      const [profileRes, matchesRes] = await Promise.all([
        fetch(`${API}/api/v1/profiles/${user.id}`),
        fetch(`${API}/api/v1/matches?userId=${user.id}&requesterId=${user.id}`),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (matchesRes.ok) setMatches(await matchesRes.json());
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const displayName = profile?.fullName ?? profile?.username ?? null;
  const { total, wins, streak } = computeStats(matches, userId ?? '');
  const hasMatches = matches.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!hasMatches ? (
          <EmptyState userName={displayName} />
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">My matches</h2>
              <Link
                href="/dashboard/match/new"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
              >
                + Register match
              </Link>
            </div>

            <QuickStats total={total} wins={wins} streak={streak} />

            <div className="mt-6 lg:grid lg:grid-cols-3 lg:gap-6">
              <div className="lg:col-span-2">
                <MatchFeed
                  initialMatches={matches}
                  currentUserId={userId ?? ''}
                />
              </div>
              <div className="mt-6 lg:mt-0">
                <Sidebar />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile FAB */}
      <Link
        href="/dashboard/match/new"
        aria-label="Register match"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-2xl font-bold text-white shadow-lg transition-colors hover:bg-green-800 sm:hidden"
      >
        +
      </Link>
    </div>
  );
}
