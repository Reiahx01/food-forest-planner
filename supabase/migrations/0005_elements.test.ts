// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/0005_elements.sql'),
  'utf-8',
);

describe('supabase/migrations/0005_elements.sql', () => {
  test('creates the element_type enum starting at just "guild"', () => {
    expect(MIGRATION).toMatch(
      /create\s+type\s+public\.element_type\s+as\s+enum\s*\(\s*'guild'\s*\)/i,
    );
  });

  test('creates the elements table in public', () => {
    expect(MIGRATION).toMatch(/create\s+table\s+public\.elements/i);
  });

  test('design_id references designs with cascade delete', () => {
    expect(MIGRATION).toMatch(
      /design_id[^,]*references\s+public\.designs\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/i,
    );
  });

  test('geometry + attributes are jsonb; attributes defaults to {}', () => {
    expect(MIGRATION).toMatch(/geometry\s+jsonb\s+not\s+null/i);
    expect(MIGRATION).toMatch(/attributes\s+jsonb\s+not\s+null\s+default\s+'\{\}'::jsonb/i);
  });

  test('type column uses the element_type enum, not null', () => {
    expect(MIGRATION).toMatch(/type\s+public\.element_type\s+not\s+null/i);
  });

  test('indexes design_id (every list-elements-on-design query filters by it)', () => {
    expect(MIGRATION).toMatch(/create\s+index[\s\S]*on\s+public\.elements[\s\S]*design_id/i);
  });

  test('enables row level security', () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.elements\s+enable\s+row\s+level\s+security/i);
  });

  test('grants four self-via-design-via-property CRUD policies', () => {
    for (const op of ['select', 'insert', 'update', 'delete']) {
      expect(MIGRATION).toMatch(new RegExp(`create\\s+policy[\\s\\S]*for\\s+${op}`, 'i'));
    }
  });

  test('every policy walks designs + properties + auth.uid()', () => {
    const policies = MIGRATION.match(/create\s+policy[\s\S]*?;/gi) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(4);
    for (const policy of policies) {
      expect(policy).toMatch(/public\.designs/i);
      expect(policy).toMatch(/public\.properties/i);
      expect(policy).toMatch(/auth\.uid\(\)/i);
    }
  });

  test('reuses set_updated_at trigger', () => {
    expect(MIGRATION).toMatch(/create\s+trigger\s+elements_set_updated_at[\s\S]*set_updated_at/i);
  });
});
