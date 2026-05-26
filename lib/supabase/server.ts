import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env';

export interface CookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: Record<string, unknown> }[],
  ) => void;
}

interface ServerClientOptions {
  /**
   * Provide a cookie adapter (typically backed by `next/headers`'s `cookies()`
   * inside a Route Handler / Server Action). Server Components can read but
   * not write — the adapter's `setAll` may be a no-op in that context.
   */
  cookies: CookieAdapter;
}

/**
 * RLS-respecting Supabase client for server components, route handlers, and
 * server actions. Reads the user's auth cookie (via the supplied adapter) and
 * sends a JWT that Postgres uses to enforce RLS policies.
 */
export function createServerSupabaseClient({ cookies }: ServerClientOptions): SupabaseClient {
  const env = serverEnv();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (changes) => cookies.setAll(changes),
    },
  });
}

/**
 * Service-role Supabase client. Bypasses RLS. Use **only** in privileged
 * server paths (background jobs, seed scripts, the admin panel). It must
 * never run in response to an unauthenticated request and must never reach
 * the browser — ADR-0003.
 */
export function createServiceRoleSupabaseClient(): SupabaseClient {
  const env = serverEnv();
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
