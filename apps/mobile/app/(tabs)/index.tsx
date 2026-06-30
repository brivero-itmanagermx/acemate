import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/_layout';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import GrassHeader from '@/components/GrassHeader';
import Avatar from '@/components/Avatar';
import StatCard from '@/components/StatCard';
import MatchCard from '@/components/MatchCard';
import WinCelebration from '@/components/WinCelebration';
import { MatchCardSkeleton } from '@/components/SkeletonLoader';
import type { MatchFeedItem, ProfileStats, Profile } from '@acemate/types';

export default function Dashboard() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  console.log('[AceMate] Dashboard rendered (index tab)');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [feed, setFeed] = useState<MatchFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const isMounted = useRef(true);

  async function loadAll() {
    if (!userId) return;
    console.log('[AceMate] Dashboard loading for userId:', userId);
    try {
      // Own profile via Supabase direct — works on physical devices without API server
      const { data: pd, error: pe } = await supabase
        .from('profiles')
        .select('id,username,full_name,avatar_url,bio,level,dominant_hand,preferred_surface,created_at,updated_at,deleted_at')
        .eq('id', userId)
        .single();
      if (pe) console.error('[AceMate] Dashboard profile supabase error:', pe.message);
      if (pd && isMounted.current) {
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

      // Stats and feed go through the API — require EXPO_PUBLIC_API_URL to be the Railway URL
      const [statsResult, feedResult] = await Promise.allSettled([
        api.profiles.stats(userId),
        api.matches.feed(userId),
      ]);
      if (!isMounted.current) return;
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (feedResult.status === 'fulfilled') setFeed(feedResult.value);
    } catch (err) {
      console.error('[AceMate] Dashboard loadAll error:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    loadAll();
    return () => { isMounted.current = false; };
  }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [userId]);

  async function handleAce(match: MatchFeedItem) {
    if (!userId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (match.userHasAced) {
        await api.matches.unace(match.id, userId);
        setFeed(prev => prev.map(m =>
          m.id === match.id ? { ...m, userHasAced: false, aceCount: m.aceCount - 1 } : m
        ));
      } else {
        await api.matches.ace(match.id, userId);
        setFeed(prev => prev.map(m =>
          m.id === match.id ? { ...m, userHasAced: true, aceCount: m.aceCount + 1 } : m
        ));
      }
    } catch {
      // silently fail
    }
  }

  const name = profile?.fullName?.split(' ')[0] ?? profile?.username ?? '';
  const streakLabel = stats
    ? stats.currentStreak > 0
      ? `+${stats.currentStreak}`
      : stats.currentStreak < 0
        ? `${stats.currentStreak}`
        : '0'
    : '–';

  const ListHeader = () => (
    <>
      <GrassHeader height={170}>
        <View style={styles.headerContent}>
          <Avatar
            name={profile?.fullName ?? profile?.username}
            avatarUrl={profile?.avatarUrl}
            isWinner
            size={48}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerName}>{profile?.fullName ?? profile?.username ?? '…'}</Text>
            {profile?.username && (
              <Text style={styles.headerUsername}>@{profile.username}</Text>
            )}
          </View>
        </View>
      </GrassHeader>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          value={stats?.totalMatches ?? '–'}
          label={i18n.t('dashboard.stats.totalMatches')}
        />
        <StatCard
          value={stats?.wins ?? '–'}
          label={i18n.t('dashboard.stats.wins')}
        />
        <StatCard
          value={streakLabel}
          label={i18n.t('dashboard.stats.streak')}
          accent={!!stats && stats.currentStreak > 0}
        />
      </View>

      <View style={styles.feedHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('dashboard.feed.title')}</Text>
      </View>

      {loading && (
        <>
          <MatchCardSkeleton />
          <MatchCardSkeleton />
          <MatchCardSkeleton />
        </>
      )}
    </>
  );

  const ListEmpty = () =>
    loading ? null : (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>🎾</Text>
        <Text style={styles.emptyTitle}>
          {i18n.t('dashboard.empty.title', { name })}
        </Text>
        <Text style={styles.emptyDesc}>{i18n.t('dashboard.empty.description')}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            currentUserId={userId!}
            onAce={() => handleAce(item)}
          />
        )}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.aceGreen}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/match/new');
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <WinCelebration visible={celebration} onDone={() => setCelebration(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerUsername: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  feedHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.aceGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.aceGreen,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: {
    color: '#1a1a1a',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
