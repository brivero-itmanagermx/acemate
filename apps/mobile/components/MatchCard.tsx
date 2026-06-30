import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import Avatar from './Avatar';
import type { MatchFeedItem, PlayerSummary } from '@acemate/types';
import i18n from '@/lib/i18n';

const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

interface PlayerRowProps {
  player: PlayerSummary | null;
  guestName: string | null | undefined;
  isWinner: boolean;
  scores: number[];
}

function PlayerRow({ player, guestName, isWinner, scores }: PlayerRowProps) {
  const name = player?.full_name ?? player?.username ?? guestName ?? '?';
  return (
    <View style={styles.playerRow}>
      <Avatar
        name={name}
        avatarUrl={player?.avatar_url}
        isWinner={isWinner}
        size={32}
      />
      <Text
        style={[styles.playerName, isWinner ? styles.playerNameWinner : styles.playerNameLoser]}
        numberOfLines={1}
      >
        {name}
        {!player && guestName && (
          <Text style={styles.guestTag}> ({i18n.t('dashboard.matchCard.guest')})</Text>
        )}
      </Text>
      <View style={styles.scoresRow}>
        {scores.map((s, i) => (
          <Text
            key={i}
            style={[styles.score, isWinner ? styles.scoreWinner : styles.scoreLoser]}
          >
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface Props {
  match: MatchFeedItem;
  currentUserId: string;
  onAce?: () => void;
}

export default function MatchCard({ match, currentUserId, onAce }: Props) {
  const isHome = match.player_home_id === currentUserId || match.player_home2_id === currentUserId;
  const surface = match.surface ? SURFACE_EMOJI[match.surface] : null;

  const homeWon = !!match.winner_id && match.winner_id === match.player_home_id;
  const awayWon = !!match.winner_id && match.winner_id === match.player_away_id;
  const iWon = isHome ? homeWon : awayWon;
  const theyWon = isHome ? awayWon : homeWon;

  const mySets = match.sets.map(s => isHome ? s.home : s.away);
  const theirSets = match.sets.map(s => isHome ? s.away : s.home);

  const myPlayer = isHome ? match.homePlayer : match.awayPlayer;
  const myGuest = isHome ? null : (match.opponent_name ?? null);
  const theirPlayer = isHome ? match.awayPlayer : match.homePlayer;
  const theirGuest = isHome ? (match.opponent_name ?? null) : null;

  async function handleAce() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAce?.();
  }

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        {surface && (
          <Text style={styles.meta}>{surface} {i18n.t(`dashboard.matchCard.surface.${match.surface}`)}</Text>
        )}
        <Text style={styles.meta}>{formatDate(match.played_at)}</Text>
        {match.location_name && (
          <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}> · {match.location_name}</Text>
        )}
        {match.match_type === 'doubles' && (
          <View style={styles.doublesChip}>
            <Text style={styles.doublesChipText}>{i18n.t('dashboard.matchCard.doubles')}</Text>
          </View>
        )}
      </View>

      {/* Players */}
      <View style={styles.body}>
        <PlayerRow
          player={myPlayer}
          guestName={myGuest}
          isWinner={iWon}
          scores={mySets}
        />
        <View style={styles.divider} />
        <PlayerRow
          player={theirPlayer}
          guestName={theirGuest}
          isWinner={theyWon}
          scores={theirSets}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleAce}
          activeOpacity={0.7}
          style={[
            styles.aceBtn,
            match.userHasAced ? styles.aceBtnActive : styles.aceBtnInactive,
          ]}
        >
          <Text style={match.userHasAced ? styles.aceTextActive : styles.aceTextInactive}>
            🎾 {i18n.t('dashboard.matchCard.ace')}
            {match.aceCount > 0 && ` ${match.aceCount}`}
          </Text>
        </TouchableOpacity>

        {!match.winner_id && (
          <View style={styles.pendingChip}>
            <Text style={styles.pendingChipText}>{i18n.t('dashboard.matchCard.pending')}</Text>
          </View>
        )}

        <View style={styles.resultRight}>
          {iWon && (
            <View style={styles.wonChip}>
              <Text style={styles.wonChipText}>{i18n.t('dashboard.matchCard.won')}</Text>
            </View>
          )}
          {!iWon && match.winner_id && (
            <View style={styles.lostChip}>
              <Text style={styles.lostChipText}>{i18n.t('dashboard.matchCard.lost')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  doublesChip: {
    backgroundColor: 'rgba(197,241,53,0.15)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doublesChipText: {
    fontSize: 11,
    color: colors.aceGreen,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
  },
  playerNameWinner: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  playerNameLoser: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  guestTag: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 6,
  },
  score: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  scoreWinner: {
    color: colors.textPrimary,
  },
  scoreLoser: {
    color: 'rgba(255,255,255,0.28)',
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginLeft: 42,
    marginVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  aceBtn: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  aceBtnActive: {
    backgroundColor: 'rgba(255,127,45,0.18)',
    borderColor: colors.rallyOrange,
  },
  aceBtnInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  aceTextActive: {
    color: colors.rallyOrange,
    fontSize: 13,
    fontWeight: '700',
  },
  aceTextInactive: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingChip: {
    borderRadius: 100,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  resultRight: {
    marginLeft: 'auto',
  },
  wonChip: {
    backgroundColor: 'rgba(197,241,53,0.18)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  wonChipText: {
    fontSize: 12,
    color: colors.aceGreen,
    fontWeight: '600',
  },
  lostChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lostChipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
});
