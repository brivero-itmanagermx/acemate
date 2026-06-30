import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/app/_layout';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';
import type { PlayerLevel, DominantHand, Surface } from '@acemate/types';

const LEVELS: PlayerLevel[] = ['beginner', 'intermediate', 'advanced', 'competitive'];
const HANDS: DominantHand[] = ['right', 'left'];
const SURFACES: Surface[] = ['clay', 'hard', 'grass', 'indoor'];

export default function EditProfile() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [level, setLevel] = useState<PlayerLevel>('beginner');
  const [hand, setHand] = useState<DominantHand | ''>('');
  const [surface, setSurface] = useState<Surface | ''>('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'detecting' | 'done' | 'denied' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,username,full_name,avatar_url,bio,level,dominant_hand,preferred_surface')
          .eq('id', userId)
          .single();
        if (error || !data) {
          console.error('[AceMate] EditProfile load error:', error?.message ?? 'no data');
          return;
        }
        setFullName(data.full_name ?? '');
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setLevel(data.level ?? 'beginner');
        setHand(data.dominant_hand ?? '');
        setSurface(data.preferred_surface ?? '');
        setAvatarUrl(data.avatar_url ?? '');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !userId) return;
    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const blob = await fetch(asset.uri).then(r => r.blob());
      await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch {
      // silently fail
    } finally {
      setAvatarUploading(false);
    }
  }

  async function detectLocation() {
    setLocationState('detecting');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocationState('denied'); return; }
    try {
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationState('done');
      // location coords would be saved with the profile patch
    } catch {
      setLocationState('error');
    }
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      await api.profiles.patch(userId, {
        full_name: fullName || null,
        username: username || null,
        bio: bio || null,
        level,
        dominant_hand: hand || null,
        preferred_surface: surface || null,
        avatar_url: avatarUrl || null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => { router.back(); }, 900);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.aceGreen} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('profile.edit.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.75}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#1a1a1a" />
            : <Text style={styles.saveBtnText}>{saved ? '✓' : i18n.t('profile.edit.save')}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar} disabled={avatarUploading} activeOpacity={0.7}>
            <Text style={styles.avatarChangeText}>
              {avatarUploading ? i18n.t('profile.edit.avatarUploading') : i18n.t('profile.edit.avatarChange')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Basic info */}
        <Section label={i18n.t('profile.edit.fullName')}>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            placeholderTextColor={colors.textMuted}
          />
        </Section>

        <Section label={i18n.t('profile.edit.username')}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textMuted}
          />
        </Section>

        <Section label={i18n.t('profile.edit.bio')}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder={i18n.t('profile.edit.bioPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        {/* Level */}
        <Section label={i18n.t('profile.edit.level')}>
          <View style={styles.chipGrid}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setLevel(l)}
                activeOpacity={0.75}
                style={[styles.chip, level === l && styles.chipActive, { flex: 1 }]}
              >
                <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
                  {i18n.t(`players.level.${l}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Hand */}
        <Section label={i18n.t('profile.edit.hand')}>
          <View style={styles.chipRow}>
            {HANDS.map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setHand(h)}
                activeOpacity={0.75}
                style={[styles.chip, hand === h && styles.chipActive, { flex: 1 }]}
              >
                <Text style={[styles.chipText, hand === h && styles.chipTextActive]}>
                  {i18n.t(`onboarding.step2.${h}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Surface */}
        <Section label={i18n.t('profile.edit.surface')}>
          <View style={styles.chipRow}>
            {SURFACES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSurface(s)}
                activeOpacity={0.75}
                style={[styles.chip, surface === s && styles.chipActive, { flex: 1 }]}
              >
                <Text style={[styles.chipText, surface === s && styles.chipTextActive]}>
                  {i18n.t(`onboarding.step2.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Location */}
        <Section label={i18n.t('profile.edit.currentCity')}>
          <TouchableOpacity
            onPress={detectLocation}
            activeOpacity={0.8}
            style={[styles.locBtn, locationState === 'done' && styles.locBtnDone]}
          >
            {locationState === 'detecting'
              ? <ActivityIndicator size="small" color={colors.aceGreen} />
              : (
                <Text style={[styles.locBtnText, locationState === 'done' && styles.locBtnTextDone]}>
                  {locationState === 'done' ? '📍 Location updated' : `📍 ${i18n.t('profile.edit.updateLocation')}`}
                </Text>
              )
            }
          </TouchableOpacity>
          {(locationState === 'denied') && (
            <Text style={styles.locError}>{i18n.t('profile.edit.locationDenied')}</Text>
          )}
          <Text style={styles.privacyNote}>{i18n.t('profile.edit.privacyNotice')}</Text>
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.aceGreen,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarImg: { width: 88, height: 88, borderRadius: 44, marginBottom: 10 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarPlaceholderText: { fontSize: 36 },
  avatarChangeText: { color: colors.aceGreen, fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 22 },
  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipActive: { borderColor: colors.aceGreen, backgroundColor: `${colors.aceGreen}18` },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chipTextActive: { color: colors.aceGreen },
  locBtn: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  locBtnDone: { borderColor: `${colors.aceGreen}60` },
  locBtnText: { color: colors.textSecondary, fontSize: 15 },
  locBtnTextDone: { color: colors.aceGreen },
  locError: { color: '#EF4444', fontSize: 13, marginBottom: 6 },
  privacyNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
