'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import GrassHeader from '@/components/GrassHeader';
import FriendshipButton from '@/components/FriendshipButton';
import type {
  Profile,
  ProfileStats,
  ProfileMatchItem,
  ProfileMatchesResponse,
  FriendshipStatusUI,
} from '@acemate/types';

const API = process.env.NEXT_PUBLIC_API_URL;

const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};
const LEVEL_CHIP: Record<string, string> = {
  beginner:     'border-blue-500/30  bg-blue-500/10  text-blue-400',
  intermediate: 'border-ace-green/30 bg-ace-green/10 text-ace-green',
  advanced:     'border-rally-orange/30 bg-rally-orange/10 text-rally-orange',
  competitive:  'border-red-500/30   bg-red-500/10   text-red-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

  const opponentName = match.opponent?.full_name ?? match.opponent?.username ?? match.opponent_name;
  const myScore    = (s: { home: number; away: number }) => match.is_home ? s.home : s.away;
  const oppScore   = (s: { home: number; away: number }) => match.is_home ? s.away : s.home;

  return (
    <div className="flex items-start gap-3 border-b border-am-border py-3.5 last:border-0" style={{ borderBottomWidth: '0.5px' }}>
      <span className="mt-0.5 text-xl">{SURFACE_EMOJI[match.surface ?? ''] ?? '🎾'}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {match.opponent?.avatar_url && (
            <img src={match.opponent.avatar_url} className="h-5 w-5 shrink-0 rounded-full object-cover" alt="" />
          )}
          {match.opponent ? (
            <Link
              href={`/players/${match.opponent.id}`}
              className="truncate text-sm font-medium text-white hover:underline"
            >
              {opponentName}
            </Link>
          ) : (
            <span className="text-sm text-white/60">{opponentName ?? th('unknownOpponent')}</span>
          )}
        </div>

        {match.sets.length > 0 && (
          <p className="mt-0.5 font-mono text-xs text-white/40">
            {match.sets.map(s => `${myScore(s)}-${oppScore(s)}`).join(' ')}
          </p>
        )}
        {match.location_name && (
          <p className="mt-0.5 truncate text-xs text-white/30">📍 {match.location_name}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
          iWon  ? 'bg-ace-green/15 text-ace-green'  :
          iLost ? 'bg-red-500/10 text-red-400' :
                  'bg-white/8 text-white/40'
        }`}>
          {iWon ? th('won') : iLost ? th('lost') : th('undecided')}
        </span>
        <p className="mt-1 text-xs text-white/30">{formatDate(match.played_at)}</p>
      </div>
    </div>
  );
}

function LimitedMatchCard({ match, profileId, th }: MatchCardProps) {
  const iWon  = match.winner_id === profileId;
  const iLost = match.winner_id !== null && match.winner_id !== profileId;

  return (
    <div className="flex items-center justify-between border-b border-am-border py-2.5 last:border-0" style={{ borderBottomWidth: '0.5px' }}>
      <div className="flex items-center gap-2">
        <span className="text-base">{SURFACE_EMOJI[match.surface ?? ''] ?? '🎾'}</span>
        <span className="text-sm text-white/50">{formatDate(match.played_at)}</span>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        iWon  ? 'bg-ace-green/15 text-ace-green' :
        iLost ? 'bg-red-500/10 text-red-400' :
                'bg-white/8 text-white/40'
      }`}>
        {iWon ? th('won') : iLost ? th('lost') : th('undecided')}
      </span>
    </div>
  );
}

