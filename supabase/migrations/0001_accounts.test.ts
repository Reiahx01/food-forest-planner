// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const MIGRATION = readFileSync(join(process.cwd(), 'supabase/migrations/0001_accounts.sql'), 'utf-8');

describe('supabase/migrations/0001_accounts.sql — schema + RLS + trigger contract', () => {
  test('creates the accounts table in the public schema', () => {
    expect(MIGRATION).toMatch(/create\s+table\s+public\.accounts/i);
  });

  test('id references auth.users on delete cascade', () => {
    expect(MIGRATION).toMatch(/references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/i);
  });

  test('role defaults to hobbyist and is constrained to (hobbyist, pro)', () => {
    expect(MIGRATION).toMatch(/role[\s\S]*default\s+'hobbyist'/i);
    expect(MIGRATION).toMatch(/check\s*\(\s*role\s+in\s*\(\s*'hobbyist'\s*,\s*'pro'\s*\)\s*\)/i);
  });

  test('enables row level security on accounts', () => {
    expect(MIGRATION).toMatch(/alter\s+table\s+public\.accounts\s+enable\s+row\s+level\s+security/i);
  });

  test('grants self-select policy keyed on auth.uid() = id', () => {
    expect(MIGRATION).toMatch(/create\s+policy[\s\S]*on\s+public\.accounts[\s\S]*for\s+select[\s\S]*auth\.uid\(\)\s*=\s*id/i);
  });

  test('grants self-update policy keyed on auth.uid() = id (with check)', () => {
    expect(MIGRATION).toMatch(/create\s+policy[\s\S]*for\s+update[\s\S]*auth\.uid\(\)\s*=\s*id[\s\S]*with\s+check[\s\S]*auth\.uid\(\)\s*=\s*id/i);
  });

  test('does NOT grant a delete or insert policy (insert is trigger-only, delete via cascade)', () => {
    expect(MIGRATION).not.toMatch(/for\s+insert/i);
    expect(MIGRATION).not.toMatch(/for\s+delete/i);
  });

  test('creates a security-definer trigger that mirrors auth.users -> public.accounts', () => {
    expect(MIGRATION).toMatch(/create\s+(or\s+replace\s+)?function\s+public\.handle_new_user/i);
    expect(MIGRATION).toMatch(/security\s+definer/i);
    expect(MIGRATION).toMatch(/create\s+trigger\s+on_auth_user_created[\s\S]*after\s+insert\s+on\s+auth\.users/i);
  });

  test('handles re-insertion safely (on conflict do nothing)', () => {
    expect(MIGRATION).toMatch(/on\s+conflict[\s\S]*do\s+nothing/i);
  });

  test('sets search_path on the security-definer function to defeat the search_path attack', () => {
    // CVE class: a SECURITY DEFINER function with mutable search_path can be
    // exploited by a malicious schema. Pin it.
    expect(MIGRATION).toMatch(/set\s+search_path\s*=/i);
  });

  test('keeps updated_at fresh via a trigger', () => {
    expect(MIGRATION).toMatch(/create\s+(or\s+replace\s+)?function\s+public\.set_updated_at/i);
    expect(MIGRATION).toMatch(/create\s+trigger\s+accounts_set_updated_at[\s\S]*before\s+update\s+on\s+public\.accounts/i);
  });
});
