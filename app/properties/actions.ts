'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { geocodeAddress } from '@/lib/geo/esri-geocode';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        store.set({ name, value, ...(options ?? {}) });
      }
    },
  };
}

function nonEmpty(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Geocode `address` and return a WKT POINT for the `center` column, plus
 * the canonical address label Esri returned. Returns null if the address
 * is empty or geocoding doesn't resolve.
 */
async function resolveCenter(address: string): Promise<{ wkt: string; label: string } | null> {
  if (address.length === 0) return null;
  const hit = await geocodeAddress(address);
  if (!hit) return null;
  // WKT: SRID is set on the column (4326), so the bare POINT is enough.
  return { wkt: `POINT(${hit.lon} ${hit.lat})`, label: hit.label };
}

/**
 * Server Action: create a Property. Geocodes the address if one is
 * supplied; saves the row with the user as owner; redirects to the show
 * page.
 *
 * Owner is set explicitly to `auth.uid()` -- RLS would reject any other
 * value, but writing it explicitly makes the intent obvious in the
 * insert payload.
 */
export async function createProperty(formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const addressInput = nonEmpty(formData.get('address'));
  if (name.length === 0) {
    throw new Error('Property name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const resolved = await resolveCenter(addressInput);

  const insertPayload: Record<string, unknown> = {
    owner_account_id: userData.user.id,
    name,
    address: resolved?.label ?? (addressInput.length > 0 ? addressInput : null),
    center: resolved?.wkt ?? null,
  };

  const { data, error } = await supabase
    .from('properties')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Could not save the property. Please try again.');
  }

  redirect(`/properties/${(data as { id: string }).id}`);
}

/**
 * Server Action: update a Property. Only the user-editable fields here
 * (name + address). Outline-update lives in #10 part 2; role-aware client
 * assignment lands in #12.
 */
export async function updateProperty(id: string, formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const addressInput = nonEmpty(formData.get('address'));
  if (name.length === 0) {
    throw new Error('Property name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const resolved = await resolveCenter(addressInput);

  const updatePayload: Record<string, unknown> = {
    name,
    address: resolved?.label ?? (addressInput.length > 0 ? addressInput : null),
    center: resolved?.wkt ?? null,
  };

  const { error } = await supabase
    .from('properties')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error('Could not update the property. Please try again.');
  }

  redirect(`/properties/${id}`);
}

/**
 * Server Action: delete a Property. Cascades to Designs once #13 wires
 * the FK with `on delete cascade`. RLS denies deletes of rows the user
 * doesn't own; the explicit `auth.getUser()` check is just a 401-shortcut
 * for the anon path.
 */
export async function deleteProperty(id: string): Promise<never> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) {
    throw new Error('Could not delete the property. Please try again.');
  }

  redirect('/properties');
}
