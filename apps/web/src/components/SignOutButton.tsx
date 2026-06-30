'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

export default function SignOutButton() {
  const t      = useTranslations('auth');
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-am-border px-3 py-1.5 text-xs font-medium text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
    >
      {t('signout')}
    </button>
  );
}
