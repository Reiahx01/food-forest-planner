'use server';

import { cookies } from 'next/headers';

import { getElementModule } from '@/lib/elements/registry';
import { createServerSupabaseClient, type CookieAdapter } from '@/lib/supabase/server';

import type { ElementType } from '@/db/schema/elements';

/**
 * Server actions for elements (#14).
 *
 * Two disciplines apply at every write:
 *   1. Module-driven validation -- look the ElementTypeModule up by `type`,
 *      run the Zod schema against `attributes` AND the domain-rule hook.
 *      A failure throws a clean error before we touch the DB.
 *   2. RLS -- the insert/update payload includes `design_id`; the per-op
 *      policies on `elements` walk Design -> Property -> auth.uid() so the
 *      caller can only write rows under their own Designs.
 *
 * The editor (part 2) calls these via the standard server-action / form
 * pattern. They return `{ ok: true, id }` rather than redirecting so the
 * auto-save fire-and-forget flow stays smooth.
 */

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

export interface CreateElementInput {
  designId: string;
  type: ElementType;
  geometry: unknown;
  attributes: unknown;
  label?: string;
}

export type ElementMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function validateAttributes(
  type: ElementType,
  attributes: unknown,
  geometry: unknown,
): { ok: true; data: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  const elementModule = getElementModule(type);

  const parsed = elementModule.attributesSchema.safeParse(attributes);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || '_root';
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { ok: false, error: 'Invalid attributes for this element.', fieldErrors };
  }

  const domainErrors = elementModule.validateDomainRules?.(parsed.data as never, { geometry }) ?? [];
  if (domainErrors.length > 0) {
    return { ok: false, error: domainErrors.join(' ') };
  }

  return { ok: true, data: parsed.data };
}

export async function createElement(input: CreateElementInput): Promise<ElementMutationResult> {
  const validation = validateAttributes(input.type, input.attributes, input.geometry);
  if (!validation.ok) return validation;

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in required.' };

  const { data, error } = await supabase
    .from('elements')
    .insert({
      design_id: input.designId,
      type: input.type,
      geometry: input.geometry,
      attributes: validation.data,
      label: input.label ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: 'Could not save the element. Please try again.' };
  }
  return { ok: true, id: (data as { id: string }).id };
}

export interface UpdateElementInput {
  id: string;
  type: ElementType;
  geometry?: unknown;
  attributes?: unknown;
  label?: string | null;
}

export async function updateElement(input: UpdateElementInput): Promise<ElementMutationResult> {
  // If attributes are being updated, validate them against the module.
  let validatedAttributes: unknown;
  if (input.attributes !== undefined) {
    const validation = validateAttributes(input.type, input.attributes, input.geometry ?? null);
    if (!validation.ok) return validation;
    validatedAttributes = validation.data;
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in required.' };

  const payload: Record<string, unknown> = {};
  if (input.attributes !== undefined) payload.attributes = validatedAttributes;
  if (input.geometry !== undefined) payload.geometry = input.geometry;
  if (input.label !== undefined) payload.label = input.label;

  if (Object.keys(payload).length === 0) {
    // Nothing to update -- treat as success.
    return { ok: true, id: input.id };
  }

  const { error } = await supabase
    .from('elements')
    .update(payload)
    .eq('id', input.id);

  if (error) {
    return { ok: false, error: 'Could not update the element. Please try again.' };
  }
  return { ok: true, id: input.id };
}

export async function deleteElement(id: string): Promise<ElementMutationResult> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in required.' };

  const { error } = await supabase.from('elements').delete().eq('id', id);
  if (error) {
    return { ok: false, error: 'Could not delete the element. Please try again.' };
  }
  return { ok: true, id };
}
