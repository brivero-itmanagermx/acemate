import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Paths (without locale prefix) that require an active session
const PROTECTED = ['/dashboard', '/onboarding'];
// Paths that redirect already-authenticated users away to dashboard
const AUTH_ONLY = ['/auth/signin', '/auth/signup'];

function localeFromPath(pathname: string): string {
  const segment = pathname.split('/')[1];
  return routing.locales.includes(segment as (typeof routing.locales)[number])
    ? segment
    : routing.defaultLocale;
}

function stripLocale(pathname: string): string {
  const parts = pathname.split('/');
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    return '/' + parts.slice(2).join('/');
  }
  return pathname;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = stripLocale(pathname);
  const locale = localeFromPath(pathname);

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'));
  const isAuthOnly  = AUTH_ONLY.some((p) => path === p || path.startsWith(p + '/'));

  // Cookie written by apps/web/src/lib/supabase.ts cookieStorage
  const authenticated = !!request.cookies.get('acemate-auth')?.value;

  if (isProtected && !authenticated) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
  }

  if (isAuthOnly && authenticated) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
