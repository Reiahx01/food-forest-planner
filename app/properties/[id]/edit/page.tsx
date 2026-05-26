import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { updateProperty } from '@/app/properties/actions';
import { PropertyForm } from '@/app/properties/PropertyForm';
import { getCurrentAccount } from '@/lib/auth/session';
import { getProperty } from '@/lib/properties/queries';

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  const { id } = await params;
  const property = await getProperty(id);
  if (!property) redirect('/properties');

  const action = updateProperty.bind(null, property.id);

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Edit property
          </h1>
        </header>
        <section
          className="rounded-2xl border border-border-solid bg-surface-glass px-7 py-8 backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          <PropertyForm
            action={action}
            initial={{ name: property.name, address: property.address }}
            submitLabel="Save changes"
          />
        </section>
      </main>
    </>
  );
}
