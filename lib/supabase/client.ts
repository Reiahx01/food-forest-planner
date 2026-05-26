import { createBrowserClient, type CookieMethodsBrowser } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { browserEnv } from '@/lib/env';

/**
 * Build a supabase-js client suitable for use in client components and other
 * browser code. The anon key is the **only** key permitted here — RLS policies
 * still gate every query.
 *
 * Do not pass cookies manually; `@supabase/ssr`'s `createBrowserClient` reads
 * and writes the auth cookie via `document.cookie` automatically.
 */
export function createBrowserSupabaseClient(
  cookies?: CookieMethodsBrowser,
): SupabaseClient {
  const env = browserEnv();
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, cookies ? { cookies } : undefined);
}
