import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/_layout';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import GrassHeader from '@/components/GrassHeader';
import Avatar from '@/components/Avatar';
import StatCard from '@/components/StatCard';
import { MatchCardSkeleton } from '@/components/SkeletonLoader';
import type { Profile, ProfileStats, ProfileMatchItem } from '@acemate/types';

export default function ProfileTab() {
  const { userId, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  console.log('[AceMate] ProfileTab rendered (profile tab)');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [matches, setMatches] = useState<ProfileMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadProfile() {
    if (!userId) return;
    console.log('[AceMate] ProfileTab loading for userId:', userId);
    try {
      // Own profile via Supabase direct — works on physical devices without API server
      const { data: pd, error: pe } = await supabase
        .from('profiles')
        .select('id,username,full_name,avatar_url,bio,level,dominant_hand,preferred_surface,created_at,updated_at,deleted_at')
        .eq('id', userId)
        .single();
      if (pe) console.error('[AceMate] ProfileTab profile supabase error:', pe.message);
      if (pd) {
        setProfile({
          id: pd.id,
          username: pd.username ?? '',
          fullName: pd.full_name,
          avatarUrl: pd.avatar_url,
          bio: pd.bio,
          level: pd.level ?? 'beginner',
          dominantHand: pd.dominant_hand,
          preferredSurface: pd.preferred_surface,
          createdAt: pd.created_at,
          updatedAt: pd.updated_at,
          deletedAt: pd.deleted_at,
        });
      }

      // Stats and match history require EXPO_PUBLIC_API_URL to be the Railway URL
      const [statsResult, matchesResult] = await Promise.allSettled([
        api.profiles.stats(userId),
        api.profiles.matches(userId, 1, userId),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (matchesResult.status === 'fulfilled') {
        const m = matchesResult.value;
        setMatches(m.items);
        setHasMore(m.items.length < m.total);
      }
      setPage(1);
    } catch (err) {
      console.error('[AceMate] ProfileTab loadProfile error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfile(); }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [userId]);

  async function loadMore() {
    if (!userId || !hasMore || loading || loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const m = await api.profiles.matches(userId, nextPage, userId);
      setMatches(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const fresh = m.items.filter(item => !existingIds.has(item.id));
        const merged = [...prev, ...fresh];
        setHasMore(merged.length < m.total);
        return merged;
      });
      setPage(nextPage);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  const streakLabel = stats
    ? stats.currentStreak > 0
      ? `+${stats.currentStreak}`
      : stats.currentStreak < 0
        ? `${stats.currentStreak}`
        : '0'
    : '–';

  const winRate = stats ? `${Math.round(stats.winRate)}%` : '–';

  const ListHeader = () => (
    <>
      <GrassHeader height={170}>
        <View style={styles.headerContent}>
          <Avatar
            name={profile?.fullName ?? profile?.username}
            avatarUrl={profile?.avatarUrl}
            isWinner
            size={52}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerName}>{profile?.fullName ?? profile?.username ?? '…'}</Text>
            {profile?.username && (
              <Text style={styles.headerUsername}>@{profile.username}</Text>
            )}
            {profile?.level && (
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{i18n.t(`players.level.${profile.level}`)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push('/profile/edit')}
            style={styles.editBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </GrassHeader>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard value={stats?.totalMatches ?? '–'} label={i18n.t('profile.stats.matches')} />
        <StatCard value={stats?.wins ?? '–'} label={i18n.t('profile.stats.wins')} />
        <StatCard value={winRate} label={i18n.t('profile.stats.winRate')} />
        <StatCard value={streakLabel} label={i18n.t('profile.stats.streak')} accent={!!stats && stats.currentStreak > 0} />
      </View>

      {profile?.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('profile.history.title')}</Text>
      </View>

      {loading && (
        <>
          <MatchCardSkeleton />
          <MatchCardSkeleton />
        </>
      )}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProfileMatchRow match={item} userId={userId!} />}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{i18n.t('profile.history.noMatches')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={[styles.loadMore, loadingMore && { opacity: 0.5 }]}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.75}
            >
              <Text style={styles.loadMoreText}>
                {loadingMore ? '...' : i18n.t('profile.history.loadMore')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aceGreen} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Sign out footer */}
      <View style={[styles.signOutRow, { paddingBottom: insets.bottom + 80 }]}>
        <TouchableOpacity onPress={signOut} activeOpacity={0.6} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProfileMatchRow({ match, userId }: { match: ProfileMatchItem; userId: string }) {
  const isMe = match.is_home; // relative to profile owner which IS the current user here
  const won = match.winner_id === userId;
  const lost = !!match.winner_id && match.winner_id !== userId;
  const opponentName = match.opponent?.full_name ?? match.opponent?.username ?? match.opponent_name ?? '?';

  return (
    <View style={[pmr.card, { marginHorizontal: 16 }]}>
      <View style={pmr.left}>
        <Text style={pmr.vs}>{i18n.t('profile.history.vs')} {opponentName}</Text>
        <Text style={pmr.date}>
          {new Date(match.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {match.surface ? ` · ${match.surface}` : ''}
        </Text>
      </View>
      <View style={pmr.scoresCol}>
        <Text style={pmr.score}>
          {match.sets.map(s => `${s.home}-${s.away}`).join(' ')}
        </Text>
      </View>
      {won && <View style={pmr.wonBadge}><Text style={pmr.wonText}>{i18n.t('profile.history.won')}</Text></View>}
      {lost && <View style={pmr.lostBadge}><Text style={pmr.lostText}>{i18n.t('profile.history.lost')}</Text></View>}
      {!match.winner_id && <View style={pmr.noBadge}><Text style={pmr.noText}>{i18n.t('profile.history.undecided')}</Text></View>}
    </View>
  );
}

const pmr = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  left: { flex: 1 },
  vs: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  date: { fontSize: 12, color: colors.textMuted },
  scoresCol: {},
  score: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  wonBadge: { backgroundColor: 'rgba(197,241,53,0.18)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  wonText: { fontSize: 11, color: colors.aceGreen, fontWeight: '600' },
  lostBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  lostText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  noBadge: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  noText: { fontSize: 11, color: colors.textMuted },
});

const styles = StyleSheet.create({
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerName: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerUsername: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
  levelChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.aceGreen}18`,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelChipText: { fontSize: 11, color: colors.aceGreen, fontWeight: '600' },
  editBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  editBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 14 },
  bioSection: { paddingHorizontal: 16, paddingBottom: 12 },
  bio: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  loadMore: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  loadMoreText: { color: colors.textSecondary, fontSize: 14 },
  signOutRow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 16,
  },
  signOutBtn: { paddingVertical: 6 },
  signOutText: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
});
