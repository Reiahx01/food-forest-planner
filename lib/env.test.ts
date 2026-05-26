// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { serverEnv, browserEnv } from './env';

const REQUIRED_SERVER_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const;

const ORIGINAL_ENV = { ...process.env };

describe('lib/env — typed env access for server + browser', () => {
  beforeEach(() => {
    for (const k of REQUIRED_SERVER_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[k];
    }
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('serverEnv() returns parsed values when all vars are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

    const env = serverEnv();

    expect(env.supabaseUrl).toBe('http://127.0.0.1:54321');
    expect(env.supabaseAnonKey).toBe('anon-key');
    expect(env.supabaseServiceRoleKey).toBe('service-role-key');
    expect(env.databaseUrl).toBe('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  });

  test.each(REQUIRED_SERVER_KEYS)('serverEnv() throws a descriptive error when %s is missing', (key) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete process.env[key];

    expect(() => serverEnv()).toThrow(new RegExp(key));
  });

  test('browserEnv() returns only the public-prefixed vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const env = browserEnv();

    expect(env).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'anon-key',
    });
    expect(env).not.toHaveProperty('supabaseServiceRoleKey');
  });

  test('isMockMode() reads IS_MOCK_MODE=1 from the environment', async () => {
    process.env.IS_MOCK_MODE = '1';
    const { isMockMode } = await import('./env');
    expect(isMockMode()).toBe(true);

    process.env.IS_MOCK_MODE = '0';
    expect(isMockMode()).toBe(false);

    delete process.env.IS_MOCK_MODE;
    expect(isMockMode()).toBe(false);
  });

  test('isMockMode() refuses to run in production (ADR-0003 fail-fast)', () => {
    process.env.IS_MOCK_MODE = '1';
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => serverEnv()).toThrow(/IS_MOCK_MODE.*production/i);
  });
});
