'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { signIn, type SignInResult } from './actions';

/**
 * Email + password sign-in. Mirrors `/signup` -- see `./actions.ts` for the
 * why behind dropping magic-link in favour of traditional auth.
 */
export default function SignInPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SignInResult | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      // The action redirects on success; we only see a return value on failure.
      const r = await signIn(formData);
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
          <h1 className="font-display text-3xl font-medium tracking-tight">Sign in</h1>
          <p className="max-w-sm text-sm text-text-muted">Welcome back.</p>
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
              autoComplete="current-password"
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
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-text-muted">
          New here?{' '}
          <Link href="/signup" className="text-text-gold hover:text-state-hover">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
