import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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
import type { PlayerSearchResult, FriendshipStatusUI } from '@acemate/types';

export default function Players() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await api.profiles.search(q, userId ?? undefined);
      setResults(data); // self is excluded server-side via excludeId param
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  function onChangeQuery(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 350);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>{i18n.t('players.title')}</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeQuery}
          placeholder={i18n.t('players.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.aceGreen} style={{ marginRight: 10 }} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PlayerRow
            player={item}
            currentUserId={userId!}
            onPress={() => router.push(`/players/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {query ? i18n.t('players.noResults') : i18n.t('players.searchPrompt')}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function PlayerRow({
  player,
  currentUserId,
  onPress,
}: {
  player: PlayerSearchResult;
  currentUserId: string;
  onPress: () => void;
}) {
  const [status, setStatus] = useState<FriendshipStatusUI>(player.friendshipStatus);
  const [friendshipId, setFriendshipId] = useState<string | null>(player.friendshipId);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
      <Avatar
        name={player.full_name ?? player.username}
        avatarUrl={player.avatar_url}
        size={44}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{player.full_name ?? player.username}</Text>
        <Text style={styles.cardUsername}>@{player.username}</Text>
        {player.level && (
          <View style={styles.levelChip}>
            <Text style={styles.levelChipText}>{i18n.t(`players.level.${player.level}`)}</Text>
          </View>
        )}
      </View>
      <FriendshipButton
        initialStatus={status}
        initialFriendshipId={friendshipId}
        targetUserId={player.id}
        currentUserId={currentUserId}
        onStatusChange={(s, id) => { setStatus(s); setFriendshipId(id); }}
      />
    </TouchableOpacity>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 12,
  },
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
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardUsername: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  levelChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.aceGreen}18`,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelChipText: { fontSize: 11, color: colors.aceGreen, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
