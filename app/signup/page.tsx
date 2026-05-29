'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { signUp, type SignUpResult } from './actions';

/**
 * Email + password signup. Replaces the prior magic-link flow -- see
 * `./actions.ts` for the why.
 *
 * Brand discipline matches the rest of the auth surface: token-only
 * Tailwind utilities. The anti-generic test in `page.test.tsx` blocks
 * default palette utilities from sneaking in.
 */
export default function SignupPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SignUpResult | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      // The action redirects on success, so we only see a return value on
      // failure (the redirect throws NEXT_REDIRECT which Next handles before
      // we get here).
      const r = await signUp(formData);
      setResult(r);
    });
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, oklch(80% 0.15 75 / 0.22), transparent 60%)',
        }}
      />

      <section
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border-solid bg-surface-glass px-8 py-9 backdrop-blur-md"
        style={{ boxShadow: 'var(--shadow-panel)' }}
      >
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-3xl font-medium tracking-tight">Sign up</h1>
          <p className="max-w-sm text-sm text-text-muted">
            Email + a password you&apos;ll remember. You&apos;re in as soon as you submit
            -- no email round-trip.
          </p>
        </header>

        <form action={onSubmit} className="flex w-full flex-col gap-4">
          <label htmlFor="email" className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-text-muted">Email</span>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
            />
          </label>

          <label htmlFor="password" className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
              Password
            </span>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11 rounded-md border border-border-glass bg-surface-raised px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-solid"
            />
          </label>

          {result && !result.ok ? (
            <p role="alert" className="text-xs text-state-danger">
              {result.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border-chrome px-5 text-sm font-medium disabled:opacity-60"
            style={{
              background: 'var(--gradient-accent-chrome)',
              color: 'var(--color-text-inverse)',
              boxShadow: 'var(--shadow-chrome)',
            }}
          >
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-text-muted">
          Already have an account?{' '}
          <Link href="/signin" className="text-text-gold hover:text-state-hover">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
