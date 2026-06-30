import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/_layout';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import Avatar from '@/components/Avatar';
import WinCelebration from '@/components/WinCelebration';
import type { PlayerSearchResult, Venue, SetScore, Surface } from '@acemate/types';

type MatchType = 'singles' | 'doubles';
type Winner = 'me' | 'opponent' | 'none';

interface OpponentState {
  mode: 'search' | 'guest';
  selected: PlayerSearchResult | null;
  guestName: string;
  guestEmail: string;
}

const SURFACES: Surface[] = ['clay', 'hard', 'grass', 'indoor'];
const SURFACE_EMOJI: Record<Surface, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

function SetRow({
  index,
  set,
  onChange,
  onRemove,
  myLabel,
  oppLabel,
}: {
  index: number;
  set: SetScore;
  onChange: (s: SetScore) => void;
  onRemove: () => void;
  myLabel: string;
  oppLabel: string;
}) {
  return (
    <View style={sets.row}>
      <Text style={sets.setLabel}>{i18n.t('newMatch.sets.set', { n: index + 1 })}</Text>
      <View style={sets.inputs}>
        <View style={sets.scoreBox}>
          <Text style={sets.scoreLabel}>{myLabel}</Text>
          <TextInput
            style={sets.input}
            value={set.home.toString()}
            onChangeText={v => onChange({ ...set, home: parseInt(v) || 0 })}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
        <Text style={sets.dash}>–</Text>
        <View style={sets.scoreBox}>
          <Text style={sets.scoreLabel}>{oppLabel}</Text>
          <TextInput
            style={sets.input}
            value={set.away.toString()}
            onChangeText={v => onChange({ ...set, away: parseInt(v) || 0 })}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={sets.removeBtn} activeOpacity={0.7}>
        <Text style={sets.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const sets = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  setLabel: { color: colors.textMuted, fontSize: 12, width: 40 },
  inputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBox: { flex: 1, alignItems: 'center' },
  scoreLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    width: 52,
    paddingVertical: 8,
  },
  dash: { color: colors.textMuted, fontSize: 16 },
  removeBtn: { padding: 8 },
  removeText: { color: colors.textMuted, fontSize: 14 },
});

