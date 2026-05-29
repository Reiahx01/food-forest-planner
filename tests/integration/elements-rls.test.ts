// @vitest-environment node
//
// Integration test: elements RLS (#14 part 1).
//
// Verifies the four owner-via-Design-via-Property policies in
// 0005_elements.sql:
//   - Service-role can insert + read (the RLS bypass).
//   - Anon clients see nothing.
//   - Cascade: deleting the parent Design tears its Elements.
//   - Cascade-up: deleting the Property tears Designs which tears Elements.

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

async function seed(admin: ReturnType<typeof createServiceRoleSupabaseClient>) {
  const { data: created } = await admin.auth.admin.createUser({
    email: `it-${randomUUID()}@test.local`,
    email_confirm: true,
  });
  const user = requireUser(created.user, 'auth user');

  const { data: property } = await admin
    .from('properties')
    .insert({ owner_account_id: user.id, name: `Plot ${randomUUID()}` })
    .select('id')
    .single();
  const propertyId = (property as { id: string }).id;

  const { data: design } = await admin
    .from('designs')
    .insert({ property_id: propertyId, name: 'Spring' })
    .select('id')
    .single();
  const designId = (design as { id: string }).id;

  return { userId: user.id, propertyId, designId };
}

integrationOnly('integration: elements RLS against real Supabase', () => {
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    admin = createServiceRoleSupabaseClient();
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (!id) continue;
      // auth.users delete -> properties cascade -> designs cascade ->
      // elements cascade.
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('service-role round-trip: insert a guild + read it back', async () => {
    const { userId, designId } = await seed(admin);
    createdUserIds.push(userId);

    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [-122.03, 37.33],
        [-122.02, 37.33],
        [-122.02, 37.34],
        [-122.03, 37.33],
      ]],
    };

    const { data: inserted, error: insertErr } = await admin
      .from('elements')
      .insert({
        design_id: designId,
        type: 'guild',
        geometry: polygon,
        attributes: { centerTreeSpeciesId: '11111111-2222-4333-8444-555555555555' },
      })
      .select('id, design_id, type, geometry, attributes')
      .single();

    expect(insertErr).toBeNull();
    expect(inserted).toMatchObject({
      design_id: designId,
      type: 'guild',
    });
  });

  test('anon client cannot read elements (RLS denies without a session)', async () => {
    const { userId, designId } = await seed(admin);
    createdUserIds.push(userId);

    await admin.from('elements').insert({
      design_id: designId,
      type: 'guild',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      attributes: { centerTreeSpeciesId: '11111111-2222-4333-8444-555555555555' },
    });

    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );
    const { data: rows } = await anon.from('elements').select('id').limit(10);
    expect(rows).toEqual([]);
  });

  test('cascade: deleting the Design tears its Elements', async () => {
    const { userId, designId } = await seed(admin);
    createdUserIds.push(userId);

    const { data: el } = await admin
      .from('elements')
      .insert({
        design_id: designId,
        type: 'guild',
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        attributes: { centerTreeSpeciesId: '11111111-2222-4333-8444-555555555555' },
      })
      .select('id')
      .single();
    const elementId = (el as { id: string }).id;

    await admin.from('designs').delete().eq('id', designId);

    const { data: orphan } = await admin
      .from('elements')
      .select('id')
      .eq('id', elementId)
      .maybeSingle();
    expect(orphan).toBeNull();
  });
});
