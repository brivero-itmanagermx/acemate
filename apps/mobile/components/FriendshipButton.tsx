import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { api } from '@/lib/api';
import type { FriendshipStatusUI } from '@acemate/types';
import i18n from '@/lib/i18n';

interface Props {
  initialStatus: FriendshipStatusUI;
  initialFriendshipId: string | null;
  targetUserId: string;
  currentUserId: string;
  onStatusChange?: (status: FriendshipStatusUI, id: string | null) => void;
}

export default function FriendshipButton({
  initialStatus,
  initialFriendshipId,
  targetUserId,
  currentUserId,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<FriendshipStatusUI>(initialStatus);
  const [friendshipId, setFriendshipId] = useState<string | null>(initialFriendshipId);
  const [loading, setLoading] = useState(false);

  function apply(newStatus: FriendshipStatusUI, newId: string | null) {
    setStatus(newStatus);
    setFriendshipId(newId);
    onStatusChange?.(newStatus, newId);
  }

  async function sendRequest() {
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const data = await api.friendships.send(currentUserId, targetUserId);
      apply('pending_sent', data.id);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function respond(newStatus: 'accepted' | 'rejected') {
    if (!friendshipId) return;
    setLoading(true);
    try {
      await api.friendships.respond(friendshipId, newStatus);
      apply(newStatus === 'accepted' ? 'accepted' : 'none', newStatus === 'accepted' ? friendshipId : null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!friendshipId) return;
    setLoading(true);
    try {
      await api.friendships.remove(friendshipId);
      apply('none', null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator size="small" color={colors.aceGreen} />;
  }

  switch (status) {
    case 'none':
      return (
        <TouchableOpacity onPress={sendRequest} activeOpacity={0.7} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{i18n.t('friendship.add')}</Text>
        </TouchableOpacity>
      );

    case 'pending_sent':
      return (
        <View style={styles.row}>
          <View style={styles.pendingChip}>
            <Text style={styles.pendingText}>{i18n.t('friendship.pending')}</Text>
          </View>
          <TouchableOpacity onPress={remove} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{i18n.t('friendship.cancel')}</Text>
          </TouchableOpacity>
        </View>
      );

    case 'pending_received':
      return (
        <View style={styles.row}>
          <TouchableOpacity onPress={() => respond('accepted')} activeOpacity={0.7} style={styles.acceptBtn}>
            <Text style={styles.acceptText}>{i18n.t('friendship.accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => respond('rejected')} activeOpacity={0.7} style={styles.rejectBtn}>
            <Text style={styles.rejectText}>{i18n.t('friendship.reject')}</Text>
          </TouchableOpacity>
        </View>
      );

    case 'accepted':
      return (
        <View style={styles.row}>
          <View style={styles.friendsChip}>
            <Text style={styles.friendsText}>{i18n.t('friendship.friends')} ✓</Text>
          </View>
          <TouchableOpacity onPress={remove} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{i18n.t('friendship.remove')}</Text>
          </TouchableOpacity>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.aceGreen}80`,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: colors.aceGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  pendingChip: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${colors.rallyOrange}50`,
    backgroundColor: `${colors.rallyOrange}18`,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pendingText: {
    color: colors.rallyOrange,
    fontSize: 12,
    fontWeight: '500',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  acceptBtn: {
    backgroundColor: colors.aceGreen,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  acceptText: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rejectText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  friendsChip: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${colors.aceGreen}50`,
    backgroundColor: `${colors.aceGreen}18`,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  friendsText: {
    color: colors.aceGreen,
    fontSize: 12,
    fontWeight: '500',
  },
});
