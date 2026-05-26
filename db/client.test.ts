// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createDrizzleClient, type DrizzleClient } from './client';

const ORIGINAL_ENV = { ...process.env };

describe('db/client — server-side Drizzle client factory', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    vi.resetModules();
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('createDrizzleClient() returns an object with a query helper and a teardown', () => {
    const client = createDrizzleClient();

    try {
      expect(client).toHaveProperty('db');
      expect(client).toHaveProperty('close');
      expect(typeof client.close).toBe('function');
    } finally {
      void client.close();
    }
  });

  test('createDrizzleClient() refuses to construct without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => createDrizzleClient()).toThrow(/DATABASE_URL/);
  });

  test('exports the DrizzleClient type for consumers', () => {
    // Compile-time-only assertion that the type is exported.
    const _typed: DrizzleClient | null = null;
    expect(_typed).toBeNull();
  });

  test('createDrizzleClient() accepts an explicit connectionString override', () => {
    const client = createDrizzleClient({
      connectionString: 'postgresql://override:override@127.0.0.1:54322/postgres',
    });

    try {
      expect(client).toHaveProperty('db');
    } finally {
      void client.close();
    }
  });
});
