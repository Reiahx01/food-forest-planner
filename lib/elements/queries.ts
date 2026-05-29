import 'server-only';

import { cookies } from 'next/headers';

import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

import type { ElementType } from '@/db/schema/elements';

async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (changes) => {
      for (const { name, value, options } of changes) {
        try {
          store.set({ name, value, ...(options ?? {}) });
        } catch {
          // Read-only cookie store -- ignore.
        }
      }
    },
  };
}

export interface ElementRow {
  id: string;
  designId: string;
  type: ElementType;
  geometry: unknown;
  attributes: unknown;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List the elements on a Design. RLS filters via the
 * Design -> Property -> owner chain, so a caller who doesn't own the parent
 * Property gets back an empty array (indistinguishable from "no elements
 * yet" -- no info leak).
 */
export async function listElementsForDesign(designId: string): Promise<ElementRow[]> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('elements')
    .select('id, design_id, type, geometry, attributes, label, created_at, updated_at')
    .eq('design_id', designId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(toRow);
}

export async function getElement(id: string): Promise<ElementRow | null> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data, error } = await supabase
    .from('elements')
    .select('id, design_id, type, geometry, attributes, label, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return toRow(data);
}

function toRow(row: unknown): ElementRow {
  const r = row as {
    id: string;
    design_id: string;
    type: ElementType;
    geometry: unknown;
    attributes: unknown;
    label: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    id: r.id,
    designId: r.design_id,
    type: r.type,
    geometry: r.geometry,
    attributes: r.attributes,
    label: r.label,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}
