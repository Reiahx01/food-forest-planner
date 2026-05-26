import { redirect } from 'next/navigation';

import { Nav } from '@/app/components/Nav';
import { getCurrentAccount } from '@/lib/auth/session';

/**
 * Dashboard landing (#5 + #6). Empty surface today; real Properties (#10)
 * and Designs (#13) fill it in.
 *
 * Defence-in-depth redirects mirror what the proxy does at the edge:
 *   - no session     -> /signup
 *   - not onboarded  -> /onboarding
 */
export default async function DashboardPage() {
  const current = await getCurrentAccount();
  if (!current) redirect('/signup');
  if (!current.account.onboardedAt) redirect('/onboarding');

  return (
    <>
      <Nav accountRole={current.account.role} />
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <section
          className="relative z-10 flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border-solid bg-surface-glass px-8 py-9 text-center backdrop-blur-md"
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Hi {current.account.email}
          </h1>
          <p className="text-xs uppercase tracking-[0.16em] text-text-gold">
            Role: {current.account.role}
          </p>
          <p className="max-w-sm text-sm text-text-muted">
            Your dashboard will fill in as Properties (#10) and Designs (#13) ship.
          </p>
        </section>
      </main>
    </>
  );
}