function StatCell({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 first:pl-0 last:pr-0">
      <span className={`text-xl font-extrabold ${color}`}>{value}</span>
      <span className="mt-0.5 text-center text-[11px] text-white/35">{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const params   = useParams();
  const playerId = params.playerId as string;
  const router   = useRouter();

  const t   = useTranslations('playerProfile.info');
  const ts  = useTranslations('playerProfile.stats');
  const th  = useTranslations('playerProfile.history');
  const t2  = useTranslations('onboarding.step2');
  const ti  = useTranslations('onboarding.step2');

  const [currentUserId,    setCurrentUserId]    = useState<string>('');
  const [isSelf,           setIsSelf]           = useState(false);
  const [profile,          setProfile]          = useState<Profile | null>(null);
  const [notFound,         setNotFound]         = useState(false);
  const [city,             setCity]             = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatusUI>('none');
  const [friendshipId,     setFriendshipId]     = useState<string | null>(null);
  const [stats,            setStats]            = useState<ProfileStats | null>(null);
  const [matches,          setMatches]          = useState<ProfileMatchItem[]>([]);
  const [matchTotal,       setMatchTotal]       = useState(0);
  const [matchPage,        setMatchPage]        = useState(1);
  const [fullAccess,       setFullAccess]       = useState(false);
  const [moreLoading,      setMoreLoading]      = useState(false);
  const [loading,          setLoading]          = useState(true);

  const isFriend  = friendshipStatus === 'accepted';
  const viewMode: 'self' | 'friend' | 'stranger' = isSelf ? 'self' : (isFriend ? 'friend' : 'stranger');

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

  useEffect(() => {
    async function load() {
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
        locationRes.ok ? locationRes.json() : Promise.resolve({ city: null }),
        statsRes.ok    ? statsRes.json()    : Promise.resolve<ProfileStats | null>(null),
      ]);

      setProfile(profileData);
      setCity(locationData.city);
      setStats(statsData);

      if (!selfView && friendshipRes?.ok) {
        const fd = await friendshipRes.json() as { friendshipStatus: FriendshipStatusUI; friendshipId: string | null };
        setFriendshipStatus(fd.friendshipStatus);
        setFriendshipId(fd.friendshipId);
      }

      await fetchMatches(user.id, 1);
      setLoading(false);
    }
    load();
  }, [playerId, router, fetchMatches]);

  async function handleLoadMore() {
    if (!currentUserId || moreLoading) return;
    setMoreLoading(true);
    await fetchMatches(currentUserId, matchPage + 1, true);
    setMoreLoading(false);
  }

  function handleFriendshipChange(newStatus: FriendshipStatusUI, newId: string | null) {
    setFriendshipStatus(newStatus);
    setFriendshipId(newId);
    if (newStatus === 'accepted' && currentUserId) {
      fetchMatches(currentUserId, 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-am-bg">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-am-bg">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-lg text-white/50">{t('notFound')}</p>
        </main>
      </div>
    );
  }

  const displayName = profile.fullName ?? profile.username;

  return (
    <div className="min-h-screen bg-am-bg">
      <Navbar />

      {/* Grass header */}
      <GrassHeader>
        <div className="flex items-end gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ace-green/40 bg-ace-green/20 text-sm font-bold text-ace-green">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} className="h-full w-full object-cover" alt="" />
              : <span>{initials(displayName)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-white">{displayName}</h1>
            <p className="text-xs text-white/50">@{profile.username}</p>
          </div>
          {!isSelf && (
            <div className="shrink-0">
              <FriendshipButton
                initialStatus={friendshipStatus}
                initialFriendshipId={friendshipId}
                targetUserId={playerId}
                currentUserId={currentUserId}
                onStatusChange={handleFriendshipChange}
              />
            </div>
          )}
          {isSelf && (
            <Link
              href="/profile/edit"
              className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/15"
            >
              {t('editProfile')}
            </Link>
          )}
        </div>
      </GrassHeader>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-4">

          {/* Chips bar */}
          <div className="flex flex-wrap gap-2">
            {profile.level && (
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${LEVEL_CHIP[profile.level] ?? 'border-white/10 bg-white/5 text-white/40'}`}>
                {t2(profile.level as 'beginner')}
              </span>
            )}
            {profile.dominantHand && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/55">
                {profile.dominantHand === 'left' ? '🤚' : '✋'} {ti(profile.dominantHand === 'left' ? 'left' : 'right')}
              </span>
            )}
            {profile.preferredSurface && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/55">
                {SURFACE_EMOJI[profile.preferredSurface]} {t2(profile.preferredSurface as 'clay')}
              </span>
            )}
            {city ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/55">
                📍 {city}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/3 px-3 py-1 text-xs text-white/30">
                📍 {ti('noLocation')}
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-white/65">{profile.bio}</p>
          )}

          {/* Stats bar */}
          {stats && (
            <section className="overflow-hidden rounded-xl border border-am-border bg-am-card" style={{ borderWidth: '0.5px' }}>
              <div className="grid divide-x divide-am-border sm:grid-cols-4" style={{ gridTemplateColumns: viewMode === 'stranger' ? 'repeat(3,1fr)' : 'repeat(4,1fr)' }}>
                <StatCell label={ts('matches')} value={String(stats.totalMatches)} />
                <StatCell label={ts('wins')}    value={String(stats.wins)}         color="text-ace-green" />
                {viewMode !== 'stranger' && (
                  <StatCell label={ts('losses')} value={String(stats.losses)} color="text-red-400" />
                )}
                <StatCell
                  label={ts('winRate')}
                  value={`${stats.winRate}%`}
                  color={stats.winRate >= 50 ? 'text-ace-green' : 'text-white'}
                />
              </div>
            </section>
          )}

          {/* Match history */}
          <section className="rounded-xl border border-am-border bg-am-surface p-5" style={{ borderWidth: '0.5px' }}>
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              {th('title')}
            </h2>

            {matches.length === 0 ? (
              <p className="text-sm text-white/35">{th('noMatches')}</p>
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
                    disabled={moreLoading}
                    onClick={handleLoadMore}
                    className="mt-4 w-full rounded-xl border border-am-border py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-white/25 hover:text-white/80 disabled:opacity-50"
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
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-ace-green/15 bg-ace-green/6 px-4 py-3 text-sm text-white/50">
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
