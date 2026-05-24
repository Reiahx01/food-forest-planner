# 0002 — Polymorphic Element table + `ElementTypeModule<T>` interface

- **Status:** Proposed (2026-05-24) — operator review pending
- **Deciders:** @Reiahx01

## Context

A food-forest design is a graph of **elements** placed on a property: ponds, swales, paths, beds, buildings, and (in time) more types contributed by the community. Each element type has:

- A **geometry shape** (point, line, polygon) that constrains how it's drawn on the map.
- **Type-specific attributes** (a pond has depth + liner-type; a bed has soil-amendments + bed-shape; a swale has slope + key-line offset).
- **Type-specific rendering** (MapLibre paint properties, hover behavior, click-to-edit panel).
- **Type-specific validation rules** (a building can't overlap a pond; a swale must follow a contour line; a path must connect at both endpoints).

The naive options are:

1. **One table per element type** (`ponds`, `swales`, `paths`, ...). Strongly typed at the database level, but each new element type requires schema migration, RLS-policy duplication, and a new code path in every consumer (rendering, validation, undo/redo, export).
2. **Single polymorphic table with branching consumers.** A `kind` column drives `switch` statements everywhere. New types require touching every consumer.
3. **Polymorphic table + typed plug-in module interface** (this ADR's choice).

[Operator: verify this is the framing from your planning notes.]

## Decision

**One `elements` table** that holds the common fields shared across all element types:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `design_id` | uuid (fk) | the parent Design |
| `kind` | text (enum) | discriminator: `pond`, `swale`, `path`, `bed`, `building`, ... |
| `geometry` | geometry (PostGIS) | point / line / polygon — shape constrained by `kind` |
| `attrs` | jsonb | type-specific fields, schema enforced at the application layer |
| `created_at`, `updated_at` | timestamptz | |
| `created_by` | uuid (fk users) | |

**Every element type ships as one file** implementing a typed interface:

```ts
export interface ElementTypeModule<TAttrs extends Record<string, unknown>> {
  kind: string;                          // discriminator value, must match the enum
  geometry: 'point' | 'line' | 'polygon';
  defaultAttrs: TAttrs;                  // used when placing a new instance
  attrsSchema: ZodSchema<TAttrs>;        // validates attrs jsonb at write time
  paint: MapLibrePaintSpec;              // how it renders on the map
  EditorPanel: React.ComponentType<...>; // shown when clicked
  validate?: (el: Element<TAttrs>, design: Design) => ValidationIssue[] | null;
}
```

A registry at `app/elements/registry.ts` collects every module and is the single point consumers read from. **Consumers never branch on `kind` directly** — they look up the module and call its methods.

Adding a new element type = create one file under `app/elements/<kind>/module.ts`, export the module, register it. No schema migration, no RLS change, no edits to renderer / validator / undo system.

## Consequences

**Accepted positives:**

- **Variant addition is a single-file PR.** Contributing a new element type (e.g. a "compost bin" community PR) touches one file plus tests. Reviewers can read the whole change in 5 minutes.
- **No `switch (element.kind)` rot.** Lint can enforce the no-branching rule once we add a custom ESLint check (v1.x backlog).
- **RLS is simple** — one set of policies on `elements` keyed on `design_id` and the owning user, no per-kind duplication.
- **Validation lives next to the type's definition**, not in a separate `validators/` folder that drifts.

**Accepted negatives:**

- **Database-level type safety is weaker.** Postgres sees `attrs` as opaque jsonb; the actual schema is enforced by `attrsSchema` at the app layer. A direct SQL write that bypasses the app could insert malformed attrs. Mitigated by RLS forbidding direct writes from anon role.
- **jsonb queries are less ergonomic** than columns for some analytical use cases (e.g. "average pond depth"). For v1 we don't need them; if they appear, we add materialized columns derived from `attrs` via triggers.
- **A bad interface design propagates.** If `ElementTypeModule<T>` has the wrong shape, every module suffers. Mitigated by treating the interface itself as a load-bearing artifact — changes to it require a new ADR.

## Alternatives considered

- **One table per element type.** Rejected: schema migration friction is too high for a project that intends to grow its set of element types organically. Five existing types plus an expected long tail of community contributions makes the per-type-table pattern collapse under its own weight.
- **Polymorphic table with branching consumers** (no plug-in interface). Rejected: this is the failure mode the interface architecture exists to prevent. Branching consumers produce N×M complexity (N consumers × M types).
- **EAV (entity-attribute-value) tables for attrs.** Rejected: kills query performance, prevents JSON-shape evolution, and offers no improvement over jsonb + schema validation.

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **5+ element types exist** and three or more of them need behavior that doesn't fit the interface (e.g. an element type that owns child elements, or one that spans multiple designs). → Split the interface into `ElementTypeModule` + `CompositeElementModule`, or reconsider per-type tables for the outliers.
- **Polymorphic queries become slow.** P95 query latency on `select * from elements where design_id = $1` exceeds [Operator: name a threshold — suggested: 100ms at 10k elements per design]. → Add a covering index on `(design_id, kind)` first; if that fails, consider per-type tables for the largest-volume types.
- **A community contributor cannot add a new element type without modifying core code.** The interface failed at its one job. → Reopen the interface design.

[Operator: verify the elements-per-design and latency thresholds against your real expectations — these are placeholders.]
