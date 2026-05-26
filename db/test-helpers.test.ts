// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ephemeralSchemaName, isIntegrationDbAvailable, withEphemeralSchema } from './test-helpers';

const ORIGINAL_ENV = { ...process.env };

describe('db/test-helpers — ephemeral schema utilities for integration tests', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    delete process.env.IS_INTEGRATION;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  test('ephemeralSchemaName() returns a unique, lowercase, prefixed identifier', () => {
    const a = ephemeralSchemaName();
    const b = ephemeralSchemaName();
    expect(a).toMatch(/^test_[a-z0-9_]+$/);
    expect(b).toMatch(/^test_[a-z0-9_]+$/);
    expect(a).not.toBe(b);
  });

  test('isIntegrationDbAvailable() is true only when IS_INTEGRATION=1 is set', () => {
    expect(isIntegrationDbAvailable()).toBe(false);
    process.env.IS_INTEGRATION = '1';
    expect(isIntegrationDbAvailable()).toBe(true);
  });

  test('withEphemeralSchema() refuses to run when IS_INTEGRATION is unset (fail loud, not silent)', async () => {
    delete process.env.IS_INTEGRATION;
    await expect(
      withEphemeralSchema(async () => {
        // Body intentionally empty -- we only reach here if the guard fails to
        // throw, in which case the assertion below catches the test.
        return Promise.resolve();
      }),
    ).rejects.toThrow(/IS_INTEGRATION/);
  });

  test('withEphemeralSchema() exposes a typed callback signature', () => {
    // Compile-time-only: the callback receives { db, schemaName }.
    const fn: Parameters<typeof withEphemeralSchema>[0] = async ({ db, schemaName }) => {
      void db;
      void schemaName;
    };
    expect(typeof fn).toBe('function');
  });
});
