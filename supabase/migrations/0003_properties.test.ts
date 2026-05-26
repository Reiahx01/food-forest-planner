// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/0003_properties.sql'),
  'utf-8',
);

describe('supabase/migrations/0003_properties.sql — schema + RLS contract', () => {
  test('creates the properties table in public', () => {
    expect(MIGRATION).toMatch(/create\s+table\s+public\.properties/i);
  });

  test('owner_account_id references accounts with cascade delete', () => {
    expect(MIGRATION).toMatch(
      /owner_account_id[^,]*references\s+public\.accounts\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/i,
    );
  });

  test('uses PostGIS geometry(Point, 4326) for center', () => {
    expect(MIGRATION).toMatch(/center[\s\S]*geometry\s*\(\s*Point\s*,\s*4326\s*\)/i);
  });

  test('uses PostGIS geometry(Polygon, 4326) for parcel_outline', () => {
    expect(MIGRATION).toMatch(/parcel_outline[\s\S]*geometry\s*\(\s*Polygon\s*,\s*4326\s*\)/i);
  });

  test('climate_facts is jsonb with empty-object default', () => {
    expect(MIGRATION).toMatch(/climate_facts\s+jsonb\s+not\s+null\s+default\s+'\{\}'::jsonb/i);
  });

  test('enables row level security', () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.properties\s+enable\s+row\s+level\s+security/i);
  });

  test('grants all four self-only CRUD policies', () => {
    for (const op of ['select', 'insert', 'update', 'delete']) {
      expect(MIGRATION).toMatch(new RegExp(`create\\s+policy[\\s\\S]*for\\s+${op}`, 'i'));
    }
  });

  test('every policy keys on auth.uid() = owner_account_id', () => {
    const policyMatches = MIGRATION.match(/create\s+policy[\s\S]*?;/gi) ?? [];
    expect(policyMatches.length).toBeGreaterThanOrEqual(4);
    for (const policy of policyMatches) {
      expect(policy).toMatch(/auth\.uid\(\)\s*=\s*owner_account_id/i);
    }
  });

  test('creates a gist index on the center geometry column', () => {
    expect(MIGRATION).toMatch(/create\s+index[\s\S]*on\s+public\.properties\s+using\s+gist\s*\(\s*center\s*\)/i);
  });

  test('reuses the set_updated_at trigger function (defined in 0001_accounts)', () => {
    expect(MIGRATION).toMatch(/create\s+trigger\s+properties_set_updated_at[\s\S]*set_updated_at/i);
  });
});
