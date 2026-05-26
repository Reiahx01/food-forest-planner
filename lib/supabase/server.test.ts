// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
  type CookieAdapter,
} from './server';

const ORIGINAL_ENV = { ...process.env };

function fakeCookies(): CookieAdapter {
  const store = new Map<string, string>();
  return {
    getAll: () => Array.from(store.entries()).map(([name, value]) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value } of changes) {
        if (value === '') store.delete(name);
        else store.set(name, value);
      }
    },
  };
}

describe('lib/supabase/server — RLS-respecting (anon) + service-role factories', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  test('createServerSupabaseClient() builds a client wired to the supplied cookie adapter', () => {
    const cookies = fakeCookies();
    const supabase = createServerSupabaseClient({ cookies });
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });

  test('createServerSupabaseClient() throws when public env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => createServerSupabaseClient({ cookies: fakeCookies() })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  test('createServiceRoleSupabaseClient() uses the service-role key (RLS bypass)', () => {
    const supabase = createServiceRoleSupabaseClient();
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });

  test('createServiceRoleSupabaseClient() refuses to run when SUPABASE_SERVICE_ROLE_KEY missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => createServiceRoleSupabaseClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
