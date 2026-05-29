import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { deleteProperty } from '@/app/properties/actions';
import { PropertyMap } from '@/app/properties/PropertyMap';
import { getCurrentAccount } from '@/lib/auth/session';
import { listDesignsForProperty, type DesignSummary } from '@/lib/designs/queries';
import { getProperty } from '@/lib/properties/queries';

export default async function PropertyShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const { id } = await params;
  const property = await getProperty(id);
  if (!property) {
    // Either the row doesn't exist or RLS denied the read -- both surface
    // as "not yours" to the user; we don't differentiate (no info leak).
    redirect('/properties');
  }

  const deleteAction = deleteProperty.bind(null, property.id);
  const designs = await listDesignsForProperty(property.id);

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight">
              {property.name}
            </h1>
            <p className="text-sm text-text-muted">{property.address ?? 'No address yet'}</p>
            {property.usdaZone ? (
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-gold">
                USDA zone {property.usdaZone}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${property.id}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-chrome px-4 text-xs font-medium"
              style={{
                background: 'var(--gradient-accent-chrome)',
                color: 'var(--color-text-inverse)',
                boxShadow: 'var(--shadow-chrome)',
              }}
            >
              Edit
            </Link>
            <form action={deleteAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-state-danger px-4 text-xs font-medium text-state-danger hover:bg-state-danger hover:text-text-inverse"
              >
                Delete
              </button>
            </form>
          </div>
        </header>

        <PropertyMap center={property.center} outline={property.parcelOutline} />

        <DesignsSection propertyId={property.id} designs={designs} />
      </main>
    </>
  );
}

function DesignsSection({
  propertyId,
  designs,
}: {
  propertyId: string;
  designs: DesignSummary[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-xl font-medium">Designs</h2>
        <Link
          href={`/designs/new?propertyId=${propertyId}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-border-chrome px-4 text-xs font-medium"
          style={{
            background: 'var(--gradient-accent-chrome)',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--shadow-chrome)',
          }}
        >
          New design
        </Link>
      </header>
      {designs.length === 0 ? (
        <p
          className="rounded-xl border border-border-glass bg-surface-glass px-5 py-4 text-sm text-text-muted backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          No designs yet. A design overlays elements (guilds, ponds, beds…) on the
          parcel. Create one to open the editor.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {designs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/designs/${d.id}`}
                className="flex flex-col gap-1 rounded-xl border border-border-glass bg-surface-glass px-5 py-4 backdrop-blur-md hover:border-border-solid"
                style={{ boxShadow: 'var(--shadow-panel)' }}
              >
                <p className="font-display text-lg font-medium text-text-primary">{d.name}</p>
                {d.description ? (
                  <p className="text-xs text-text-muted">{d.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
