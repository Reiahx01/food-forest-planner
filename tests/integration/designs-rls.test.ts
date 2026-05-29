// @vitest-environment node
//
// Integration test: designs RLS (#13).
//
// Verifies the four owner-via-Property policies in 0004_designs.sql:
//   - Service-role inserts work (RLS doesn't apply to service-role).
//   - Anon clients see nothing.
//   - Cascade: deleting the parent Property removes its Designs.
//
// The multi-user "user A cannot see user B's Designs" case needs a real
// session for user A. It's deferred to a follow-up integration helper.

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

integrationOnly('integration: designs RLS against real Supabase', () => {
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    admin = createServiceRoleSupabaseClient();
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (!id) continue;
      // auth.users delete -> properties cascade -> designs cascade.
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('service-role round-trip: insert Property + Design, read both back', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    const { data: property } = await admin
      .from('properties')
      .insert({ owner_account_id: user.id, name: 'Designs-test plot' })
      .select('id')
      .single();
    const propertyId = (property as { id: string }).id;

    const { data: design, error: insertErr } = await admin
      .from('designs')
      .insert({ property_id: propertyId, name: 'Spring' })
      .select('id, property_id, name, description')
      .single();
    expect(insertErr).toBeNull();
    expect(design).toMatchObject({
      property_id: propertyId,
      name: 'Spring',
      description: null,
    });
  });

  test('anon client cannot read designs (RLS denies without a session)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    const { data: property } = await admin
      .from('properties')
      .insert({ owner_account_id: user.id, name: 'Anon-test plot' })
      .select('id')
      .single();
    await admin
      .from('designs')
      .insert({ property_id: (property as { id: string }).id, name: 'Hidden' });

    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );
    const { data: rows } = await anon.from('designs').select('id').limit(10);
    expect(rows).toEqual([]);
  });

  test('cascade: deleting a Property tears its Designs', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    const { data: property } = await admin
      .from('properties')
      .insert({ owner_account_id: user.id, name: 'Cascade plot' })
      .select('id')
      .single();
    const propertyId = (property as { id: string }).id;

    const { data: design } = await admin
      .from('designs')
      .insert({ property_id: propertyId, name: 'Doomed' })
      .select('id')
      .single();
    const designId = (design as { id: string }).id;

    await admin.from('properties').delete().eq('id', propertyId);

    const { data: orphan } = await admin
      .from('designs')
      .select('id')
      .eq('id', designId)
      .maybeSingle();
    expect(orphan).toBeNull();
  });
});
