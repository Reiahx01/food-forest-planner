# 0005 — Plant library phased: v1 curated → v1.1 user-private → v1.2 community-moderated

- **Status:** Proposed (2026-05-24) — operator review pending
- **Deciders:** @Reiahx01

## Context

The plant library is the **single most user-facing data asset** in the product. Every Bed, Guild, and overlay decision flows through "what species does this hold?" The library has three pressures pulling in different directions:

1. **Quality at v1.** Users need real, accurate, curated plant data on day one. A library full of crowd-sourced noise is worse than a small curated one — bad data on a Bed propagates into placement, sun-path, and water decisions downstream.
2. **Coverage over time.** A curated set will never cover every species a user wants. The library must grow without the maintainer becoming a bottleneck.
3. **Data integrity under contribution.** Community contributions need a moderation path that scales beyond one maintainer reviewing every entry by hand.

The naive options are:

- **Curated-only forever** (Plant.id model). Solves quality, fails coverage. Becomes a maintainer treadmill.
- **Open contribution from day one** (iNaturalist model). Solves coverage, fails quality. Bad early-stage data poisons the dataset.
- **Phased rollout** (this ADR's choice).

[Operator: verify this framing matches your planning notes — the phased model is referenced in CONTRIBUTING.md and the issue body for #15, but the exact phasing language is inference.]

## Decision

**Three phases, single schema, source discriminator.**

| Phase | Ships with | Who can add species | What "added" means |
|---|---|---|---|
| **v1.0** | Curated seed: ~30 trees + ~50 companion species, hand-vetted | Maintainer only (via PR to `db/seeds/species.json`) | Immediately visible to all users |
| **v1.1** | Private per-account additions | Any signed-in user, for their own account only | Visible only to the user who added it |
| **v1.2** | Community-moderated additions | Any signed-in user, public on approval | Visible to all users after moderator approval |

All three phases share **one `species` table** with a `source` discriminator column:

```sql
create table species (
  id uuid primary key,
  scientific_name text not null,
  common_names text[] not null,
  attrs jsonb not null,           -- hardiness, mature size, sun, water, etc.
  source text not null check (source in ('curated', 'private', 'community')),
  owner_id uuid references users(id),    -- non-null when source = 'private'
  approved_at timestamptz,                -- non-null when source = 'community' AND visible
  approved_by uuid references users(id),  -- moderator id
  created_at timestamptz not null default now()
);
```

**Read visibility** is enforced via a single RLS policy that unions the three phases:

```sql
create policy species_read on species for select using (
  source = 'curated'
  or (source = 'private' and owner_id = auth.uid())
  or (source = 'community' and approved_at is not null)
);
```

**Write paths** differ:

- `curated`: PR to seed file, seeded by migration. No runtime writes.
- `private`: user-facing form; `insert` policy `with check (source = 'private' and owner_id = auth.uid())`.
- `community`: proposed via the same form; insert is allowed but `approved_at` is null until a moderator (a user with `is_moderator = true` on the `users` table) sets it.

## Consequences

**Accepted positives:**

- **v1 ships with trustworthy data**, period. The 80-species seed is small but reliable, and users learn early that what's in the library is what's real.
- **One table, one schema, one set of indexes.** Phased rollout is a feature-flag exercise, not a re-architecture.
- **Users can extend the library for their own use immediately at v1.1** without waiting for community moderation infrastructure.
- **Community contributions land without a maintainer review treadmill** once v1.2 ships. Moderation is delegated.
- **Curated data can be improved over time** via PRs that the seed-loader idempotently reapplies. Corrections are normal git workflow.

**Accepted negatives:**

- **The maintainer is the moderation rate-limit until v1.2 ships.** Between v1.0 and v1.2, any user requesting a species not in the curated set has to add it privately or wait.
- **`source = 'community'` with `approved_at = null` is a queue table.** It can grow unboundedly if no moderators are appointed. Mitigated by a maintenance cron that pings the moderator team when the queue exceeds [Operator: name a threshold — suggested: 100 pending].
- **Schema is single-table.** A future need for very different attribute shapes per species kind (e.g. mushrooms, animals) might strain `attrs jsonb`. Accepted: deal with it when it appears; the cost of premature multi-table design is higher.
- **Private species cannot be "promoted" to community** without a flow we haven't designed yet (v1.2 backlog includes a "share this with the community" button on private species).

## Alternatives considered

- **Per-phase tables** (`species_curated`, `species_private`, `species_community`). Rejected: triples the schema surface, complicates the species picker query (UNION of three), and forces RLS to be reimplemented per table.
- **External API (POWO, GBIF) as the species source.** Rejected: introduces a network dependency in the core editor hot path; offline planning is a goal; data quality is uneven and licensing is a maze.
- **Crowdsource from day one.** Rejected on quality grounds (see Context). Bad early data poisons the trust users need to commit a property design to it.
- **No community moderation, ever — only curated + private.** Rejected on coverage grounds. The curated set will never grow fast enough alone.

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **Curated set proves insufficient at v1.0.** Specifically: > [Operator: name a threshold — suggested: 25%] of recorded placement actions hit "species not in library." → Accelerate v1.1 timeline; consider partial community v1.2 with maintainer-only approval as an interim.
- **Community moderation becomes a backlog rather than a flow.** Specifically: average time-to-approve a community-proposed species > [Operator: suggested: 2 weeks] for three consecutive months. → Reopen the moderation model — paid moderators, tiered approval, or auto-approve-with-reversion.
- **Private species count per user exceeds the v1.1 design assumption** — specifically > 500 per active user. → The per-user library is becoming the primary library; reopen whether community promotion should be the default rather than the exception.
- **Attribute shapes need to diverge.** A new species kind (mushroom, fungi-as-companion, animal in a permaculture context) requires fields that `attrs jsonb` strains to hold validly. → Reopen the single-table choice or design a sub-schema discriminator.

[Operator: verify the 25% / 2-week / 500-species thresholds — these are placeholders sized to feel reasonable but you'd have the operational numbers.]
