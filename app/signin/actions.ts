'use server';

import { cookies } from 'next/headers';

import { siteOrigin } from '@/lib/env';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignInResult =
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
 * Server Action: ask Supabase Auth to send a sign-in magic-link to the
 * address. Unlike `requestMagicLink` in `/signup`, this uses
 * `shouldCreateUser: false` — Supabase rejects unknown emails and we surface
 * a "no account found" hint that points the user at `/signup`.
 *
 * Discipline mirrors the signup action: always returns a structured
 * `{ ok, ... }` shape, never leaks Supabase's internal error message
 * verbatim, and lands at `/auth/callback` for the code exchange.
 */
export async function signIn(formData: FormData): Promise<SignInResult> {
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
      shouldCreateUser: false,
    },
  });

  if (error) {
    // Supabase returns a "signup is disabled" / "user not found" style error
    // when shouldCreateUser=false and the email isn't on file. We don't
    // distinguish at the network level (timing-attack hygiene) but we do
    // hint at the recovery path: visit /signup.
    const message = error.message?.toLowerCase() ?? '';
    if (message.includes('signup') || message.includes('not allowed') || message.includes('user not found')) {
      return {
        ok: false,
        error: "We don't recognise that email. If you're new, sign up first.",
      };
    }
    return {
      ok: false,
      error: 'Something went wrong sending the magic link -- please try again in a minute.',
    };
  }

  return { ok: true, email };
}
