import { createClient } from '@supabase/supabase-js';

// Cookie-based storage so the session is readable in Next.js middleware (Edge runtime).
// localStorage is not accessible there, but request.cookies is.
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    const maxAge = 60 * 60 * 24 * 7; // 7 days — matches Supabase default session length
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
  },
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: cookieStorage,
      storageKey: 'acemate-auth',
    },
  }
);
