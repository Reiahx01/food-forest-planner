import type { z } from 'zod';

import type { ElementType } from '@/db/schema/elements';

/**
 * The plug-in contract every element-type module implements
 * (ADR-0002 + AGENTS.md interface-architecture rule).
 *
 * Adding a new element type = drop in one file under `lib/elements/<type>.ts`
 * implementing `ElementTypeModule<TAttrs>`, then register it. The editor
 * host code never branches on type -- it consumes modules via the registry.
 *
 * Each module owns four concerns:
 *   1. Data validation (the `attributes` Zod schema)
 *   2. Defaults (what fields are present when the user drops a fresh one)
 *   3. UI panel (right-sidebar attribute editor)
 *   4. Map render (MapLibre source + layer specs)
 *
 * The two-part split for #14:
 *   - This file + Guild's data half ship in #14 part 1.
 *   - `panel` (React component) + `buildMapLayers` (style specs) land in
 *     #14 part 2 alongside the editor wiring.
 */

/**
 * Geometry shape per element type. `point` is a single coord; `polygon` is
 * a closed ring; `line` is a multi-vertex line. Stored as GeoJSON in the
 * `elements.geometry` column.
 */
export type ElementGeometryKind = 'point' | 'polygon' | 'line';

/**
 * Domain-rule validation runs AFTER the Zod schema -- it sees the parsed
 * attributes plus the rest of the row context, and returns either an
 * empty list (ok) or a list of human-readable error strings. Used for
 * cross-field invariants the Zod schema can't easily express (e.g.
 * "Guild center tree species must be in the Property's USDA zone range",
 * which needs Property data).
 */
export interface ElementDomainContext {
  /** GeoJSON-shaped geometry as it would be persisted. */
  geometry: unknown;
}

export type DomainRuleResult = string[];

/**
 * Minimum surface for #14 part 1: schema, defaults, and validator. The
 * panel + map-renderer fields are declared optional here so the modules
 * can land in two PRs without forcing every consumer to grow at once.
 * Part 2 marks them required and removes the `?`.
 */
export interface ElementTypeModule<TAttrs> {
  /** Discriminator -- matches the `element_type` Postgres enum value. */
  readonly type: ElementType;

  /** Human-friendly label shown in the editor's left sidebar. */
  readonly label: string;

  /** One-line summary shown under the label. */
  readonly summary: string;

  /** Geometry shape the user draws to instantiate this element. */
  readonly geometry: ElementGeometryKind;

  /** Zod schema for the `attributes` jsonb payload. */
  readonly attributesSchema: z.ZodTypeAny;

  /** Default attributes object used when the user drops a fresh element. */
  readonly defaultAttributes: () => unknown;

  /**
   * Optional domain-rule validator. Returns [] if everything is fine,
   * or one+ error strings if domain invariants are violated. Modules with
   * no cross-field rules can omit this entirely.
   */
  readonly validateDomainRules?: (
    attrs: TAttrs,
    context: ElementDomainContext,
  ) => DomainRuleResult;
}
