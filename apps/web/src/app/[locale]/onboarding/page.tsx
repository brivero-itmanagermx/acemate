'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepOne      from '@/components/onboarding/StepOne';
import StepTwo      from '@/components/onboarding/StepTwo';
import StepThree    from '@/components/onboarding/StepThree';

interface FormData {
  fullName: string;
  username: string;
  avatarUrl: string;
  level: string;
  dominantHand: string;
  preferredSurface: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function OnboardingPage() {
  const t      = useTranslations('onboarding');
  const router = useRouter();

  const [step,   setStep]   = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    fullName: '', username: '', avatarUrl: '',
    level: '', dominantHand: '', preferredSurface: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);
      setForm(prev => ({
        ...prev,
        fullName: user.user_metadata?.full_name ?? '',
        username: user.user_metadata?.username  ?? '',
      }));
    });
  }, [router]);

  function update(fields: Partial<FormData>) {
    setForm(prev => ({ ...prev, ...fields }));
  }

  async function handleFinish(location: { latitude: number | null; longitude: number | null }) {
    if (!userId) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      full_name:         form.fullName   || null,
      username:          form.username   || null,
      avatar_url:        form.avatarUrl  || null,
      level:             form.level      || 'beginner',
      dominant_hand:     form.dominantHand     || null,
      preferred_surface: form.preferredSurface || null,
    };

    if (location.latitude !== null && location.longitude !== null) {
      body.latitude  = location.latitude;
      body.longitude = location.longitude;
    }

    try {
      const res = await fetch(`${API}/api/v1/profiles/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unexpected error');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ace-green border-t-transparent" />
      </div>
    );
  }

  const stepLabels: [string, string, string] = [
    t('steps.aboutYou'),
    t('steps.yourGame'),
    t('steps.location'),
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-am-bg px-4 py-10">
      <div className="w-full max-w-2xl">

        <div className="mb-8 text-center">
          <span className="text-5xl">🎾</span>
          <h1 className="mt-3 text-3xl font-extrabold text-white">AceMate</h1>
        </div>

        <div className="rounded-2xl border border-am-border bg-am-surface">
          <StepIndicator current={step} labels={stepLabels} />

          <div className="p-8">
            {error && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {step === 1 && (
              <StepOne
                data={{ fullName: form.fullName, username: form.username, avatarUrl: form.avatarUrl }}
                userId={userId}
                onChange={update}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepTwo
                data={{ level: form.level, dominantHand: form.dominantHand, preferredSurface: form.preferredSurface }}
                onChange={update}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <StepThree
                saving={saving}
                onBack={() => setStep(2)}
                onFinish={handleFinish}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
