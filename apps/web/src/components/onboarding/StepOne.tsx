'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';

interface StepOneData {
  fullName: string;
  username: string;
  avatarUrl: string;
}

interface Props {
  data: StepOneData;
  userId: string;
  onChange: (fields: Partial<StepOneData>) => void;
  onNext: () => void;
}

type UsernameStatus = 'idle' | 'too_short' | 'checking' | 'available' | 'taken';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function StepOne({ data, userId, onChange, onNext }: Props) {
  const t  = useTranslations('onboarding.step1');
  const tb = useTranslations('onboarding.buttons');

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [avatarPreview, setAvatarPreview]   = useState<string | null>(data.avatarUrl || null);
  const [uploading, setUploading]           = useState(false);
  const [avatarError, setAvatarError]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounced username uniqueness check — uses excludeId so the user's own existing
  // username (created by the DB trigger at signup) shows as "available"
  useEffect(() => {
    const username = data.username;

    if (!username) {
      setUsernameStatus('idle');
      return;
    }
    if (username.length < 3) {
      setUsernameStatus('too_short');
      return;
    }

    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const url = `${API}/api/v1/profiles/username-check?username=${encodeURIComponent(username)}&excludeId=${userId}`;
        const res = await fetch(url);
        const { available } = await res.json();
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [data.username, userId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(false);

    // Local preview immediately, upload in background
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);

    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

      // Requires an "avatars" bucket in Supabase Storage with:
      //   - Public read access
      //   - INSERT/UPDATE policy: auth.uid()::text = (storage.foldername(name))[1]
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      onChange({ avatarUrl: publicUrl });
    } catch {
      setAvatarError(true);
      setAvatarPreview(data.avatarUrl || null);
    } finally {
      setUploading(false);
    }
  }

  const canProceed =
    data.fullName.trim().length > 0 &&
    usernameStatus === 'available' &&
    !uploading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl select-none">🎾</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-sm font-medium text-green-700 hover:underline"
        >
          {uploading ? t('avatarUploading') : t('avatarChange')}
        </button>

        {avatarError && (
          <p className="text-xs text-red-500">{t('avatarError')}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Full name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('fullName')}
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={data.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('username')}
        </label>
        <div className="relative">
          <input
            id="username"
            type="text"
            required
            value={data.username}
            onChange={(e) =>
              onChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
            }
            className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-gray-900 focus:outline-none focus:ring-1 transition-colors ${
              usernameStatus === 'taken'
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                : usernameStatus === 'available'
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === 'checking' && (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            )}
            {usernameStatus === 'available' && <span className="text-green-600 font-bold">✓</span>}
            {usernameStatus === 'taken'     && <span className="text-red-500 font-bold">✗</span>}
          </div>
        </div>

        <p className={`mt-1.5 text-xs ${
          usernameStatus === 'taken'     ? 'text-red-500'   :
          usernameStatus === 'available' ? 'text-green-600' :
          usernameStatus === 'too_short' ? 'text-gray-400'  :
          'text-gray-400'
        }`}>
          {usernameStatus === 'taken'     ? t('usernameTaken')     :
           usernameStatus === 'available' ? t('usernameAvailable') :
           usernameStatus === 'too_short' ? t('usernameTooShort')  :
           usernameStatus === 'checking' ? t('usernameChecking')   :
           t('usernameHint')}
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
        >
          {tb('next')}
        </button>
      </div>
    </div>
  );
}
