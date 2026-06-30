import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/_layout';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import GrassHeader from '@/components/GrassHeader';
import Avatar from '@/components/Avatar';
import StatCard from '@/components/StatCard';
import FriendshipButton from '@/components/FriendshipButton';
import { MatchCardSkeleton } from '@/components/SkeletonLoader';
import type { Profile, ProfileStats, ProfileMatchItem, FriendshipStatusUI } from '@acemate/types';

export default function PlayerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [matches, setMatches] = useState<ProfileMatchItem[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatusUI>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load() {
    if (!id || !userId) return;
    try {
      const [p, s, m, between] = await Promise.all([
        api.profiles.get(id),
        api.profiles.stats(id),
        api.profiles.matches(id, 1, userId),
        api.friendships.between(userId, id),
      ]);
      setProfile(p);
      setStats(s);
      setMatches(m.items);
      setHasMore(m.items.length < m.total);
      setFriendStatus(between.friendshipStatus);
      setFriendshipId(between.friendshipId);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [id]);

  async function loadMore() {
    if (!id || !userId || !hasMore || loading || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const m = await api.profiles.matches(id, next, userId);
      setMatches(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const fresh = m.items.filter(item => !existingIds.has(item.id));
        const merged = [...prev, ...fresh];
        setHasMore(merged.length < m.total);
        return merged;
      });
      setPage(next);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  const winRate = stats ? `${Math.round(stats.winRate)}%` : '–';

  const ListHeader = () => (
    <>
      <GrassHeader height={170}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Avatar
              name={profile?.fullName ?? profile?.username}
              avatarUrl={profile?.avatarUrl}
              size={48}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.name}>{profile?.fullName ?? profile?.username ?? '…'}</Text>
              {profile?.username && (
                <Text style={styles.username}>@{profile.username}</Text>
              )}
            </View>
          </View>
          {userId && id && userId !== id && (
            <FriendshipButton
              initialStatus={friendStatus}
              initialFriendshipId={friendshipId}
              targetUserId={id}
              currentUserId={userId}
              onStatusChange={(s, fid) => { setFriendStatus(s); setFriendshipId(fid); }}
            />
          )}
        </View>
      </GrassHeader>

      <View style={styles.statsRow}>
        <StatCard value={stats?.totalMatches ?? '–'} label={i18n.t('profile.stats.matches')} />
        <StatCard value={stats?.wins ?? '–'} label={i18n.t('profile.stats.wins')} />
        <StatCard value={winRate} label={i18n.t('profile.stats.winRate')} />
      </View>

      {profile?.bio && (
        <View style={styles.bio}>
          <Text style={styles.bioText}>{profile.bio}</Text>
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
        renderItem={({ item }) => <PlayerMatchRow match={item} />}
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aceGreen} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function PlayerMatchRow({ match }: { match: ProfileMatchItem }) {
  const opponentName = match.opponent?.full_name ?? match.opponent?.username ?? match.opponent_name ?? '?';
  const won = !!match.winner_id && match.is_home
    ? match.winner_id === match.opponent?.id ? false : true
    : match.winner_id === match.opponent?.id;

  return (
    <View style={[row.card, { marginHorizontal: 16 }]}>
      <View style={row.left}>
        <Text style={row.vs}>{i18n.t('profile.history.vs')} {opponentName}</Text>
        <Text style={row.date}>
          {new Date(match.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {match.surface ? ` · ${match.surface}` : ''}
        </Text>
      </View>
      <Text style={row.score}>
        {match.sets.map(s => `${s.home}-${s.away}`).join(' ')}
      </Text>
      {match.winner_id && (
        <View style={[row.badge, won ? row.wonBadge : row.lostBadge]}>
          <Text style={[row.badgeText, won ? row.wonText : row.lostText]}>
            {won ? i18n.t('profile.history.won') : i18n.t('profile.history.lost')}
          </Text>
        </View>
      )}
    </View>
  );
}

const row = StyleSheet.create({
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
  score: { fontSize: 13, color: colors.textSecondary },
  badge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  wonBadge: { backgroundColor: 'rgba(197,241,53,0.18)' },
  lostBadge: { backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  wonText: { color: colors.aceGreen },
  lostText: { color: 'rgba(255,255,255,0.5)' },
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4 },
  backText: { color: colors.textPrimary, fontSize: 30, lineHeight: 36 },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  username: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  bio: { paddingHorizontal: 16, paddingBottom: 12 },
  bioText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  loadMore: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  loadMoreText: { color: colors.textSecondary, fontSize: 14 },
});
