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
    fullName: '',
    username: '',
    avatarUrl: '',
    level: '',
    dominantHand: '',
    preferredSurface: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserId(user.id);
      setForm((prev) => ({
        ...prev,
        fullName: user.user_metadata?.full_name  ?? '',
        username: user.user_metadata?.username   ?? '',
      }));
    });
  }, [router]);

  function update(fields: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...fields }));
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
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stepLabels: [string, string, string] = [
    t('steps.aboutYou'),
    t('steps.yourGame'),
    t('steps.location'),
  ];

  return (
    <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🎾</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">AceMate</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <StepIndicator current={step} labels={stepLabels} />

          <div className="p-8">
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
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
