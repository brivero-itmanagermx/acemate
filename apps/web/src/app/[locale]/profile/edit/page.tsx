'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import type { Profile } from '@acemate/types';

type UsernameStatus = 'idle' | 'too_short' | 'checking' | 'available' | 'taken';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const LEVELS = ['beginner', 'intermediate', 'advanced', 'competitive'] as const;
const HANDS  = ['left', 'right']                                        as const;
const SURFACES = ['clay', 'hard', 'grass', 'indoor']                   as const;

const LEVEL_EMOJI: Record<string, string> = {
  beginner:     '🌱',
  intermediate: '🎾',
  advanced:     '⭐',
  competitive:  '🏆',
};
const LEVEL_DESC_KEY = {
  beginner:     'beginnerDesc',
  intermediate: 'intermediateDesc',
  advanced:     'advancedDesc',
  competitive:  'competitiveDesc',
} as const;
const SURFACE_EMOJI: Record<string, string> = {
  clay: '🟤', hard: '🔵', grass: '🟢', indoor: '🏠',
};

export default function ProfileEditPage() {
  const t   = useTranslations('profile.edit');
  const t1  = useTranslations('onboarding.step1');
  const t2  = useTranslations('onboarding.step2');
  const router = useRouter();

  const [userId,    setUserId]    = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName,  setFullName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [bio,       setBio]       = useState('');
  const [level,     setLevel]     = useState('');
  const [hand,      setHand]      = useState<string | null>(null);
  const [surface,   setSurface]   = useState<string | null>(null);

  const [unameStatus, setUnameStatus] = useState<UsernameStatus>('idle');

  // Location state
  const [cityDisplay,  setCityDisplay]  = useState<string | null>(null);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingCity,  setPendingCity]  = useState<string | null>(null);
  const [locating,     setLocating]     = useState(false);
  const [locError,     setLocError]     = useState<string | null>(null);
  const [cityQuery,    setCityQuery]    = useState('');
  const [cityResults,  setCityResults]  = useState<NominatimResult[]>([]);
  const [cityOpen,     setCityOpen]     = useState(false);

  // Load profile on mount
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

  // Username uniqueness check (debounced 400ms)
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

  // City search debounce (400ms)
  useEffect(() => {
    if (!cityQuery.trim()) { setCityResults([]); setCityOpen(false); return; }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: cityQuery, format: 'json', limit: '5', addressdetails: '1',
        });
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

  // Avatar upload
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
      // silently fail — existing avatar remains
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Geolocation → reverse geocode display name
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
          const parts  = [city, region].filter(Boolean);
          setPendingCity(parts.length ? parts.join(', ') : null);
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

  // Save
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-6">

        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        <div className="space-y-6">

          {/* ── Avatar ─────────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('sections.avatar')}
            </h2>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-green-200 bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {avatarUrl
                  ? <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
                  : <span className="text-3xl">🎾</span>}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
                >
                  {uploading ? t('avatarUploading') : t('avatarChange')}
                </button>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG or GIF · max 5 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </section>

          {/* ── Basic info ─────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('sections.info')}
            </h2>
            <div className="space-y-4">

              {/* Full name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fullName')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('username')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-1 ${
                      unameStatus === 'taken'
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                        : unameStatus === 'available'
                          ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {unameStatus === 'checking'  && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />}
                    {unameStatus === 'available' && <span className="font-bold text-green-600">✓</span>}
                    {unameStatus === 'taken'     && <span className="font-bold text-red-500">✗</span>}
                  </div>
                </div>
                {unameStatus === 'taken'     && <p className="mt-1 text-xs text-red-500">{t1('usernameTaken')}</p>}
                {unameStatus === 'too_short' && <p className="mt-1 text-xs text-gray-400">{t1('usernameTooShort')}</p>}
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('bio')}</label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={t('bioPlaceholder')}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className={`mt-1 text-right text-xs ${bio.length >= 250 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {bio.length}/280
                </p>
              </div>
            </div>
          </section>

          {/* ── Your game ──────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('sections.game')}
            </h2>
            <div className="space-y-6">

              {/* Skill level */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">{t('level')}</p>
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
                            ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                        }`}
                      >
                        <span className="text-2xl">{LEVEL_EMOJI[lvl]}</span>
                        <div>
                          <div className={`text-sm font-semibold ${active ? 'text-green-800' : 'text-gray-800'}`}>
                            {t2(lvl)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t2(LEVEL_DESC_KEY[lvl])}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dominant hand */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">{t('hand')}</p>
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
                            ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                        }`}
                      >
                        {t2(h)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Surface */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">{t('surface')}</p>
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
                            ? 'border-green-600 bg-green-50 text-green-800 ring-1 ring-green-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
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

          {/* ── Location ───────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('sections.location')}
            </h2>
            <div className="space-y-4">

              {/* Current area */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-lg">📍</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">{t('currentCity')}</p>
                  <p className="truncate text-sm font-medium text-gray-900">
                    {locating ? '…' : (displayCity ?? t('noCity'))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locating}
                  className="shrink-0 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
                >
                  {locating ? t('detecting') : t('updateLocation')}
                </button>
              </div>

              {locError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                  {locError}
                </div>
              )}

              {/* City search */}
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">{t('citySearch')}</p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('citySearchPlaceholder')}
                    value={cityQuery}
                    onChange={e => setCityQuery(e.target.value)}
                    onFocus={() => cityResults.length > 0 && setCityOpen(true)}
                    onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  {cityOpen && cityResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      {cityResults.map(r => (
                        <button
                          key={r.place_id}
                          type="button"
                          onMouseDown={() => selectCity(r)}
                          className="w-full truncate px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-green-50"
                        >
                          📍 {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy notice */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <span className="mt-0.5 shrink-0">🔒</span>
                <p>{t('privacyNotice')}</p>
              </div>
            </div>
          </section>

          {/* ── Save bar ───────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
            <div className="text-sm">
              {error   && <p className="text-red-500">{error}</p>}
              {success && <p className="text-green-600">{t('saved')}</p>}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
