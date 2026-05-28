'use server';

import { cookies } from 'next/headers';

import { siteOrigin } from '@/lib/env';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Minimal RFC-5322-ish email check. Real validation happens on the bounce --
 * we only catch the obvious typos client-side. The Supabase Auth API does its
 * own check before sending.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RequestMagicLinkResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

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

/**
 * Server Action: ask Supabase Auth to send a magic-link email to the address.
 *
 * Discipline:
 *   - Always returns a structured `{ ok, ... }` -- never throws across the
 *     client boundary.
 *   - Errors from Supabase are mapped to a single generic message so we
 *     don't leak rate-limit IPs / internal codes to the form UI.
 *   - The OTP flow is configured to land at /auth/callback, which exchanges
 *     the code for a session and redirects to /dashboard.
 */
export async function requestMagicLink(formData: FormData): Promise<RequestMagicLinkResult> {
  const raw = formData.get('email');
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      ok: false,
      error: "Something went wrong sending the magic link -- please try again in a minute.",
    };
  }

  return { ok: true, email };
}
