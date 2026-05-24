/**
 * Canonical brand tokens.
 *
 * Single source of truth for the food-forest-planner visual system. Consumed
 * by: Tailwind v4 @theme (mirrored in app/globals.css), element-module map
 * renderers (MapLibre layer paint properties), and React components that need
 * literal values (e.g. inline SVG fills, sun-path arc colors).
 *
 * Brand spec: docs/v1-plan.md §8 — "luxe / nocturnal" mood. Obsidian dominant
 * base, gold-bordered translucent glass panels, chrome interactive accents,
 * sunlight as warm radial-gradient moments.
 *
 * Why OKLCH: perceptually uniform — equal numeric changes look like equal
 * visual changes. Better than HSL for sibling tokens that must stay
 * visually-related (e.g. gold vs goldBright vs goldDim).
 *
 * Token-update rule: any change here MUST be mirrored in app/globals.css
 * @theme block. The parity test in app/brand/tokens-parity.test.ts enforces
 * this at CI time.
 */
export const tokens = {
  surface: {
    /** Obsidian base — everywhere outside panels + accents. */
    base: 'oklch(11% 0.01 280)',
    /** Slightly lifted panel (cards, sidebars). */
    raised: 'oklch(15% 0.012 280)',
    /** Translucent overlay fill (modals, panels, glass) — pair with backdrop-blur and a gold border. */
    glass: 'oklch(15% 0.012 280 / 0.6)',
    /** Sunlight radial moment for hero / empty-states / completion screens. */
    glow: 'radial-gradient(circle, oklch(80% 0.15 75 / 0.25), transparent 70%)',
  },
  accent: {
    /** Warm amber — the load-bearing brand accent. */
    gold: 'oklch(72% 0.13 80)',
    /** De-emphasised gold for secondary surfaces. */
    goldDim: 'oklch(55% 0.10 80)',
    /** Sunlit gold — used by sun-path overlay arcs. */
    goldBright: 'oklch(82% 0.14 75)',
    /** Metallic chrome — buttons, sliders, map controls. */
    chrome: 'linear-gradient(180deg, oklch(85% 0.005 250), oklch(60% 0.005 250))',
    /** Cool water — Pond + Swale elements; deliberately distinct from gold. */
    water: 'oklch(70% 0.10 230)',
    /** Warm earth — Bed element; deliberately distinct from gold + obsidian. */
    earth: 'oklch(45% 0.04 50)',
  },
  border: {
    /** Gold-tinted thin border for glass panels. */
    glass: 'oklch(72% 0.13 80 / 0.3)',
    /** Stronger gold border for emphasis. */
    solid: 'oklch(72% 0.13 80 / 0.8)',
    /** Chrome border for metallic surfaces. */
    chrome: 'oklch(85% 0.005 250 / 0.5)',
  },
  text: {
    /** Warm white — primary text on obsidian. */
    primary: 'oklch(95% 0.01 80)',
    /** Muted text for secondary information. */
    muted: 'oklch(70% 0.015 80)',
    /** Text on bright surfaces (sunlit, chrome highlights). */
    inverse: 'oklch(11% 0.01 280)',
    /** Gold text for emphasis. */
    gold: 'oklch(72% 0.13 80)',
  },
  state: {
    hover: 'oklch(80% 0.14 80)',
    selected: 'oklch(72% 0.13 80)',
    danger: 'oklch(60% 0.20 25)',
    success: 'oklch(70% 0.12 145)',
  },
  shadow: {
    /** Gold-glow shadow for emphasis on dark surfaces. */
    glow: '0 0 24px oklch(72% 0.13 80 / 0.25), 0 4px 16px oklch(11% 0.01 280 / 0.6)',
    /** Layered panel shadow with subtle gold inset. */
    panel: '0 12px 32px oklch(11% 0.01 280 / 0.8), inset 0 1px 0 oklch(72% 0.13 80 / 0.15)',
    /** Subtle chrome shadow + border. */
    chrome: '0 1px 2px oklch(11% 0.01 280 / 0.8), 0 0 0 1px oklch(85% 0.005 250 / 0.5)',
  },
} as const;

export type BrandTokens = typeof tokens;
