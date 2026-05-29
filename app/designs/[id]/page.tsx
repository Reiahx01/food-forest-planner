import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { deleteDesign } from '@/app/designs/actions';
import { getCurrentAccount } from '@/lib/auth/session';
import { getDesign } from '@/lib/designs/queries';

export default async function DesignShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const { id } = await params;
  const design = await getDesign(id);
  if (!design) redirect('/properties');

  const deleteAction = deleteDesign.bind(null, design.id);

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/properties/${design.propertyId}`}
              className="text-xs uppercase tracking-[0.16em] text-text-muted hover:text-state-hover"
            >
              ← Back to property
            </Link>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
              {design.name}
            </h1>
            {design.description ? (
              <p className="mt-2 max-w-prose text-sm text-text-muted">{design.description}</p>
            ) : null}
          </div>
          <form action={deleteAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-state-danger px-4 text-xs font-medium text-state-danger hover:bg-state-danger hover:text-text-inverse"
            >
              Delete
            </button>
          </form>
        </header>

        <Link
          href={`/designs/${design.id}/edit`}
          className="inline-flex h-12 items-center justify-center self-start rounded-md border border-border-chrome px-6 text-sm font-medium"
          style={{
            background: 'var(--gradient-accent-chrome)',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--shadow-chrome)',
          }}
        >
          Open editor
        </Link>

        <section
          className="rounded-xl border border-border-glass bg-surface-glass px-5 py-4 text-sm text-text-muted backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          Element placement (guilds, ponds, beds…) lands in #14. For now, the editor
          shows the parcel + the six element types as placeholders so the flow is
          discoverable.
        </section>
      </main>
    </>
  );
}