function OpponentSearch({
  state,
  onChange,
  label,
  currentUserId,
}: {
  state: OpponentState;
  onChange: (o: OpponentState) => void;
  label: string;
  currentUserId: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function search(q: string) {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api.profiles.search(q);
      setResults(data.filter(p => p.id !== currentUserId));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(t: string) {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(t), 350);
  }

  if (state.mode === 'guest') {
    return (
      <View>
        <Text style={ss.label}>{label}</Text>
        <TextInput
          style={ss.input}
          value={state.guestName}
          onChangeText={v => onChange({ ...state, guestName: v })}
          placeholder={i18n.t('newMatch.opponent.guestName')}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={[ss.input, { marginTop: 8 }]}
          value={state.guestEmail}
          onChangeText={v => onChange({ ...state, guestEmail: v })}
          placeholder={i18n.t('newMatch.opponent.guestEmail')}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => onChange({ ...state, mode: 'search' })} style={ss.switchBtn}>
          <Text style={ss.switchText}>{i18n.t('newMatch.opponent.switchToSearch')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={ss.label}>{label}</Text>
      {state.selected ? (
        <View style={ss.selected}>
          <Avatar name={state.selected.full_name ?? state.selected.username} avatarUrl={state.selected.avatar_url} size={32} />
          <Text style={ss.selectedName}>{state.selected.full_name ?? state.selected.username}</Text>
          <TouchableOpacity onPress={() => onChange({ ...state, selected: null })} style={ss.clearBtn}>
            <Text style={ss.clearText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={ss.searchRow}>
            <TextInput
              style={ss.input}
              value={query}
              onChangeText={onQueryChange}
              placeholder={i18n.t('newMatch.opponent.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator size="small" color={colors.aceGreen} style={{ marginLeft: 8 }} />}
          </View>
          {results.length > 0 && (
            <View style={ss.dropdown}>
              {results.slice(0, 5).map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => { onChange({ ...state, selected: p }); setQuery(''); setResults([]); }}
                  style={ss.dropdownItem}
                  activeOpacity={0.75}
                >
                  <Avatar name={p.full_name ?? p.username} avatarUrl={p.avatar_url} size={28} />
                  <Text style={ss.dropdownName}>{p.full_name ?? p.username}</Text>
                  <Text style={ss.dropdownUsername}>@{p.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
      <TouchableOpacity onPress={() => onChange({ ...state, mode: 'guest' })} style={ss.switchBtn}>
        <Text style={ss.switchText}>{i18n.t('newMatch.opponent.switchToGuest')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const ss = StyleSheet.create({
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    flex: 1,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: `${colors.aceGreen}60`,
    padding: 10,
    gap: 10,
  },
  selectedName: { flex: 1, color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  clearBtn: { padding: 4 },
  clearText: { color: colors.textMuted, fontSize: 14 },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dropdownName: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  dropdownUsername: { color: colors.textMuted, fontSize: 12 },
  switchBtn: { marginTop: 8 },
  switchText: { color: colors.aceGreen, fontSize: 13, fontWeight: '600' },
});

export default function NewMatch() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [matchType, setMatchType] = useState<MatchType>('singles');
  const [opponent, setOpponent] = useState<OpponentState>({ mode: 'search', selected: null, guestName: '', guestEmail: '' });
  const [surface, setSurface] = useState<Surface | null>(null);
  const [sets, setSets] = useState<SetScore[]>([]);
  const [winner, setWinner] = useState<Winner>('none');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [nudgePlayer, setNudgePlayer] = useState<PlayerSearchResult | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);

  function addSet() {
    setSets(prev => [...prev, { home: 0, away: 0 }]);
  }

  function updateSet(i: number, s: SetScore) {
    setSets(prev => prev.map((x, idx) => idx === i ? s : x));
  }

  function removeSet(i: number) {
    setSets(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!userId) return;
    setLoading(true);

    const body: Record<string, unknown> = {
      match_type: matchType,
      player_home_id: userId,
      sets,
      surface,
      notes: notes || null,
      played_at: new Date().toISOString(),
    };

    if (opponent.mode === 'search' && opponent.selected) {
      body.player_away_id = opponent.selected.id;
    } else {
      body.opponent_name  = opponent.guestName || null;
      body.opponent_email = opponent.guestEmail || null;
    }

    if (winner === 'me') body.winner_id = userId;
    else if (winner === 'opponent' && opponent.selected) body.winner_id = opponent.selected.id;

    try {
      await api.matches.create(body);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (winner === 'me') {
        setCelebration(true);
      }

      // Nudge to add opponent as friend if they're a registered player not yet a friend
      if (opponent.selected && opponent.selected.friendshipStatus === 'none') {
        setNudgePlayer(opponent.selected);
      }

      setSuccess(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function sendNudgeFriendRequest() {
    if (!nudgePlayer || !userId) return;
    try {
      await api.friendships.send(userId, nudgePlayer.id);
      setNudgeSent(true);
    } catch {
      // silently fail
    }
  }

  if (success) {
    return (
      <View style={[modal.container, { paddingTop: insets.top }]}>
        <WinCelebration visible={celebration} onDone={() => setCelebration(false)} />
        <View style={modal.successBox}>
          <Text style={modal.successIcon}>🏆</Text>
          <Text style={modal.successTitle}>{i18n.t('newMatch.successTitle')}</Text>
          <Text style={modal.successSubtitle}>{i18n.t('newMatch.successSubtitle')}</Text>

          {nudgePlayer && !nudgeSent && (
            <View style={modal.nudgeBox}>
              <Text style={modal.nudgeText}>
                {i18n.t('newMatch.nudge.prompt', { name: nudgePlayer.full_name ?? nudgePlayer.username })}
              </Text>
              <View style={modal.nudgeBtns}>
                <TouchableOpacity onPress={sendNudgeFriendRequest} style={modal.nudgeAdd} activeOpacity={0.85}>
                  <Text style={modal.nudgeAddText}>{i18n.t('newMatch.nudge.addFriend')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNudgePlayer(null)} activeOpacity={0.7}>
                  <Text style={modal.nudgeLater}>{i18n.t('newMatch.nudge.maybeLater')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {nudgeSent && (
            <Text style={modal.nudgeSent}>{i18n.t('newMatch.nudge.sent')}</Text>
          )}

          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={modal.doneBtn} activeOpacity={0.85}>
            <Text style={modal.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      {/* Header */}
      <View style={[modal.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={modal.cancel}>{i18n.t('newMatch.cancel')}</Text>
        </TouchableOpacity>
        <Text style={modal.title}>{i18n.t('newMatch.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={modal.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Match type */}
        <Section label={i18n.t('newMatch.matchType.label')}>
          <View style={modal.chipRow}>
            {(['singles', 'doubles'] as MatchType[]).map(mt => (
              <TouchableOpacity
                key={mt}
                onPress={() => setMatchType(mt)}
                style={[modal.chip, matchType === mt && modal.chipActive, { flex: 1 }]}
                activeOpacity={0.75}
              >
                <Text style={[modal.chipText, matchType === mt && modal.chipTextActive]}>
                  {i18n.t(`newMatch.matchType.${mt}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Opponent */}
        <Section>
          <OpponentSearch
            state={opponent}
            onChange={setOpponent}
            label={i18n.t('newMatch.opponent.label')}
            currentUserId={userId!}
          />
        </Section>

        {/* Surface */}
        <Section label={i18n.t('newMatch.surface')}>
          <View style={modal.chipRow}>
            {SURFACES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSurface(s)}
                style={[modal.chip, surface === s && modal.chipActive, { flex: 1 }]}
                activeOpacity={0.75}
              >
                <Text style={[modal.chipText, surface === s && modal.chipTextActive]}>
                  {SURFACE_EMOJI[s]} {i18n.t(`dashboard.matchCard.surface.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Sets */}
        <Section label={i18n.t('newMatch.sets.label')}>
          {sets.map((set, i) => (
            <SetRow
              key={i}
              index={i}
              set={set}
              onChange={s => updateSet(i, s)}
              onRemove={() => removeSet(i)}
              myLabel={i18n.t('newMatch.sets.you')}
              oppLabel={i18n.t('newMatch.sets.opponent')}
            />
          ))}
          {sets.length < 5 && (
            <TouchableOpacity onPress={addSet} style={modal.addSetBtn} activeOpacity={0.75}>
              <Text style={modal.addSetText}>{i18n.t('newMatch.sets.addSet')}</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Winner */}
        <Section label={i18n.t('newMatch.winner.label')}>
          <View style={modal.chipRow}>
            {(['me', 'opponent', 'none'] as Winner[]).map(w => (
              <TouchableOpacity
                key={w}
                onPress={() => setWinner(w)}
                style={[modal.chip, winner === w && modal.chipActive, { flex: 1 }]}
                activeOpacity={0.75}
              >
                <Text style={[modal.chipText, winner === w && modal.chipTextActive]}>
                  {i18n.t(`newMatch.winner.${w === 'me' ? 'me' : w === 'opponent' ? 'opponent' : 'none'}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Notes */}
        <Section label={i18n.t('newMatch.notes')}>
          <TextInput
            style={[modal.textArea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.textMuted}
            placeholder="Optional notes…"
            textAlignVertical="top"
          />
        </Section>

        <TouchableOpacity
          style={[modal.submitBtn, loading && modal.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#1a1a1a" />
            : <Text style={modal.submitText}>{i18n.t('newMatch.submit')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={modal.section}>
      {label && <Text style={modal.sectionLabel}>{label}</Text>}
      {children}
    </View>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cancel: { color: colors.aceGreen, fontSize: 16 },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  chipActive: { borderColor: colors.aceGreen, backgroundColor: `${colors.aceGreen}18` },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chipTextActive: { color: colors.aceGreen },
  addSetBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addSetText: { color: colors.textMuted, fontSize: 14 },
  textArea: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
  },
  submitBtn: {
    backgroundColor: colors.aceGreen,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
  // Success state
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  nudgeBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  nudgeText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  nudgeBtns: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  nudgeAdd: {
    backgroundColor: colors.aceGreen,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  nudgeAddText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  nudgeLater: { color: colors.textMuted, fontSize: 14, paddingVertical: 9 },
  nudgeSent: { color: colors.aceGreen, fontSize: 15, fontWeight: '600', marginBottom: 24 },
  doneBtn: {
    backgroundColor: colors.aceGreen,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  doneBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
});
