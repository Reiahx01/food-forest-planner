'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
 * Server Action: create a Design under a Property. Owner check is RLS:
 * the insert payload includes `property_id`, and the WITH CHECK policy
 * in 0004_designs.sql confirms the user owns that Property before letting
 * the row through.
 */
export async function createDesign(propertyId: string, formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const description = nonEmpty(formData.get('description'));
  if (name.length === 0) {
    throw new Error('Design name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const { data, error } = await supabase
    .from('designs')
    .insert({
      property_id: propertyId,
      name,
      description: description.length > 0 ? description : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Could not save the design. Please try again.');
  }

  // Drop the user directly into the editor -- that's the whole point of
  // creating a Design. Show page is reachable via the breadcrumb.
  redirect(`/designs/${(data as { id: string }).id}/edit`);
}

export async function updateDesign(id: string, formData: FormData): Promise<never> {
  const name = nonEmpty(formData.get('name'));
  const description = nonEmpty(formData.get('description'));
  if (name.length === 0) {
    throw new Error('Design name is required.');
  }

  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const { error } = await supabase
    .from('designs')
    .update({
      name,
      description: description.length > 0 ? description : null,
    })
    .eq('id', id);

  if (error) {
    throw new Error('Could not update the design. Please try again.');
  }

  redirect(`/designs/${id}`);
}

/**
 * Delete a Design and bounce back to the parent Property. We read the
 * parent id first so the redirect is meaningful; if RLS denies the read
 * (shouldn't happen here -- the policy is symmetric across SELECT and
 * DELETE) we fall back to the Properties list.
 */
export async function deleteDesign(id: string): Promise<never> {
  const supabase = createServerSupabaseClient({ cookies: await nextCookieAdapter() });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect('/signup');

  const { data: parent } = await supabase
    .from('designs')
    .select('property_id')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) {
    throw new Error('Could not delete the design. Please try again.');
  }

  if (parent && (parent as { property_id?: string }).property_id) {
    redirect(`/properties/${(parent as { property_id: string }).property_id}`);
  }
  redirect('/properties');
}
