/**
 * Typed access to env vars used by Supabase + Drizzle.
 *
 * `serverEnv()` reads at call time (not module-load time) so tests can mutate
 * `process.env` between cases without dynamic-import gymnastics, and so that
 * config-file consumers (drizzle.config.ts) can load `.env*` first then call.
 *
 * Boundary contract:
 *   - `serverEnv()`  — server-only; throws on missing `SUPABASE_SERVICE_ROLE_KEY` etc.
 *   - `browserEnv()` — safe to call from a client component; only `NEXT_PUBLIC_*`.
 *
 * Mock-mode discipline (ADR-0003): `IS_MOCK_MODE=1` must NEVER coexist with
 * `NODE_ENV=production`. `serverEnv()` fail-fasts if that combination appears.
 */

interface ServerEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
}

interface BrowserEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `See .env.example for the full list. Local dev: run \`npx supabase start\` and copy the printed URL + keys into .env.local.`,
    );
  }
  return value;
}

export function serverEnv(): ServerEnv {
  if (process.env.IS_MOCK_MODE === '1' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'IS_MOCK_MODE=1 must not be set in production. This is a fail-fast guard from ADR-0003 — mock mode short-circuits real DB queries and would silently mask data-access bugs in prod.',
    );
  }

  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    databaseUrl: required('DATABASE_URL'),
  };
}

export function browserEnv(): BrowserEnv {
  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}

export function isMockMode(): boolean {
  return process.env.IS_MOCK_MODE === '1';
}

/**
 * The canonical origin used to build absolute URLs in emails (magic-link
 * `emailRedirectTo`, OG `@id`, sitemap entries, etc.).
 *
 * Dev-mode override: when `NODE_ENV === 'development'` we ignore the env var
 * and force `http://localhost:3000`. This is the single rule that keeps local
 * magic-link emails clickable when `NEXT_PUBLIC_SITE_ORIGIN` is set to the
 * production URL (e.g. for prod-env smoke tests). Supabase Auth allow-lists
 * redirects via `supabase/config.toml`, and the prod URL isn't on that list
 * for the local stack — so without this rule, the email goes out with the
 * prod URL, Supabase silently substitutes its `site_url` fallback, and the
 * link drops the user on `/` with no `?code=` to exchange.
 *
 * Trailing slashes are stripped — `https://example.com/` and `https://example.com`
 * are the same origin, and the double-slash that would otherwise appear in
 * `${origin}/auth/callback` breaks Supabase's exact-match URL check.
 */
export function siteOrigin(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  const raw = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}
