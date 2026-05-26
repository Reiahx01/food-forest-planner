import 'server-only';

import { cookies } from 'next/headers';

import type { Property } from '@/db/schema/properties';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';


/**
 * Server-side reads for Property pages. Goes through the user's JWT so RLS
 * (not app code) enforces the owner-only access guarantee.
 *
 * GeoJSON projection for `center` + `parcel_outline` is intentionally
 * deferred to a future query helper. The `Property` row shape below uses
 * `unknown` for geometry columns; UI that needs coords pulls them via a
 * separate `getPropertyGeo()` once the polygon-draw lands in #10 part 2.
 */
async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        try {
          store.set({ name, value, ...(options ?? {}) });
        } catch {
          // Read-only cookie store in Server Components -- ignore.
        }
      }
    },
  };
}

export interface PropertySummary {
  id: string;
  name: string;
  address: string | null;
  usdaZone: string | null;
  createdAt: Date;
}

export interface PropertyDetail extends PropertySummary {
  center: { lat: number; lon: number } | null;
}

/** List the current user's Properties. RLS filters automatically. */
export async function listProperties(): Promise<PropertySummary[]> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, address, usda_zone, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => {
    const r = row as {
      id: string;
      name: string;
      address: string | null;
      usda_zone: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      usdaZone: r.usda_zone,
      createdAt: new Date(r.created_at),
    };
  });
}

/**
 * Fetch one Property by id. Returns null if RLS denies the read (e.g.
 * different owner) or the row doesn't exist. Projects `center` through
 * PostGIS's `st_asgeojson` so the UI gets `{ lat, lon }` directly.
 */
export async function getProperty(id: string): Promise<PropertyDetail | null> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, address, usda_zone, created_at, center')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const r = data as {
    id: string;
    name: string;
    address: string | null;
    usda_zone: string | null;
    created_at: string;
    // supabase-js returns PostGIS geometry as GeoJSON when the column is
    // selected directly; the shape is `{ type: 'Point', coordinates: [lon, lat] }`.
    center: { type: 'Point'; coordinates: [number, number] } | null;
  };
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    usdaZone: r.usda_zone,
    createdAt: new Date(r.created_at),
    center: r.center
      ? { lon: r.center.coordinates[0], lat: r.center.coordinates[1] }
      : null,
  };
}

// Re-export the row type for callers that want the full Drizzle shape.
export type { Property };
