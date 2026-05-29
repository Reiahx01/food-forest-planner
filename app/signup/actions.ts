'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Server actions for the email + password signup flow.
 *
 * Why traditional auth (no magic link):
 * The magic-link flow needs a reliable email pipeline -- Supabase Auth
 * generates the link with `site_url` from config.toml, the SMTP path goes
 * through Mailpit locally / a real SMTP in prod, and the redirect URL has
 * to be on the allowlist. Each of those stages has been fragile in our
 * setup (see PRs #40, #41, #43). Password-based signup sidesteps the
 * entire pipeline -- the client sends the password, Supabase hashes it,
 * the session cookie is written on the response. No email round-trip.
 *
 * Email confirmation is disabled in `supabase/config.toml`
 * (`enable_confirmations = false`), so signup -> instant session. When the
 * email pipeline is solid we'll re-enable confirmations + add a real
 * password reset flow.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

export interface SignUpResult {
  ok: false;
  error: string;
}

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

function nonEmpty(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Server Action: create a new account via email + password. On success,
 * Supabase writes the session cookie via the adapter and we redirect to
 * /dashboard (the proxy will forward first-sign-in users to /onboarding).
 * On failure, returns `{ ok: false, error }` so the client form can
 * surface a clean message without unwinding the render.
 */
export async function signUp(formData: FormData): Promise<SignUpResult | never> {
  const email = nonEmpty(formData.get('email')).trim().toLowerCase();
  const password = nonEmpty(formData.get('password'));

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Supabase wraps "user already exists" with various phrasings depending
    // on confirm-mode + version. Match generously so we map the common case.
    if (/already|exists|registered/i.test(error.message)) {
      return {
        ok: false,
        error: 'An account with that email already exists. Sign in instead.',
      };
    }
    if (/password/i.test(error.message) && /weak|short|requirement/i.test(error.message)) {
      return { ok: false, error: 'That password is too weak. Try a longer one.' };
    }
    return {
      ok: false,
      error: 'Something went wrong creating your account. Please try again.',
    };
  }

  redirect('/dashboard');
}
