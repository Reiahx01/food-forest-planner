# 0001 — Stack: Next.js 16 + Supabase + MapLibre + Esri + Vercel; AGPL-3.0

- **Status:** Accepted (2026-05-24)
- **Deciders:** @Reiahx01

## Context

food-forest-planner needs a stack that supports:

- A **map-first interactive editor** (parcels, element placement, sectoring overlays) where the map is the primary surface, not a widget.
- **Multi-tenancy** with two roles (hobbyist, pro) where pros manage clients-of-clients (Property → Client → Pro account).
- **OSS distribution under AGPL-3.0** — the project is meant to be forkable and self-hostable, not a SaaS-only deliverable.
- **Cheap-to-free runtime cost** for the OSS-default deployment shape; commercial hosting is a downstream concern.
- A **realistic solo-maintainer ergonomics budget** — every dependency must justify its own per-week maintenance overhead.

## Decision

| Layer | Choice | Why this, not the obvious alternative |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | SSG + RSC out of the box; the Vercel-blessed defaults align with our hosting; React 19 ecosystem maturity. |
| Database + auth | **Supabase** (Postgres + Auth + Storage + RLS) | Open-core Postgres beats Convex's proprietary engine for forkability; self-hostable; RLS is the load-bearing security primitive (see ADR-0003). |
| Auth provider | **Supabase Auth** | Bundled with the database, so RLS sees the user id natively. Avoids Clerk's per-MAU pricing model and proprietary user store. |
| Map renderer | **MapLibre GL JS** | OSS fork of pre-proprietary Mapbox GL; no token, no rate limit on the renderer itself. Decoupled from tile source. |
| Map tiles | **Esri World Imagery** (raster basemap) | Free for non-commercial + attribution; high-resolution global imagery; permissive enough for AGPL distribution. See ADR-0006. |
| Hosting | **Vercel** (default OSS deployment) | Next.js-first; generous free tier; zero-config preview deployments. Replaceable — `next build` produces standard output. |
| License | **AGPL-3.0** | Hosted forks must publish their source. Prevents the "extract value, contribute nothing" pattern that befell early permissively-licensed mapping projects. |

## Consequences

**Accepted positives:**

- Anyone can fork, self-host, and run the app on a hobbyist VPS for ~$5/mo (Supabase local + a small Postgres + a static Next.js build).
- The hot path (Postgres + RLS + Next.js) is single-vendor-independent; we can swap hosting providers without rewriting application code.
- Map tiles are free at our expected scale and stay free as we grow into the low six figures of monthly requests.
- AGPL is a meaningful contributor-protection signal — it filters out the kind of fork that would harm the project without changing anything else.

**Accepted negatives:**

- **AGPL deters proprietary integrators.** Companies that would otherwise embed this in a closed-source workflow will not. This is intentional — they are not the target user — but it does shrink the addressable contribution pool slightly.
- **Supabase is a single point of vendor concentration** for auth + db + storage. If Supabase's hosted offering becomes prohibitively expensive or pivots away from open-core, we have to migrate three subsystems at once. Mitigated by self-hostability.
- **Vercel charges aggressively above free tier** (bandwidth, edge invocations). Long-tail commercial users would likely move to their own infra; the OSS-default deploy stays free.
- **Esri attribution is non-trivial** and required on every map view. The renderer chrome must always display it (see ADR-0006).

## Alternatives considered

- **Convex** instead of Supabase. Faster developer ergonomics, beautiful real-time primitives, but the database engine is proprietary. A fork running on Convex is locked to Convex. Rejected on portability grounds.
- **Clerk** instead of Supabase Auth. Better hosted UX, but introduces a per-MAU cost that scales with user adoption and a separate user store that RLS would have to mirror via JWT claims. Rejected on cost + indirection grounds.
- **Mapbox GL JS** instead of MapLibre. Original of MapLibre's fork; more polished, more features. The license change in late 2020 (proprietary, requires a token, BSL) makes it AGPL-incompatible for our distribution model. Rejected on licensing grounds.
- **Google Maps Platform** instead of MapLibre + Esri. The most familiar option for end users; paid past a small free tier; ToS restricts derivative works in ways AGPL contributors would find friction with. Rejected on cost + licensing grounds.
- **MIT or Apache-2.0** instead of AGPL-3.0. Larger addressable contributor pool; permits proprietary forks that don't contribute back. Rejected on project-health grounds.

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **Supabase pricing change** that pushes the production hosted cost above $300/mo at 1k MAU on the smallest viable plan. → Migrate to self-hosted Supabase or PlanetScale + a Postgres-compatible alternative.
- **Next.js 16 introduces an unfixable regression** for our editor surface (e.g. RSC + MapLibre interop breaks) that the Next team declines to fix within one minor version. → Pin to last working version and evaluate Remix or Astro for v2.
- **AGPL discourages a meaningful named contributor** (a person we'd otherwise want, naming them in the new ADR). → Reopen the license choice; the contributor pool matters more than the philosophical defense.
- **Mapbox GL JS relicenses back to permissive**. → Reopen ADR-0006 only; this ADR's other layers are unaffected.
