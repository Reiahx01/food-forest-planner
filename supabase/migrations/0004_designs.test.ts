// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/0004_designs.sql'),
  'utf-8',
);

describe('supabase/migrations/0004_designs.sql', () => {
  test('creates the designs table in public', () => {
    expect(MIGRATION).toMatch(/create\s+table\s+public\.designs/i);
  });

  test('property_id is required + cascades on Property delete', () => {
    expect(MIGRATION).toMatch(
      /property_id[^,]*references\s+public\.properties\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/i,
    );
  });

  test('name is required, description is optional', () => {
    expect(MIGRATION).toMatch(/name\s+text\s+not\s+null/i);
    const descLine = MIGRATION.match(/description\s+text[^,]*/i)?.[0] ?? '';
    expect(descLine).not.toMatch(/not\s+null/i);
  });

  test('enables row level security', () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.designs\s+enable\s+row\s+level\s+security/i);
  });

  test('grants four self-via-property CRUD policies', () => {
    for (const op of ['select', 'insert', 'update', 'delete']) {
      expect(MIGRATION).toMatch(new RegExp(`create\\s+policy[\\s\\S]*for\\s+${op}`, 'i'));
    }
  });

  test('every policy joins public.properties on owner_account_id = auth.uid()', () => {
    const policyMatches = MIGRATION.match(/create\s+policy[\s\S]*?;/gi) ?? [];
    expect(policyMatches.length).toBeGreaterThanOrEqual(4);
    for (const policy of policyMatches) {
      expect(policy).toMatch(/exists[\s\S]*public\.properties[\s\S]*owner_account_id\s*=\s*auth\.uid\(\)/i);
    }
  });

  test('indexes property_id (so the RLS join stays fast)', () => {
    expect(MIGRATION).toMatch(/create\s+index[\s\S]*on\s+public\.designs[\s\S]*property_id/i);
  });

  test('reuses set_updated_at trigger (defined in 0001_accounts)', () => {
    expect(MIGRATION).toMatch(/create\s+trigger\s+designs_set_updated_at[\s\S]*set_updated_at/i);
  });
});
