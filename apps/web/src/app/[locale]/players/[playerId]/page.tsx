'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams }        from 'next/navigation';
import { useTranslations }  from 'next-intl';
import { Link }             from '@/i18n/navigation';
import { supabase }         from '@/lib/supabase';
import { useRouter }        from '@/i18n/navigation';
import Navbar               from '@/components/Navbar';
import FriendshipButton     from '@/components/FriendshipButton';
import type {
  Profile,
  ProfileStats,
  ProfileMatchItem,
  ProfileMatchesResponse,
  FriendshipStatusUI,
} from '@acemate/types';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Constants ────────────────────────────────────────────────────────────────

const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced:     'bg-purple-100 text-purple-800',
  competitive:  'bg-orange-100 text-orange-800',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MatchCardProps {
  match:     ProfileMatchItem;
  profileId: string;
  th:        ReturnType<typeof useTranslations>;
}

function ProfileMatchCard({ match, profileId, th }: MatchCardProps) {
  const iWon  = match.winner_id === profileId;
  const iLost = match.winner_id !== null && match.winner_id !== profileId;

  const opponentDisplayName =
    match.opponent?.full_name ?? match.opponent?.username ?? match.opponent_name ?? th('guest');

  const myScore  = (s: { home: number; away: number }) => match.is_home ? s.home : s.away;
  const oppScore = (s: { home: number; away: number }) => match.is_home ? s.away : s.home;

  return (
    <div className="flex items-start gap-3 border-b border-gray-50 py-3.5 last:border-0">
      {/* Surface */}
      <span className="mt-0.5 text-xl">
        {SURFACE_EMOJI[match.surface ?? ''] ?? '🎾'}
      </span>

      {/* Opponent + score */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {match.opponent?.avatar_url && (
            <img
              src={match.opponent.avatar_url}
              className="h-5 w-5 shrink-0 rounded-full object-cover"
              alt=""
            />
          )}
          {match.opponent ? (
            <Link
              href={`/players/${match.opponent.id}`}
              className="truncate text-sm font-medium text-gray-800 hover:underline"
            >
              {th('vs')} {opponentDisplayName}
            </Link>
          ) : (
            <span className="truncate text-sm text-gray-600">
              {th('vs')} {opponentDisplayName}
            </span>
          )}
          {match.played_together && (
            <span className="shrink-0 text-xs text-green-600" title={th('playedTogether')}>🎾</span>
          )}
        </div>

        {match.sets.length > 0 && (
          <p className="mt-0.5 text-xs text-gray-400">
            {match.sets.map(s => `${myScore(s)}-${oppScore(s)}`).join('  ')}
          </p>
        )}

        {match.location_name && (
          <p className="mt-0.5 truncate text-xs text-gray-400">📍 {match.location_name}</p>
        )}
      </div>

      {/* Result + date */}
      <div className="shrink-0 text-right">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
          iWon  ? 'bg-green-100 text-green-700' :
          iLost ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {iWon ? th('won') : iLost ? th('lost') : th('undecided')}
        </span>
        <p className="mt-1 text-xs text-gray-400">{formatDate(match.played_at)}</p>
      </div>
    </div>
  );
}

function LimitedMatchCard({ match, profileId, th }: MatchCardProps) {
  const iWon  = match.winner_id === profileId;
  const iLost = match.winner_id !== null && match.winner_id !== profileId;

  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{SURFACE_EMOJI[match.surface ?? ''] ?? '🎾'}</span>
        <span className="text-sm text-gray-500">{formatDate(match.played_at)}</span>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        iWon  ? 'bg-green-100 text-green-700' :
        iLost ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-500'
      }`}>
        {iWon ? th('won') : iLost ? th('lost') : th('undecided')}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const params   = useParams<{ playerId: string }>();
  const playerId = params.playerId;
  const router   = useRouter();

  const t   = useTranslations('playerProfile');
  const ti  = useTranslations('playerProfile.info');
  const ts  = useTranslations('playerProfile.stats');
  const th  = useTranslations('playerProfile.history');
  const t2  = useTranslations('onboarding.step2');

  // ── Auth / identity ────────────────────────────────────────────────────────
  const [currentUserId,    setCurrentUserId]    = useState<string | null>(null);
  const [isSelf,           setIsSelf]           = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatusUI>('none');
  const [friendshipId,     setFriendshipId]     = useState<string | null>(null);

  // ── Profile data ───────────────────────────────────────────────────────────
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [city,     setCity]     = useState<string | null>(null);
  const [stats,    setStats]    = useState<ProfileStats | null>(null);
  const [notFound, setNotFound] = useState(false);

  // ── Match history ──────────────────────────────────────────────────────────
  const [matches,     setMatches]     = useState<ProfileMatchItem[]>([]);
  const [matchTotal,  setMatchTotal]  = useState(0);
  const [matchPage,   setMatchPage]   = useState(1);
  const [fullAccess,  setFullAccess]  = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);

  // ── General ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isFriend   = friendshipStatus === 'accepted';
  // View mode determines what's shown
  const viewMode   = isSelf ? 'self' : (isFriend ? 'friend' : 'stranger') as 'self' | 'friend' | 'stranger';

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchMatches = useCallback(async (viewerId: string, page = 1, append = false) => {
    const res = await fetch(
      `${API}/api/v1/profiles/${playerId}/matches?requesterId=${viewerId}&page=${page}&limit=10`
    );
    if (!res.ok) return;
    const data: ProfileMatchesResponse = await res.json();
    setMatches(prev => append ? [...prev, ...data.items] : data.items);
    setMatchTotal(data.total);
    setMatchPage(data.page);
    setFullAccess(data.fullAccess);
  }, [playerId]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/signin'); return; }

      setCurrentUserId(user.id);
      const selfView = playerId === user.id;
      setIsSelf(selfView);

      const [profileRes, locationRes, statsRes, friendshipRes] = await Promise.all([
        fetch(`${API}/api/v1/profiles/${playerId}`),
        fetch(`${API}/api/v1/profiles/${playerId}/location`),
        fetch(`${API}/api/v1/profiles/${playerId}/stats`),
        selfView
          ? Promise.resolve(null)
          : fetch(`${API}/api/v1/friendships/between?userA=${user.id}&userB=${playerId}`),
      ]);

      if (!profileRes.ok) { setNotFound(true); setLoading(false); return; }

      const [profileData, locationData, statsData] = await Promise.all([
        profileRes.json() as Promise<Profile>,
        locationRes.ok ? (locationRes.json() as Promise<{ city: string | null }>) : Promise.resolve({ city: null }),
        statsRes.ok    ? (statsRes.json() as Promise<ProfileStats>)                : Promise.resolve(null),
      ]);

      setProfile(profileData);
      setCity(locationData.city);
      setStats(statsData);

      let friendStatus: FriendshipStatusUI = 'none';
      let fId: string | null = null;
      if (!selfView && friendshipRes?.ok) {
        const fd = await friendshipRes.json() as { friendshipId: string | null; friendshipStatus: FriendshipStatusUI };
        friendStatus = fd.friendshipStatus;
        fId          = fd.friendshipId;
      }
      setFriendshipStatus(friendStatus);
      setFriendshipId(fId);

      await fetchMatches(user.id, 1);
      setLoading(false);
    };

    load();
  }, [playerId, router, fetchMatches]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleLoadMore() {
    if (!currentUserId || moreLoading) return;
    setMoreLoading(true);
    await fetchMatches(currentUserId, matchPage + 1, true);
    setMoreLoading(false);
  }

  function handleFriendshipChange(newStatus: FriendshipStatusUI, newId: string | null) {
    setFriendshipStatus(newStatus);
    setFriendshipId(newId);
    // When becoming friends, reload match history with full access
    if (newStatus === 'accepted' && currentUserId) {
      fetchMatches(currentUserId, 1);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-lg text-gray-500">{t('notFound')}</p>
        </main>
      </div>
    );
  }

  const displayName = profile.fullName ?? profile.username;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-5">

          {/* ── Profile header ──────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">

              {/* Avatar */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} className="h-full w-full object-cover" alt="" />
                  : <span className="text-3xl">🎾</span>}
              </div>

              {/* Identity + actions */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
                    <p className="text-sm text-gray-500">@{profile.username}</p>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <Link
                        href="/profile/edit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        ✏️ {t('editProfile')}
                      </Link>
                    ) : currentUserId && (
                      <FriendshipButton
                        initialStatus={friendshipStatus}
                        initialFriendshipId={friendshipId}
                        targetUserId={playerId}
                        currentUserId={currentUserId}
                        onStatusChange={handleFriendshipChange}
                      />
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio
                  ? <p className="mt-2 text-sm leading-relaxed text-gray-700">{profile.bio}</p>
                  : <p className="mt-2 text-sm text-gray-400 italic">{ti('noBio')}</p>}
              </div>
            </div>

            {/* Chips row */}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.level && (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_COLOR[profile.level] ?? 'bg-gray-100 text-gray-700'}`}>
                  {t2(profile.level as 'beginner')}
                </span>
              )}
              {profile.dominantHand && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {profile.dominantHand === 'left' ? '🤚' : '✋'} {ti(profile.dominantHand === 'left' ? 'left' : 'right')}
                </span>
              )}
              {profile.preferredSurface && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {SURFACE_EMOJI[profile.preferredSurface]} {t2(profile.preferredSurface as 'clay')}
                </span>
              )}
              {city ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  📍 {city}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-400">
                  📍 {ti('noLocation')}
                </span>
              )}
            </div>
          </section>

          {/* ── Stats bar ───────────────────────────────────────────────── */}
          {stats && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-4 divide-x divide-gray-100 sm:grid-cols-5">

                <StatCell label={ts('matches')} value={String(stats.totalMatches)} />
                <StatCell label={ts('wins')}    value={String(stats.wins)}         color="text-green-700" />

                {/* Losses — hidden on stranger view for compactness */}
                {viewMode !== 'stranger' && (
                  <StatCell label={ts('losses')} value={String(stats.losses)} color="text-red-600" />
                )}

                <StatCell
                  label={ts('winRate')}
                  value={`${stats.winRate}%`}
                  color={stats.winRate >= 50 ? 'text-green-700' : 'text-gray-700'}
                />

                {/* Streak — own profile only */}
                {viewMode === 'self' && stats.currentStreak !== 0 && (
                  <StatCell
                    label={ts('streak')}
                    value={`${stats.currentStreak > 0 ? 'W' : 'L'}${Math.abs(stats.currentStreak)}`}
                    color={stats.currentStreak > 0 ? 'text-green-700' : 'text-red-600'}
                  />
                )}
              </div>
            </section>
          )}

          {/* ── Match history ────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {fullAccess ? th('title') : th('recentMatches')}
            </h2>

            {matches.length === 0 ? (
              <p className="text-sm text-gray-400">{th('noMatches')}</p>
            ) : fullAccess ? (
              <>
                <div>
                  {matches.map(m => (
                    <ProfileMatchCard key={m.id} match={m} profileId={playerId} th={th} />
                  ))}
                </div>

                {matches.length < matchTotal && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={moreLoading}
                    className="mt-4 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {moreLoading ? th('loading') : th('loadMore')}
                  </button>
                )}
              </>
            ) : (
              <>
                <div>
                  {matches.map(m => (
                    <LimitedMatchCard key={m.id} match={m} profileId={playerId} th={th} />
                  ))}
                </div>

                {/* Teaser to add as friend */}
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <span className="mt-0.5 shrink-0">🔒</span>
                  <p>{th('friendsOnly', { name: profile.fullName ?? profile.username })}</p>
                </div>
              </>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function StatCell({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 first:pl-0 last:pr-0">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="mt-0.5 text-center text-xs text-gray-500">{label}</span>
    </div>
  );
}
