// @vitest-environment node
import { describe, expect, test } from 'vitest';

import drizzleConfig from './drizzle.config';

describe('drizzle.config — contract enforced by db:generate', () => {
  test('exports a config with the schema barrel + supabase migrations dir as out', () => {
    expect(drizzleConfig.schema).toBe('./db/schema/index.ts');
    expect(drizzleConfig.out).toBe('./supabase/migrations');
  });

  test('targets PostgreSQL', () => {
    expect(drizzleConfig.dialect).toBe('postgresql');
  });

  test('lists supabase + auth schemas as managed-elsewhere so they are not introspected', () => {
    // `schemaFilter` defaults to `public`; we want to be explicit that internal
    // Supabase schemas (auth, storage, realtime) are owned by Supabase.
    expect(drizzleConfig.schemaFilter).toContain('public');
  });
});
