'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ACCOUNT_ROLES, type AccountRole } from '@/db/schema/accounts';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

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
 * Server Action: write the role the user picked + mark them onboarded, then
 * send them on to /dashboard.
 *
 * Discipline:
 *   - Authentication: must come from a signed-in session. Without one, redirect
 *     to /signup -- never touch the DB.
 *   - Validation: enum-only; refuses anything outside ACCOUNT_ROLES.
 *   - Write path: goes through the user's JWT (not service-role) so the
 *     self-update RLS policy (#5) is the security boundary.
 */
export async function chooseRole(role: AccountRole): Promise<never> {
  if (!ACCOUNT_ROLES.includes(role)) {
    throw new Error('Invalid role. Pick "hobbyist" or "pro".');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect('/signup');
  }

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ role, onboarded_at: new Date().toISOString() })
    .eq('id', userData.user.id);

  if (updateError) {
    throw new Error('Could not save your role. Please try again.');
  }

  redirect('/dashboard');
}
