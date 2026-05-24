/**
 * Landing page — bootstrap brand-identity proof.
 *
 * Per issue #1 acceptance criteria: visually demonstrate the four brand-mood
 * primitives — obsidian base, gold-accented translucent glass panel, sunlight
 * radial-gradient hero moment, chrome CTA. Real product surfaces ship later;
 * this page exists to anchor the visual contract for everything downstream.
 *
 * No default Tailwind palette utilities here — enforced at CI time by
 * `app/page.test.tsx` anti-generic guard.
 */
export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      {/* Sunlight radial glow — pointer-events-none so it doesn't intercept clicks. */}
      <div
        data-testid="brand-sunlight"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, oklch(80% 0.15 75 / 0.28), transparent 60%)',
        }}
      />

      <header className="relative z-10 flex flex-col items-center gap-5 text-center">
        <h1 className="font-display text-5xl font-medium leading-tight tracking-tight sm:text-6xl">
          food-forest-planner
        </h1>
        <p className="max-w-xl text-balance text-lg text-text-muted">
          Plan your food forest on a map. Permaculture and syntropic agroforestry tooling
          for hobbyists and consultants.
        </p>
      </header>

      <section
        data-testid="brand-glass-panel"
        className="relative z-10 mt-14 flex flex-col items-center gap-5 rounded-2xl border border-border-solid bg-surface-glass px-8 py-7 backdrop-blur-md"
        style={{ boxShadow: 'var(--shadow-panel)' }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-text-gold">
          v0.0.0 — bootstrapping
        </p>
        <p className="max-w-md text-center text-sm text-text-muted">
          Building in the open under AGPL-3.0. Follow along on GitHub.
        </p>
        <a
          href="https://github.com/Reiahx01/food-forest-planner"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border-chrome px-5 text-sm font-medium"
          style={{
            background: 'var(--gradient-accent-chrome)',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--shadow-chrome)',
          }}
        >
          View on GitHub
        </a>
      </section>
    </main>
  );
}
