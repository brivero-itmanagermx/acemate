import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuth } from '@/app/_layout';
import { colors } from '@/theme';
import i18n from '@/lib/i18n';

type Step = 1 | 2 | 3;

interface FormData {
  fullName: string;
  username: string;
  avatarUrl: string;
  level: string;
  dominantHand: string;
  preferredSurface: string;
}

const LEVELS = ['beginner', 'intermediate', 'advanced', 'competitive'] as const;
const HANDS  = ['right', 'left'] as const;
const SURFACES = ['clay', 'hard', 'grass', 'indoor'] as const;

function StepIndicator({ current }: { current: Step }) {
  const labels = [
    i18n.t('onboarding.steps.aboutYou'),
    i18n.t('onboarding.steps.yourGame'),
    i18n.t('onboarding.steps.location'),
  ];
  return (
    <View style={ind.container}>
      {labels.map((label, idx) => {
        const n = (idx + 1) as Step;
        const done = current > n;
        const active = current === n;
        return (
          <View key={n} style={ind.item}>
            <View style={[ind.circle, done && ind.circleDone, active && ind.circleActive]}>
              <Text style={[ind.circleText, (done || active) && ind.circleTextActive]}>
                {done ? '✓' : n}
              </Text>
            </View>
            <Text style={[ind.label, active && ind.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const ind = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 24,
  },
  item: { alignItems: 'center', gap: 4 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: colors.aceGreen, borderColor: colors.aceGreen },
  circleActive: { borderColor: colors.aceGreen },
  circleText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  circleTextActive: { color: colors.aceGreen },
  label: { fontSize: 11, color: colors.textMuted },
  labelActive: { color: colors.textPrimary },
});

export default function Onboarding() {
  const { userId } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'detecting' | 'detected' | 'denied' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [form, setForm] = useState<FormData>({
    fullName: '', username: '', avatarUrl: '',
    level: '', dominantHand: '', preferredSurface: '',
  });

  function update(fields: Partial<FormData>) {
    setForm(prev => ({ ...prev, ...fields }));
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    if (!userId) return;

    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const blob = await fetch(asset.uri).then(r => r.blob());
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      update({ avatarUrl: publicUrl });
    } catch {
      setError(i18n.t('onboarding.step1.avatarError'));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function detectLocation() {
    setLocationState('detecting');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationState('denied');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      setLocationState('detected');
    } catch {
      setLocationState('error');
    }
  }

  async function handleFinish() {
    if (!userId) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      full_name:         form.fullName || null,
      username:          form.username || null,
      avatar_url:        form.avatarUrl || null,
      level:             form.level || 'beginner',
      dominant_hand:     form.dominantHand || null,
      preferred_surface: form.preferredSurface || null,
    };
    if (coords) {
      body.latitude  = coords.lat;
      body.longitude = coords.lon;
    }

    try {
      await api.profiles.patch(userId, body);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🎾</Text>
          <Text style={styles.appName}>AceMate</Text>
        </View>

        <View style={styles.card}>
          <StepIndicator current={step} />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Step 1: About you */}
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>{i18n.t('onboarding.step1.title')}</Text>
              <Text style={styles.stepSubtitle}>{i18n.t('onboarding.step1.subtitle')}</Text>

              {/* Avatar */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarBtn}>
                  {form.avatarUrl ? (
                    <Image source={{ uri: form.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>📷</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7} disabled={avatarUploading}>
                  <Text style={styles.avatarChangeText}>
                    {avatarUploading ? i18n.t('onboarding.step1.avatarUploading') : i18n.t('onboarding.step1.avatarChange')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{i18n.t('onboarding.step1.fullName')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.fullName}
                  onChangeText={v => update({ fullName: v })}
                  autoComplete="name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{i18n.t('onboarding.step1.username')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.username}
                  onChangeText={v => update({ username: v.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hint}>{i18n.t('onboarding.step1.usernameHint')}</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{i18n.t('onboarding.buttons.next')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Your game */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>{i18n.t('onboarding.step2.title')}</Text>
              <Text style={styles.stepSubtitle}>{i18n.t('onboarding.step2.subtitle')}</Text>

              <Text style={styles.sectionLabel}>{i18n.t('onboarding.step2.levelLabel')}</Text>
              <View style={styles.chipGrid}>
                {LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => update({ level })}
                    activeOpacity={0.75}
                    style={[styles.chip, form.level === level && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, form.level === level && styles.chipTextSelected]}>
                      {i18n.t(`onboarding.step2.${level}`)}
                    </Text>
                    <Text style={styles.chipDesc}>
                      {i18n.t(`onboarding.step2.${level}Desc`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{i18n.t('onboarding.step2.handLabel')}</Text>
              <View style={styles.chipRow}>
                {HANDS.map(hand => (
                  <TouchableOpacity
                    key={hand}
                    onPress={() => update({ dominantHand: hand })}
                    activeOpacity={0.75}
                    style={[styles.chipSmall, form.dominantHand === hand && styles.chipSelected, { flex: 1 }]}
                  >
                    <Text style={[styles.chipText, form.dominantHand === hand && styles.chipTextSelected]}>
                      {i18n.t(`onboarding.step2.${hand}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{i18n.t('onboarding.step2.surfaceLabel')}</Text>
              <View style={styles.chipRow}>
                {SURFACES.map(surf => (
                  <TouchableOpacity
                    key={surf}
                    onPress={() => update({ preferredSurface: surf })}
                    activeOpacity={0.75}
                    style={[styles.chipSmall, form.preferredSurface === surf && styles.chipSelected, { flex: 1 }]}
                  >
                    <Text style={[styles.chipText, form.preferredSurface === surf && styles.chipTextSelected]}>
                      {i18n.t(`onboarding.step2.${surf}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.75}>
                  <Text style={styles.backBtnText}>{i18n.t('onboarding.buttons.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setStep(3)} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>{i18n.t('onboarding.buttons.next')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>{i18n.t('onboarding.step3.title')}</Text>
              <Text style={styles.stepSubtitle}>{i18n.t('onboarding.step3.subtitle')}</Text>

              <Text style={styles.desc}>{i18n.t('onboarding.step3.description')}</Text>

              {locationState === 'idle' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={detectLocation} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>{i18n.t('onboarding.step3.allowButton')}</Text>
                </TouchableOpacity>
              )}
              {locationState === 'detecting' && (
                <View style={styles.centered}>
                  <ActivityIndicator color={colors.aceGreen} />
                  <Text style={styles.dimText}>{i18n.t('onboarding.step3.detecting')}</Text>
                </View>
              )}
              {locationState === 'detected' && coords && (
                <View style={styles.detectedBox}>
                  <Text style={styles.detectedText}>📍 {i18n.t('onboarding.step3.detected')}</Text>
                  <Text style={styles.coordsText}>
                    {i18n.t('onboarding.step3.coords', { lat: coords.lat.toFixed(4), lon: coords.lon.toFixed(4) })}
                  </Text>
                </View>
              )}
              {(locationState === 'denied' || locationState === 'error') && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    {locationState === 'denied'
                      ? i18n.t('onboarding.step3.permissionDenied')
                      : i18n.t('onboarding.step3.genericError')}
                  </Text>
                </View>
              )}

              <View style={styles.privacyBox}>
                <Text style={styles.privacyText}>{i18n.t('onboarding.step3.privacyNotice')}</Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)} activeOpacity={0.75}>
                  <Text style={styles.backBtnText}>{i18n.t('onboarding.buttons.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, saving && styles.btnDisabled]}
                  onPress={handleFinish}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? i18n.t('onboarding.buttons.finishing') : i18n.t('onboarding.buttons.finish')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleFinish} style={styles.skipBtn} activeOpacity={0.6}>
                <Text style={styles.skipText}>{i18n.t('onboarding.buttons.skip')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 44 },
  appName: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 24,
  },
  stepTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 14 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarBtn: { marginBottom: 8 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { fontSize: 30 },
  avatarChangeText: { color: colors.aceGreen, fontSize: 14, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  sectionLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  hint: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  chipGrid: { gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  chipSmall: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: colors.aceGreen,
    backgroundColor: `${colors.aceGreen}18`,
  },
  chipText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: colors.aceGreen },
  chipDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  desc: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  dimText: { color: colors.textMuted, fontSize: 14 },
  detectedBox: {
    backgroundColor: `${colors.aceGreen}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${colors.aceGreen}40`,
    padding: 14,
    marginBottom: 16,
  },
  detectedText: { color: colors.aceGreen, fontWeight: '600', marginBottom: 4 },
  coordsText: { color: colors.textSecondary, fontSize: 12 },
  warningBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  warningText: { color: '#EF4444', fontSize: 14 },
  privacyBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  privacyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: colors.aceGreen,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  backBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backBtnText: { color: colors.textSecondary, fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
