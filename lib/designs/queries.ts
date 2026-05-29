import 'server-only';

import { cookies } from 'next/headers';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

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

export interface DesignSummary {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List the Designs for a Property. RLS (via 0004_designs.sql) returns
 * nothing if the caller doesn't own the parent Property, so the empty array
 * doubles as both "no designs yet" and "access denied" without leaking the
 * difference.
 */
export async function listDesignsForProperty(propertyId: string): Promise<DesignSummary[]> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('designs')
    .select('id, property_id, name, description, created_at, updated_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(toSummary);
}

/** Fetch one Design. Returns null if RLS denies or the row doesn't exist. */
export async function getDesign(id: string): Promise<DesignSummary | null> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('designs')
    .select('id, property_id, name, description, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return toSummary(data);
}

function toSummary(row: unknown): DesignSummary {
  const r = row as {
    id: string;
    property_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    id: r.id,
    propertyId: r.property_id,
    name: r.name,
    description: r.description,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}
