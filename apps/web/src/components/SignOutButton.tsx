'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

export default function SignOutButton() {
  const t = useTranslations('auth');
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
    >
      {t('signout')}
    </button>
  );
}
