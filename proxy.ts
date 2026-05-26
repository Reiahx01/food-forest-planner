import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Next 16 Proxy (formerly `middleware.ts`) -- runs at the edge before route
 * rendering. Job: gate authenticated paths cheaply.
 *
 * Two-layer auth defence:
 *   - Edge: this proxy short-circuits anon requests to /dashboard so we never
 *     pay for an SSR render of a page the user can't see.
 *   - Origin: `app/dashboard/page.tsx` also calls `getCurrentAccount()` and
 *     `redirect('/signup')` itself. If the proxy is misconfigured, the page
 *     still refuses.
 *
 * `?next=` preserves the path the user tried to reach, so /auth/callback can
 * land them back where they started.
 */

const PROTECTED_PREFIXES = ['/dashboard'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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

  // Build the passthrough response first; supabase-ssr writes refreshed
  // cookies into it via the adapter.
  const passthrough = NextResponse.next();
  const supabase = createServerSupabaseClient({
    cookies: cookieAdapter(request, passthrough),
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const signupUrl = new URL('/signup', request.url);
    signupUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signupUrl);
  }

  return passthrough;
}

/**
 * Matcher excludes _next assets, image optimisation, favicon, and the API
 * surface from the proxy. We only want auth-checks on user-facing pages.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation files)
     * - favicon.ico  (browser favicon)
     * - any path containing a file extension (.png, .ico, etc -- assets)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
