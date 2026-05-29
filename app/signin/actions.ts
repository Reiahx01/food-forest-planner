'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

/**
 * Server action for email + password sign-in. Mirrors `/signup/actions.ts`
 * but calls `signInWithPassword`. See that file for the rationale behind
 * dropping magic-link in favour of traditional auth.
 *
 * Password reset (a "forgot password" flow) is a follow-up PR -- in the
 * meantime, operator-level password reset via the Supabase admin panel is
 * the recovery path.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignInResult {
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

export async function signIn(formData: FormData): Promise<SignInResult | never> {
  const email = nonEmpty(formData.get('email')).trim().toLowerCase();
  const password = nonEmpty(formData.get('password'));

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (password.length === 0) {
    return { ok: false, error: 'Please enter your password.' };
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't differentiate between "no such account" and "wrong password" --
    // that's a user-enumeration vulnerability. Generic message either way.
    if (/credentials|invalid|email\s*not\s*confirmed/i.test(error.message)) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }
    return {
      ok: false,
      error: 'Something went wrong signing you in. Please try again.',
    };
  }

  redirect('/dashboard');
}
