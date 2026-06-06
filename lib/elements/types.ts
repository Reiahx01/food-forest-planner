import type { ComponentType } from 'react';
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

/** The input the editor host hands a module to render a persisted element. */
export interface ElementRenderInput {
  readonly id: string;
  /** GeoJSON geometry as persisted in `elements.geometry`. */
  readonly geometry: unknown;
}

/** A single MapLibre layer spec the host adds via `map.addLayer`. */
export interface ElementMapLayerSpec {
  readonly id: string;
  readonly type: 'fill' | 'line' | 'circle' | 'symbol';
  readonly source: string;
  readonly paint: Record<string, unknown>;
}

/** A per-element GeoJSON source plus the layers that render it. */
export interface ElementMapRender {
  readonly source: { readonly id: string; readonly data: unknown };
  readonly layers: readonly ElementMapLayerSpec[];
}

/**
 * Props the editor host passes a module's `panel` — the right-sidebar attribute
 * editor. Controlled: the host owns `value` and persists `onChange` (debounced
 * auto-save); `errors` carries server-side field errors to surface inline.
 */
export interface ElementPanelProps<TAttrs> {
  readonly value: TAttrs;
  readonly onChange: (next: TAttrs) => void;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

/**
 * #14 part 1 shipped schema + defaults + validator. Part 2 adds the render +
 * editing surface: `buildMapLayers` (map layers) and `panel` (the right-sidebar
 * attribute editor) are both required. The editor host consumes them via the
 * registry and never branches on element type.
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
   * Map-render factory: given a persisted element (id + geometry), return a
   * per-element GeoJSON source + the MapLibre layer specs that draw it. The
   * editor host adds these via `map.addSource` / `map.addLayer` and never
   * branches on element type.
   */
  readonly buildMapLayers: (element: ElementRenderInput) => ElementMapRender;

  /**
   * The right-sidebar attribute editor for this element type. The editor host
   * renders it via the registry and never imports a type-specific panel.
   */
  readonly panel: ComponentType<ElementPanelProps<TAttrs>>;

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
