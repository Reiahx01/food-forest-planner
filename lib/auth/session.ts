import 'server-only';

import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import type { Account } from '@/db/schema/accounts';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';


/**
 * Build a `CookieAdapter` backed by Next's `cookies()` store. The setAll path
 * is wrapped in try/catch because Server Components run in a read-only cookie
 * context -- supabase-ssr writes refreshed tokens here; we swallow the error
 * since the actual rotation happens on the next mutation (Route Handler /
 * Server Action), which has a writable cookie store.
 */
async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        try {
          store.set({ name, value, ...(options ?? {}) });
        } catch {
          // Read-only cookie store (Server Component context) -- ignore.
        }
      }
    },
  };
}

/**
 * Returns the Supabase auth user for the current request, or null. Use this
 * when you only need `auth.users` data (id, email, app metadata).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Returns the user + their joined `accounts` row, or null. Use this anywhere
 * you need role/display_name in addition to the auth identity (most
 * authenticated UI). The accounts read goes through the user's JWT, so RLS
 * enforces "you can only see your own row" -- not the app code.
 */
export async function getCurrentAccount(): Promise<
  { user: User; account: Account } | null
> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const userResult = await supabase.auth.getUser();
  if (userResult.error || !userResult.data.user) return null;

  const accountResult = await supabase
    .from('accounts')
    .select('id, email, role, display_name, onboarded_at, created_at, updated_at')
    .eq('id', userResult.data.user.id)
    .single();
  if (accountResult.error || !accountResult.data) return null;

  // Map snake_case -> camelCase to match the Drizzle inferred shape.
  const row = accountResult.data as {
    id: string;
    email: string;
    role: 'hobbyist' | 'pro';
    display_name: string | null;
    onboarded_at: string | null;
    created_at: string;
    updated_at: string;
  };

  return {
    user: userResult.data.user,
    account: {
      id: row.id,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      onboardedAt: row.onboarded_at ? new Date(row.onboarded_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    },
  };
}
