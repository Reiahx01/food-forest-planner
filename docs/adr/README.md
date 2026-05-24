# Architecture Decision Records

This directory captures the **load-bearing decisions** made during planning and early implementation of food-forest-planner. Each record is named `NNNN-short-slug.md` and follows a fixed structure:

1. **Status** — `Proposed`, `Accepted`, `Deprecated`, or `Superseded by NNNN`
2. **Context** — the situation that forced a choice
3. **Decision** — what we're doing
4. **Consequences** — what we accept as a result (positive + negative)
5. **Alternatives considered** — what we rejected and why
6. **Revisit condition** — the tripwire that should make us reopen this decision, with a measurable threshold and a path to supersede

The **Revisit condition** field is what distinguishes these from "we wrote it down and forgot" docs. Every decision here is bounded — we name in advance what evidence would force us to change it. Without that bound, an ADR ossifies into law instead of remaining a judgment.

## Index

| # | Title | Status | Decision in one line |
|---|-------|--------|----------------------|
| [0001](./0001-stack.md) | Stack: Next.js 16 + Supabase + MapLibre + Esri + Vercel; AGPL-3.0 | Accepted | Pick OSS-friendly, runtime-cheap, fork-resilient infrastructure over enterprise convenience |
| [0002](./0002-element-interface-architecture.md) | Polymorphic Element table + `ElementTypeModule<T>` interface | Accepted | One table + typed interface, not one table per element type |
| [0003](./0003-rls-role-gating.md) | Role gating in Postgres RLS, not app middleware | Accepted | The database is the security boundary; app code can be misread but RLS cannot be bypassed |
| [0004](./0004-brand-luxe-nocturnal.md) | "Luxe nocturnal" brand mood; OKLCH semantic tokens; light mode deferred to v2 | Accepted | Pick a single, opinionated mood over generic flexibility; codify DON'Ts |
| [0005](./0005-plant-library-phased.md) | Plant library phased v1 curated → v1.1 user-private → v1.2 community-moderated | Accepted | Single `species` table with a `source` discriminator across all three phases |
| [0006](./0006-map-libre-esri.md) | MapLibre GL JS + Esri raster tiles over Mapbox / Google | Accepted | OSS map renderer + permissive tile source; preserves AGPL forkability |

## When a new ADR is warranted

Add an ADR (`NNNN-slug.md`, next sequential number) when:

- A **load-bearing technology** is chosen or replaced (auth provider, database, map renderer, billing platform).
- A **plug-in surface contract** is defined or significantly changed (e.g. adding a new module-shape interface alongside `ElementTypeModule<T>`).
- A **security or data-isolation boundary** is established or moved (where RLS predicates live, what's hashed, what's encrypted at rest).
- A **legal / licensing decision** is made (license choice, contributor agreement, trademark policy).
- A **product-scope cut or deferral** is made that other contributors will repeatedly bump into (e.g. "no offline mode in v1").
- A previous ADR's **revisit condition trips** — write a new ADR that supersedes the old one rather than editing the old one in place. The historical record matters.

Do NOT write an ADR for:

- Routine refactors, file moves, or naming changes.
- Choices that can be reversed in a single PR with no contributor coordination (e.g. switching a CSS variable from rem to px).
- Library bumps within the same ecosystem (Renovate handles those).

## Supersede protocol

When a decision is replaced:

1. Write a new ADR (`NNNN-slug.md`) with the new decision.
2. In the new ADR's `Context`, link to the old one and summarize what changed.
3. Edit the old ADR's `Status` to `Superseded by [NNNN](./NNNN-slug.md)` and add a one-line note in `Context` pointing forward.
4. Update this index's row for the old ADR (status column) and append a row for the new one.
5. Old ADR files are **never deleted**.
