import Link from 'next/link';

import type { AccountRole } from '@/db/schema/accounts';

/**
 * Top nav shown on authenticated pages. The /clients link is gated by
 * `role === 'pro'`. The route itself doesn't exist until #11; for #6 we just
 * need the visibility logic in place.
 *
 * Rendered server-side from `getCurrentAccount()`, so the gating is
 * authoritative -- not a client-side hide that could be bypassed.
 */
export function Nav({ accountRole }: { accountRole: AccountRole }) {
  return (
    <nav className="flex items-center gap-5 border-b border-border-glass bg-surface-raised/40 px-6 py-3 backdrop-blur-md">
      <Link
        href="/dashboard"
        className="text-xs uppercase tracking-[0.18em] text-text-gold hover:text-state-hover"
      >
        Dashboard
      </Link>
      <Link
        href="/properties"
        className="text-xs uppercase tracking-[0.18em] text-text-muted hover:text-state-hover"
      >
        Properties
      </Link>
      {accountRole === 'pro' ? (
        <Link
          href="/clients"
          className="text-xs uppercase tracking-[0.18em] text-text-muted hover:text-state-hover"
        >
          Clients
        </Link>
      ) : null}
    </nav>
  );
}
