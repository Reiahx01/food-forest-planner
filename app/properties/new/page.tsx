import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { createProperty } from '@/app/properties/actions';
import { PropertyForm } from '@/app/properties/PropertyForm';
import { getCurrentAccount } from '@/lib/auth/session';

export default async function NewPropertyPage() {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            New property
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Give it a name (and an address, if you have one). You can draw the parcel
            outline after saving.
          </p>
        </header>

        <section
          className="rounded-2xl border border-border-solid bg-surface-glass px-7 py-8 backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          <PropertyForm action={createProperty} submitLabel="Create property" />
        </section>
      </main>
    </>
  );
}
