import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import Avatar from '@/components/Avatar';
import FriendshipButton from '@/components/FriendshipButton';
import type { FriendEntry, FriendRequest, SentRequest } from '@acemate/types';

type Tab = 'friends' | 'received' | 'sent';

export default function Friends() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll() {
    console.log('[AceMate] Friends loading');
    const [fr, rr, sr] = await Promise.allSettled([
      api.friendships.list(userId!),
      api.friendships.requests(userId!),
      api.friendships.sent(userId!),
    ]);
    if (fr.status === 'fulfilled') setFriends(fr.value);
    else console.error('[AceMate] Friends list error — set EXPO_PUBLIC_API_URL to Railway URL:', fr.reason);
    if (rr.status === 'fulfilled') setReceived(rr.value);
    else console.error('[AceMate] Friend requests error:', rr.reason);
    if (sr.status === 'fulfilled') setSent(sr.value);
    else console.error('[AceMate] Sent requests error:', sr.reason);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, []);

  const receivedCount = received.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>{i18n.t('friends.title')}</Text>

      {/* Segmented tabs */}
      <View style={styles.tabs}>
        {(['friends', 'received', 'sent'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {i18n.t(`friends.tabs.${t}`)}
              {t === 'received' && receivedCount > 0 && ` (${receivedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.aceGreen} />
        </View>
      ) : (
        <>
          {tab === 'friends' && (
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/players/${item.friend.id}`)}
                  activeOpacity={0.75}
                >
                  <Avatar name={item.friend.full_name ?? item.friend.username} avatarUrl={item.friend.avatar_url} size={44} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.friend.full_name ?? item.friend.username}</Text>
                    <Text style={styles.username}>@{item.friend.username}</Text>
                  </View>
                  <FriendshipButton
                    initialStatus="accepted"
                    initialFriendshipId={item.id}
                    targetUserId={item.friend.id}
                    currentUserId={userId!}
                    onStatusChange={() => setFriends(prev => prev.filter(f => f.id !== item.id))}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<EmptyState label={i18n.t('friends.noFriends')} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aceGreen} />}
              showsVerticalScrollIndicator={false}
            />
          )}

          {tab === 'received' && (
            <FlatList
              data={received}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardLeft}
                    onPress={() => router.push(`/players/${item.requester.id}`)}
                    activeOpacity={0.75}
                  >
                    <Avatar name={item.requester.full_name ?? item.requester.username} avatarUrl={item.requester.avatar_url} size={44} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{item.requester.full_name ?? item.requester.username}</Text>
                      <Text style={styles.username}>@{item.requester.username}</Text>
                    </View>
                  </TouchableOpacity>
                  <FriendshipButton
                    initialStatus="pending_received"
                    initialFriendshipId={item.id}
                    targetUserId={item.requester.id}
                    currentUserId={userId!}
                    onStatusChange={() => setReceived(prev => prev.filter(r => r.id !== item.id))}
                  />
                </View>
              )}
              ListEmptyComponent={<EmptyState label={i18n.t('friends.noPending')} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aceGreen} />}
              showsVerticalScrollIndicator={false}
            />
          )}

          {tab === 'sent' && (
            <FlatList
              data={sent}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardLeft}
                    onPress={() => router.push(`/players/${item.receiver.id}`)}
                    activeOpacity={0.75}
                  >
                    <Avatar name={item.receiver.full_name ?? item.receiver.username} avatarUrl={item.receiver.avatar_url} size={44} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{item.receiver.full_name ?? item.receiver.username}</Text>
                      <Text style={styles.username}>@{item.receiver.username}</Text>
                    </View>
                  </TouchableOpacity>
                  <FriendshipButton
                    initialStatus="pending_sent"
                    initialFriendshipId={item.id}
                    targetUserId={item.receiver.id}
                    currentUserId={userId!}
                    onStatusChange={() => setSent(prev => prev.filter(s => s.id !== item.id))}
                  />
                </View>
              )}
              ListEmptyComponent={<EmptyState label={i18n.t('friends.noSent')} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aceGreen} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.card,
  },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
