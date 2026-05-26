// @vitest-environment node
//
// Integration test: signup flow round-trips end-to-end against a real local
// Supabase. Acceptance criterion from #5:
//
//   "Vitest integration test: signup flow round-trips end-to-end against
//    ephemeral Supabase."
//
// Gated by `isIntegrationDbAvailable()` -- skipped entirely when
// IS_INTEGRATION!=1 so the unit suite stays Docker-free. CI's integration
// job sets the flag after `supabase start` boots the stack.
//
// Per-test isolation: each test creates a fresh auth.users via the
// service-role client and asserts the trigger created a matching
// public.accounts row. Cleanup deletes the user (the FK + cascade tears
// the accounts row with it).

import { randomUUID } from 'node:crypto';

import { afterEach, beforeAll, describe, expect, test } from 'vitest';

import { isIntegrationDbAvailable } from '@/db/test-helpers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

const integrationOnly = isIntegrationDbAvailable() ? describe : describe.skip;

function requireUser<T extends { id: string }>(user: T | null, label: string): T {
  if (!user) throw new Error(`expected ${label} to be created but Supabase returned null`);
  return user;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`expected ${name} to be set in the integration env`);
  return value;
}

integrationOnly('integration: signup flow against real Supabase', () => {
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    admin = createServiceRoleSupabaseClient();
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (!id) continue;
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('inserting an auth.users row creates a matching public.accounts row (trigger)', async () => {
    const email = `it-${randomUUID()}@test.local`;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    expect(created.error).toBeNull();
    const user = requireUser(created.data.user, 'auth user');
    createdUserIds.push(user.id);

    // Read via service-role to bypass RLS for the assertion -- we just need
    // to know the row exists with the expected shape.
    const { data: account, error } = await admin
      .from('accounts')
      .select('id, email, role, display_name')
      .eq('id', user.id)
      .single();

    expect(error).toBeNull();
    expect(account).toMatchObject({
      id: user.id,
      email,
      role: 'hobbyist',
      display_name: null,
    });
  });

  test('cascade: deleting auth.users removes the accounts row', async () => {
    const email = `it-${randomUUID()}@test.local`;
    const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const user = requireUser(created.user, 'auth user');

    // Delete instead of registering for cleanup.
    await admin.auth.admin.deleteUser(user.id);

    const { data: account } = await admin
      .from('accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    expect(account).toBeNull();
  });

  test('RLS: an anon client cannot read accounts rows without a session', async () => {
    const { data: alice } = await admin.auth.admin.createUser({
      email: `it-alice-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const { data: bob } = await admin.auth.admin.createUser({
      email: `it-bob-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    createdUserIds.push(
      requireUser(alice.user, 'alice').id,
      requireUser(bob.user, 'bob').id,
    );

    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );

    // The SELECT policy requires `auth.uid() = id`; auth.uid() is null for
    // an unauthenticated request, so the query returns zero rows even though
    // the table has two rows.
    const { data: rows } = await anon.from('accounts').select('id').limit(10);
    expect(rows).toEqual([]);
  });
});
