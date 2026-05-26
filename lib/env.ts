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
