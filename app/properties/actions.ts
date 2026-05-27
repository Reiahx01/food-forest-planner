'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { geocodeAddress } from '@/lib/geo/esri-geocode';
import { lookupUsdaZone } from '@/lib/geo/usda-zone';
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

interface ResolvedCenter {
  wkt: string;
  label: string;
  lat: number;
  lon: number;
}

async function resolveCenter(address: string): Promise<ResolvedCenter | null> {
  if (address.length === 0) return null;
  const hit = await geocodeAddress(address);
  if (!hit) return null;
  return {
    wkt: `POINT(${hit.lon} ${hit.lat})`,
    label: hit.label,
    lat: hit.lat,
    lon: hit.lon,
  };
}

/**
 * Validate + serialise the user-drawn parcel outline.
 *
 * The client posts the polygon as a JSON-encoded GeoJSON `Polygon` in the
 * `parcel_outline` form field. We turn it into a WKT POLYGON for Postgres /
 * PostGIS. Returns null when no outline was submitted; throws when the
 * submitted value is malformed (so the form surfaces a clean error).
 */
function parseParcelOutline(raw: string): string | null {
  if (raw.length === 0) return null;

  let geo: unknown;
  try {
    geo = JSON.parse(raw);
  } catch {
    throw new Error('Parcel outline could not be parsed. Please redraw the shape.');
  }

  if (
    typeof geo !== 'object' ||
    geo === null ||
    (geo as { type?: unknown }).type !== 'Polygon' ||
    !Array.isArray((geo as { coordinates?: unknown[] }).coordinates) ||
    !Array.isArray((geo as { coordinates: unknown[][] }).coordinates[0])
  ) {
    throw new Error('Parcel outline must be a GeoJSON Polygon.');
  }

  // GeoJSON Polygon: [[ [lon, lat], [lon, lat], ..., [lon, lat] ]]
  // First ring is the exterior; interior rings (holes) are ignored for v1.
  const ring = (geo as { coordinates: [number, number][][] }).coordinates[0];
  if (ring.length < 4) {
    // A valid polygon needs at least 3 distinct vertices + the closing vertex.
    throw new Error('Parcel outline must have at least three corners.');
  }

  const pairs = ring.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  return `POLYGON((${pairs}))`;
}

/**
 * Server Action: create a Property. Geocodes the address (if supplied),
 * looks up the USDA Plant Hardiness Zone for the resolved coordinates,
 * persists the optional user-drawn parcel outline, and redirects to the
 * show page.
 */
export async function createProperty(formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const addressInput = nonEmpty(formData.get('address'));
  const outlineInput = nonEmpty(formData.get('parcel_outline'));
  if (name.length === 0) {
    throw new Error('Property name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const resolved = await resolveCenter(addressInput);
  const parcelWkt = parseParcelOutline(outlineInput);
  const usdaZone = resolved ? await lookupUsdaZone(resolved.lat, resolved.lon) : null;

  const insertPayload: Record<string, unknown> = {
    owner_account_id: userData.user.id,
    name,
    address: resolved?.label ?? (addressInput.length > 0 ? addressInput : null),
    center: resolved?.wkt ?? null,
    parcel_outline: parcelWkt,
    usda_zone: usdaZone,
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
 * Server Action: update a Property. The outline + USDA-zone refresh happen
 * the same way as on create; an empty `parcel_outline` field clears the
 * polygon (user explicitly removed it) rather than leaving the old one in
 * place.
 */
export async function updateProperty(id: string, formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const addressInput = nonEmpty(formData.get('address'));
  const outlineInput = nonEmpty(formData.get('parcel_outline'));
  if (name.length === 0) {
    throw new Error('Property name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const resolved = await resolveCenter(addressInput);
  const parcelWkt = parseParcelOutline(outlineInput);
  const usdaZone = resolved ? await lookupUsdaZone(resolved.lat, resolved.lon) : null;

  const updatePayload: Record<string, unknown> = {
    name,
    address: resolved?.label ?? (addressInput.length > 0 ? addressInput : null),
    center: resolved?.wkt ?? null,
    parcel_outline: parcelWkt,
    usda_zone: usdaZone,
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
