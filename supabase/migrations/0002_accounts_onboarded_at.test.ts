// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/0002_accounts_onboarded_at.sql'),
  'utf-8',
);

describe('supabase/migrations/0002_accounts_onboarded_at.sql', () => {
  test('adds an onboarded_at column to public.accounts', () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.accounts[\s\S]*add\s+column\s+onboarded_at\s+timestamptz/i);
  });

  test('does not require existing rows to be non-null (column is nullable)', () => {
    // The ADD COLUMN line must NOT contain a NOT NULL clause.
    const addLine = MIGRATION.match(/add\s+column\s+onboarded_at[^;]*/i)?.[0] ?? '';
    expect(addLine).not.toMatch(/not\s+null/i);
  });

  test('backfills existing rows so they skip onboarding on next sign-in', () => {
    expect(MIGRATION).toMatch(/update\s+public\.accounts[\s\S]*set\s+onboarded_at\s*=\s*created_at/i);
  });
});
