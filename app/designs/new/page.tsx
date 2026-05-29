import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { createDesign } from '@/app/designs/actions';
import { getCurrentAccount } from '@/lib/auth/session';
import { getProperty } from '@/lib/properties/queries';

export default async function NewDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const { propertyId } = await searchParams;
  if (!propertyId) redirect('/properties');

  // Verify the user owns this Property before letting them author a Design
  // under it. RLS would catch a forged propertyId at insert time, but a
  // server-side pre-check gives us a friendly redirect instead of a
  // form-level error.
  const property = await getProperty(propertyId);
  if (!property) redirect('/properties');

  const action = createDesign.bind(null, property.id);

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            New design
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Designs sit on top of <span className="text-text-primary">{property.name}</span>.
            Give yours a name; you can fill the elements (guilds, ponds, beds…) once you
            land in the editor.
          </p>
        </header>

        <section
          className="rounded-2xl border border-border-solid bg-surface-glass px-7 py-8 backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          <form action={action} className="flex flex-col gap-5">
            <label htmlFor="name" className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-text-muted">Name</span>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Spring 2026 plan"
                className="h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
              />
            </label>

            <label htmlFor="description" className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
                Description (optional)
              </span>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What's the plan for this one?"
                className="rounded-md border border-border-glass bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border-chrome px-5 text-sm font-medium"
              style={{
                background: 'var(--gradient-accent-chrome)',
                color: 'var(--color-text-inverse)',
                boxShadow: 'var(--shadow-chrome)',
              }}
            >
              Create design
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
