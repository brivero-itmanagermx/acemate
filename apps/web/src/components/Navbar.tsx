'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import SignOutButton from './SignOutButton';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Navbar() {
  const t        = useTranslations('nav');
  const pathname = usePathname();

  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const [profileRes, requestsRes] = await Promise.all([
        fetch(`${API}/api/v1/profiles/${user.id}`),
        fetch(`${API}/api/v1/friendships/requests?userId=${user.id}`),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json() as { avatarUrl: string | null };
        setAvatarUrl(p.avatarUrl);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json() as unknown[];
        setPendingCount(Array.isArray(data) ? data.length : 0);
      }
    });
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="text-xl">🎾</span>
          <span className="hidden font-bold text-gray-900 sm:inline">AceMate</span>
        </Link>

        {/* Nav links */}
        <div className="flex flex-1 items-center gap-1">
          {([
            { href: '/dashboard', label: t('dashboard') },
            { href: '/players',   label: t('players')   },
          ] as const).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Friends with badge */}
          <Link
            href="/friends"
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive('/friends')
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {t('friends')}
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        </div>

        {/* Right: avatar (links to profile edit) + sign out */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/profile/edit"
            className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-100 transition-opacity hover:opacity-80"
            title="Edit profile"
          >
            {avatarUrl
              ? <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
              : <span className="text-sm">👤</span>}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
