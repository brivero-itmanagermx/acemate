'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';

interface StepOneData {
  fullName:  string;
  username:  string;
  avatarUrl: string;
}

interface Props {
  data:     StepOneData;
  userId:   string;
  onChange: (fields: Partial<StepOneData>) => void;
  onNext:   () => void;
}

type UsernameStatus = 'idle' | 'too_short' | 'checking' | 'available' | 'taken';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function StepOne({ data, userId, onChange, onNext }: Props) {
  const t  = useTranslations('onboarding.step1');
  const tb = useTranslations('onboarding.buttons');

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(data.avatarUrl || null);
  const [uploading,      setUploading]      = useState(false);
  const [avatarError,    setAvatarError]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const username = data.username;
    if (!username)           { setUsernameStatus('idle');      return; }
    if (username.length < 3) { setUsernameStatus('too_short'); return; }

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

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);

    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

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

  const canProceed = data.fullName.trim().length > 0 && usernameStatus === 'available' && !uploading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-white/50">{t('subtitle')}</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-ace-green/20 border-2 border-ace-green/40 focus:outline-none focus:ring-2 focus:ring-ace-green focus:ring-offset-2 focus:ring-offset-am-surface"
        >
          {avatarPreview
            ? <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
            : <span className="text-4xl font-bold text-ace-green select-none">🎾</span>}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-ace-green border-t-transparent" />
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-sm font-semibold text-ace-green hover:underline"
        >
          {uploading ? t('avatarUploading') : t('avatarChange')}
        </button>
        {avatarError && <p className="text-xs text-red-400">{t('avatarError')}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Full name */}
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-white/60">
          {t('fullName')}
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={data.fullName}
          onChange={e => onChange({ fullName: e.target.value })}
          className="w-full rounded-lg border border-am-border bg-am-card px-4 py-2.5 text-white placeholder-white/30 focus:border-ace-green focus:outline-none focus:ring-1 focus:ring-ace-green"
        />
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-white/60">
          {t('username')}
        </label>
        <div className="relative">
          <input
            id="username"
            type="text"
            required
            value={data.username}
            onChange={e => onChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
            className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-white placeholder-white/30 focus:outline-none focus:ring-1 transition-colors bg-am-card ${
              usernameStatus === 'taken'
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : usernameStatus === 'available'
                  ? 'border-ace-green focus:border-ace-green focus:ring-ace-green'
                  : 'border-am-border focus:border-ace-green focus:ring-ace-green'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === 'checking'  && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />}
            {usernameStatus === 'available' && <span className="font-bold text-ace-green">✓</span>}
            {usernameStatus === 'taken'     && <span className="font-bold text-red-400">✗</span>}
          </div>
        </div>
        <p className={`mt-1.5 text-xs ${
          usernameStatus === 'taken'     ? 'text-red-400'   :
          usernameStatus === 'available' ? 'text-ace-green' :
                                          'text-white/30'
        }`}>
          {usernameStatus === 'taken'     ? t('usernameTaken')     :
           usernameStatus === 'available' ? t('usernameAvailable') :
           usernameStatus === 'too_short' ? t('usernameTooShort')  :
           usernameStatus === 'checking'  ? t('usernameChecking')  :
           t('usernameHint')}
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="rounded-lg bg-ace-green px-6 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tb('next')}
        </button>
      </div>
    </div>
  );
}
