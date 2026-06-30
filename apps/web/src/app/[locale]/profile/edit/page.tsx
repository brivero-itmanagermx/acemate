'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import type { Profile } from '@acemate/types';

type UsernameStatus = 'idle' | 'too_short' | 'checking' | 'available' | 'taken';

interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const LEVELS   = ['beginner', 'intermediate', 'advanced', 'competitive'] as const;
const HANDS    = ['left', 'right']                                        as const;
const SURFACES = ['clay', 'hard', 'grass', 'indoor']                     as const;

const LEVEL_EMOJI: Record<string, string> = {
  beginner: '🌱', intermediate: '🎾', advanced: '⭐', competitive: '🏆',
};
const LEVEL_DESC_KEY = {
  beginner: 'beginnerDesc', intermediate: 'intermediateDesc',
  advanced: 'advancedDesc', competitive:  'competitiveDesc',
} as const;
const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

const SECTION = 'rounded-xl border border-am-border bg-am-surface p-6';
const SECTION_TITLE = 'mb-5 text-[11px] font-semibold uppercase tracking-wider text-white/35';
const INPUT = 'w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green';
const LABEL = 'mb-1.5 block text-sm font-medium text-white/60';

export default function ProfileEditPage() {
  const t      = useTranslations('profile.edit');
  const t1     = useTranslations('onboarding.step1');
  const t2     = useTranslations('onboarding.step2');
  const router = useRouter();

  const [userId,    setUserId]    = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName,  setFullName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [bio,       setBio]       = useState('');
  const [level,     setLevel]     = useState('');
  const [hand,      setHand]      = useState<string | null>(null);
  const [surface,   setSurface]   = useState<string | null>(null);

  const [unameStatus, setUnameStatus] = useState<UsernameStatus>('idle');

  const [cityDisplay,  setCityDisplay]  = useState<string | null>(null);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingCity,  setPendingCity]  = useState<string | null>(null);
  const [locating,     setLocating]     = useState(false);
  const [locError,     setLocError]     = useState<string | null>(null);
  const [cityQuery,    setCityQuery]    = useState('');
  const [cityResults,  setCityResults]  = useState<NominatimResult[]>([]);
  const [cityOpen,     setCityOpen]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);

      const [profileRes, locationRes] = await Promise.all([
        fetch(`${API}/api/v1/profiles/${user.id}`),
        fetch(`${API}/api/v1/profiles/${user.id}/location`),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json() as Profile;
        setAvatarUrl(p.avatarUrl);
        setFullName(p.fullName ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setLevel(p.level ?? '');
        setHand(p.dominantHand ?? null);
        setSurface(p.preferredSurface ?? null);
      }

      if (locationRes.ok) {
        const loc = await locationRes.json() as { city: string | null };
        setCityDisplay(loc.city);
      }

      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    if (!username) { setUnameStatus('idle'); return; }
    if (username.length < 3) { setUnameStatus('too_short'); return; }

    setUnameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/api/v1/profiles/username-check?username=${encodeURIComponent(username)}&excludeId=${userId}`
        );
        const { available } = await res.json() as { available: boolean };
        setUnameStatus(available ? 'available' : 'taken');
      } catch {
        setUnameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, userId]);

  useEffect(() => {
    if (!cityQuery.trim()) { setCityResults([]); setCityOpen(false); return; }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: cityQuery, format: 'json', limit: '5', addressdetails: '1' });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'en' },
        });
        const results = await res.json() as NominatimResult[];
        setCityResults(results);
        setCityOpen(results.length > 0);
      } catch {
        setCityResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch {
      // Silently fail — existing avatar remains
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocError(t('locationError')); return; }
    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPendingCoord({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json() as {
            address?: { city?: string; town?: string; village?: string; state?: string };
          };
          const city   = data.address?.city ?? data.address?.town ?? data.address?.village ?? null;
          const region = data.address?.state ?? null;
          setPendingCity([city, region].filter(Boolean).join(', ') || null);
        } catch {
          setPendingCity(null);
        }
        setLocating(false);
      },
      (err) => {
        setLocError(err.code === err.PERMISSION_DENIED ? t('locationDenied') : t('locationError'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  function selectCity(result: NominatimResult) {
    setPendingCoord({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setPendingCity(result.display_name);
    setCityQuery('');
    setCityResults([]);
    setCityOpen(false);
  }

  async function handleSave() {
    if (!userId || saving || !canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const body: Record<string, unknown> = {
      full_name:         fullName.trim() || null,
      username:          username.toLowerCase(),
      bio:               bio.trim() || null,
      level:             level || null,
      dominant_hand:     hand,
      preferred_surface: surface,
      avatar_url:        avatarUrl,
    };

    if (pendingCoord) {
      body.latitude  = pendingCoord.lat;
      body.longitude = pendingCoord.lng;
    }

    try {
      const res = await fetch(`${API}/api/v1/profiles/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? 'Failed to save');
      }

      if (pendingCity !== null) {
        setCityDisplay(pendingCity);
        setPendingCity(null);
        setPendingCoord(null);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    !saving && !uploading &&
    unameStatus !== 'taken' && unameStatus !== 'checking' && unameStatus !== 'too_short';

  const displayCity = pendingCity ?? cityDisplay;

  if (loading) {
    return (
      <div className="min-h-screen bg-am-bg">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-am-bg">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        </div>

        <div className="space-y-5">

          {/* ── Avatar ── */}
          <section className={SECTION} style={{ borderWidth: '0.5px' }}>
            <h2 className={SECTION_TITLE}>{t('sections.avatar')}</h2>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ace-green/30 bg-ace-green/10 focus:outline-none focus:ring-2 focus:ring-ace-green focus:ring-offset-2 focus:ring-offset-am-surface"
              >
                {avatarUrl
                  ? <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
                  : <span className="text-3xl">🎾</span>}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-ace-green border-t-transparent" />
                  </div>
                )}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="text-sm font-semibold text-ace-green hover:underline disabled:opacity-50"
                >
                  {uploading ? t('avatarUploading') : t('avatarChange')}
                </button>
                <p className="mt-1 text-xs text-white/30">JPG, PNG or GIF · max 5 MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </section>

          {/* ── Basic info ── */}
          <section className={SECTION} style={{ borderWidth: '0.5px' }}>
            <h2 className={SECTION_TITLE}>{t('sections.info')}</h2>
            <div className="space-y-4">

              <div>
                <label className={LABEL}>{t('fullName')}</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>{t('username')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`${INPUT} pr-10 ${
                      unameStatus === 'taken'
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : unameStatus === 'available'
                          ? 'border-ace-green focus:border-ace-green focus:ring-ace-green'
                          : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {unameStatus === 'checking'  && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />}
                    {unameStatus === 'available' && <span className="font-bold text-ace-green">✓</span>}
                    {unameStatus === 'taken'     && <span className="font-bold text-red-400">✗</span>}
                  </div>
                </div>
                {unameStatus === 'taken'     && <p className="mt-1 text-xs text-red-400">{t1('usernameTaken')}</p>}
                {unameStatus === 'too_short' && <p className="mt-1 text-xs text-white/30">{t1('usernameTooShort')}</p>}
              </div>

              <div>
                <label className={LABEL}>{t('bio')}</label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={t('bioPlaceholder')}
                  className={`${INPUT} resize-none`}
                />
                <p className={`mt-1 text-right text-xs ${bio.length >= 250 ? 'text-amber-400' : 'text-white/25'}`}>
                  {bio.length}/280
                </p>
              </div>
            </div>
          </section>

          {/* ── Your game ── */}
          <section className={SECTION} style={{ borderWidth: '0.5px' }}>
            <h2 className={SECTION_TITLE}>{t('sections.game')}</h2>
            <div className="space-y-6">

              <div>
                <p className="mb-3 text-sm font-medium text-white/60">{t('level')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {LEVELS.map(lvl => {
                    const active = level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(lvl)}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                          active
                            ? 'border-ace-green bg-ace-green/10'
                            : 'border-am-border bg-am-card hover:border-ace-green/40'
                        }`}
                      >
                        <span className="text-2xl">{LEVEL_EMOJI[lvl]}</span>
                        <div>
                          <div className={`text-sm font-semibold ${active ? 'text-ace-green' : 'text-white'}`}>
                            {t2(lvl)}
                          </div>
                          <div className="text-xs text-white/40">{t2(LEVEL_DESC_KEY[lvl])}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-white/60">{t('hand')}</p>
                <div className="flex gap-3">
                  {HANDS.map(h => {
                    const active = hand === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHand(hand === h ? null : h)}
                        className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                          active
                            ? 'border-ace-green bg-ace-green/10 text-ace-green'
                            : 'border-am-border bg-am-card text-white/50 hover:border-ace-green/40'
                        }`}
                      >
                        {t2(h)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-white/60">{t('surface')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {SURFACES.map(s => {
                    const active = surface === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSurface(surface === s ? null : s)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all ${
                          active
                            ? 'border-ace-green bg-ace-green/10 text-ace-green'
                            : 'border-am-border bg-am-card text-white/50 hover:border-ace-green/40'
                        }`}
                      >
                        <span className="text-xl">{SURFACE_EMOJI[s]}</span>
                        {t2(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ── Location ── */}
          <section className={SECTION} style={{ borderWidth: '0.5px' }}>
            <h2 className={SECTION_TITLE}>{t('sections.location')}</h2>
            <div className="space-y-4">

              <div className="flex items-center gap-3 rounded-xl border border-am-border bg-am-card px-4 py-3" style={{ borderWidth: '0.5px' }}>
                <span className="text-lg">📍</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/35">{t('currentCity')}</p>
                  <p className="truncate text-sm font-medium text-white">
                    {locating ? '…' : (displayCity ?? t('noCity'))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locating}
                  className="shrink-0 rounded-lg border border-ace-green/30 bg-ace-green/8 px-3 py-1.5 text-xs font-medium text-ace-green transition-colors hover:bg-ace-green/15 disabled:opacity-50"
                >
                  {locating ? t('detecting') : t('updateLocation')}
                </button>
              </div>

              {locError && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400">
                  {locError}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-white/40">{t('citySearch')}</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('citySearchPlaceholder')}
                    value={cityQuery}
                    onChange={e => setCityQuery(e.target.value)}
                    onFocus={() => cityResults.length > 0 && setCityOpen(true)}
                    onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                    className={INPUT}
                  />
                  {cityOpen && cityResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-am-border bg-[#1e1e1e] shadow-xl">
                      {cityResults.map(r => (
                        <button
                          key={r.place_id}
                          type="button"
                          onMouseDown={() => selectCity(r)}
                          className="w-full truncate px-4 py-3 text-left text-sm text-white/70 transition-colors hover:bg-ace-green/10 hover:text-white"
                        >
                          📍 {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/4 px-4 py-3 text-xs text-white/40">
                <span className="mt-0.5 shrink-0">🔒</span>
                <p>{t('privacyNotice')}</p>
              </div>
            </div>
          </section>

          {/* ── Save bar ── */}
          <div className="flex items-center justify-between rounded-xl border border-am-border bg-am-surface px-6 py-4" style={{ borderWidth: '0.5px' }}>
            <div className="text-sm">
              {error   && <p className="text-red-400">{error}</p>}
              {success && <p className="font-medium text-ace-green">{t('saved')}</p>}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg bg-ace-green px-6 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
