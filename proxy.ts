import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Next 16 Proxy (replacement for `middleware.ts`) -- runs at the edge before
 * route rendering. Job: gate authenticated and onboarded paths cheaply, before
 * we pay for an SSR render of a page the user can't see.
 *
 * The full state machine for a request:
 *
 *   anon          -> /signup?next=<path>
 *   authed + not-onboarded
 *                 -> if on /onboarding: pass through.
 *                    else:               redirect to /onboarding.
 *   authed + onboarded
 *                 -> if on /onboarding: redirect forward to /dashboard.
 *                    else:               pass through.
 *
 * `app/onboarding/page.tsx` and `app/dashboard/page.tsx` repeat the same
 * checks server-side -- defence in depth so a misconfigured matcher can't
 * leak the wrong page.
 */

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/properties'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

function cookieAdapter(request: NextRequest, response: NextResponse): CookieAdapter {
  return {
    getAll: () =>
      request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        response.cookies.set({ name, value, ...(options ?? {}) });
      }
    },
  };
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const passthrough = NextResponse.next();
  const supabase = createServerSupabaseClient({
    cookies: cookieAdapter(request, passthrough),
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const signupUrl = new URL('/signup', request.url);
    signupUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signupUrl);
  }

  // One lightweight RLS-respecting read to check onboarded state. Could be
  // moved into a JWT claim later if this becomes a hot-path concern, but at
  // ~1ms per gated request it's a fine starting point.
  const { data: accountRow } = await supabase
    .from('accounts')
    .select('onboarded_at')
    .eq('id', userData.user.id)
    .single();

  const onboarded = Boolean(accountRow?.onboarded_at);

  if (!onboarded && !isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }
  if (onboarded && isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return passthrough;
}

export const config = {
  matcher: [
    // Match all request paths except _next assets, image optimisation,
    // favicon, and any asset with a file extension.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
