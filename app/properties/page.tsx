import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { getCurrentAccount } from '@/lib/auth/session';
import { listProperties, type PropertySummary } from '@/lib/properties/queries';

export default async function PropertiesPage() {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const items = await listProperties();

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-medium tracking-tight">Properties</h1>
          <Link
            href="/properties/new"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border-chrome px-5 text-sm font-medium"
            style={{
              background: 'var(--gradient-accent-chrome)',
              color: 'var(--color-text-inverse)',
              boxShadow: 'var(--shadow-chrome)',
            }}
          >
            New property
          </Link>
        </header>

        {items.length === 0 ? <EmptyState /> : <PropertyList items={items} />}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <section
      className="flex flex-col items-center gap-4 rounded-2xl border border-border-solid bg-surface-glass px-8 py-12 text-center backdrop-blur-md"
      style={{ boxShadow: 'var(--shadow-panel)' }}
    >
      <p className="font-display text-2xl font-medium">No properties yet</p>
      <p className="max-w-md text-sm text-text-muted">
        Create your first property to start designing. You can add the address now and
        sketch the parcel later -- nothing is locked in until you save.
      </p>
      <Link
        href="/properties/new"
        className="inline-flex h-10 items-center justify-center rounded-md border border-border-chrome px-5 text-sm font-medium"
        style={{
          background: 'var(--gradient-accent-chrome)',
          color: 'var(--color-text-inverse)',
          boxShadow: 'var(--shadow-chrome)',
        }}
      >
        Create your first property
      </Link>
    </section>
  );
}

function PropertyList({ items }: { items: PropertySummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/properties/${p.id}`}
            className="flex flex-col gap-2 rounded-xl border border-border-glass bg-surface-glass px-5 py-4 backdrop-blur-md hover:border-border-solid"
            style={{ boxShadow: 'var(--shadow-panel)' }}
          >
            <p className="font-display text-xl font-medium text-text-primary">{p.name}</p>
            <p className="text-xs text-text-muted">{p.address ?? 'No address yet'}</p>
            {p.usdaZone ? (
              <p className="text-xs uppercase tracking-[0.16em] text-text-gold">USDA zone {p.usdaZone}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
