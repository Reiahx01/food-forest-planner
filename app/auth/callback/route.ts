import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Magic-link landing point. Supabase Auth sends the user here with `?code=...`
 * appended; we exchange the code for a session (which sets the auth cookie via
 * the cookie adapter) and redirect onward.
 *
 * Open-redirect defence: a `?next=` query is honoured only if it's a relative
 * path (starts with `/`). Absolute URLs are dropped on the floor.
 */

const DEFAULT_NEXT = '/dashboard';

async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        store.set({ name, value, ...(options ?? {}) });
      }
    },
  };
}

function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  // Reject anything that doesn't look like an absolute path on our own origin.
  // `/` start + no `://` is the simple, sufficient rule.
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) {
    return raw;
  }
  return DEFAULT_NEXT;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(
      new URL('/signup?error=missing_code', request.url),
    );
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL('/signup?error=invalid_link', request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
