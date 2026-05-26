import { redirect } from 'next/navigation';

import { chooseRole } from './actions';

import { getCurrentAccount } from '@/lib/auth/session';


/**
 * One-screen onboarding flow (#6). Two large brand-styled cards forming a
 * single choice the user can't back-button past -- each card's `<form
 * action>` is a server action that writes the role + `onboarded_at` and
 * redirects to /dashboard.
 *
 * Server-level redirects (here + in proxy.ts + dashboard/page.tsx) form a
 * three-layer defence: regardless of how the user arrived, the right page
 * loads.
 */
export default async function OnboardingPage() {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (current.account.onboardedAt) redirect('/dashboard');

  // `bind` (or a hidden input) is the canonical way to pass a non-form-field
  // argument into a Server Action. We use a thin wrapper instead because
  // chooseRole's signature is `(role) => never`, and pre-binding gives us
  // type-safe form actions.
  const pickHobbyist = chooseRole.bind(null, 'hobbyist');
  const pickPro = chooseRole.bind(null, 'pro');

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, oklch(80% 0.15 75 / 0.22), transparent 60%)',
        }}
      />

      <header className="relative z-10 mb-10 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight">
          How will you use food-forest-planner?
        </h1>
        <p className="max-w-xl text-balance text-sm text-text-muted">
          Pick the option that fits today. You can change this any time from settings.
        </p>
      </header>

      <section className="relative z-10 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        <form action={pickHobbyist}>
          <RoleCard
            title="Hobbyist"
            description="Designing for myself — one or more properties I own, plan, or steward."
            cta="Designing for myself"
          />
        </form>

        <form action={pickPro}>
          <RoleCard
            title="Pro"
            description="Designing for clients — permaculture consultancy, multiple client rosters."
            cta="Designing for clients"
          />
        </form>
      </section>
    </main>
  );
}

function RoleCard({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <button
      type="submit"
      className="flex h-full w-full flex-col items-start gap-4 rounded-2xl border border-border-solid bg-surface-glass px-7 py-8 text-left backdrop-blur-md hover:border-border-chrome focus:outline-none focus:ring-2 focus:ring-state-selected"
      style={{ boxShadow: 'var(--shadow-panel)' }}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-text-gold">{title}</p>
      <p className="text-base text-text-primary">{description}</p>
      <span
        className="mt-auto inline-flex h-10 items-center justify-center rounded-md border border-border-chrome px-4 text-sm font-medium"
        style={{
          background: 'var(--gradient-accent-chrome)',
          color: 'var(--color-text-inverse)',
          boxShadow: 'var(--shadow-chrome)',
        }}
      >
        {cta}
      </span>
    </button>
  );
}
