// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createBrowserSupabaseClient } from './client';

const ORIGINAL_ENV = { ...process.env };

describe('lib/supabase/client — browser-side supabase-js factory (RLS-respecting)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('returns a client with .auth and .from helpers', () => {
    const supabase = createBrowserSupabaseClient();
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
    expect(typeof supabase.from).toBe('function');
  });

  test('throws a descriptive error when public env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => createBrowserSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  test('does NOT import the service-role key (browser-safe)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const moduleSrc = readFileSync(resolve(process.cwd(), 'lib/supabase/client.ts'), 'utf-8');
    expect(moduleSrc).not.toMatch(/SERVICE_ROLE/);
  });
});
