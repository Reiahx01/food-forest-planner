# 0004 — "Luxe nocturnal" brand mood; OKLCH semantic tokens; light mode deferred to v2

- **Status:** Proposed (2026-05-24) — operator review pending
- **Deciders:** @Reiahx01

## Context

food-forest-planner is a planning tool that competes with — and consciously distinguishes itself from — a market dominated by **generic SaaS aesthetic**: zinc/slate grays, white backgrounds, bordered cards, blue accents, "minimal" sans-serif type. This aesthetic is competent but interchangeable. Three competitor products look the same in screenshots.

A planning tool for **food forests** is a craft instrument used over hours of focused attention. The visual register should reward that attention rather than fade into background. The decision is to pick a single, opinionated mood and codify it so well that future contributors cannot accidentally drift back toward the generic default.

[Operator: verify this framing — the "anti-generic" intent is clearly present in CONTRIBUTING.md and the existing brand-test guardrails, but the specific mood language is inference.]

## Decision

**Mood: "luxe nocturnal."** Four primitives, each load-bearing:

1. **Obsidian dominant base** — `oklch(11% 0.01 280)`. Almost-black with a faint cool tint. Used everywhere outside panels and accents.
2. **Gold-bordered translucent glass panels** — surfaces lift via `oklch(15% 0.012 280 / 0.6)` fills + `backdrop-blur` + a thin `oklch(72% 0.13 80 / 0.3)` border. Not card-shadows; not flat fills.
3. **Sunlight as warm radial moments** — radial gradients of warm amber `oklch(80% 0.15 75 / 0.25)` for hero, completion screens, and empty states. Light is a deliberate event, not ambient.
4. **Metallic chrome interactive accents** — buttons and controls use a vertical chrome gradient `linear-gradient(180deg, oklch(85% 0.005 250), oklch(60% 0.005 250))`. Distinct from gold; signals interactivity without competing with the brand color.

### Token system

All brand values live in **`app/brand/tokens.ts`** as a canonical TypeScript object, mirrored into Tailwind v4's `@theme` block in `app/globals.css`. A **parity test** (`app/brand/tokens-parity.test.ts`) fails CI if the two drift.

Tokens are **semantic, not literal**:

- ✅ `text.muted`, `surface.glass`, `accent.gold`
- ❌ `gray-400`, `amber-500`, `slate-900`

Semantic tokens decouple the brand from any specific color value. A token rename is one file; a literal-color rename is grep-and-pray.

### OKLCH, not HSL or RGB

OKLCH is perceptually uniform: equal numeric changes look like equal visual changes. This matters specifically for **sibling tokens** that must remain visually-related (`gold` / `goldDim` / `goldBright` differ only in lightness within the same hue). In HSL, dropping lightness by 20% on amber produces brownish mud; in OKLCH, it produces dimmer-but-still-amber.

### Anti-generic guardrails (DON'Ts)

Codified in `AGENTS.md` and enforced at test time by `app/page.test.tsx`:

- No default Tailwind palette utilities: `bg-zinc-*`, `text-gray-*`, `dark:bg-black`, `bg-white`, etc.
- No `shadow-md` / `shadow-lg` / `shadow-xl` (these are the SaaS-card signature).
- No `transition-all` (specify properties; `all` produces sluggish, generic motion).
- No literal hex codes in component code (must come through `tokens.ts`).

Violations fail CI. The DON'T list is the floor; it stays brand-true even if a contributor doesn't read the brand guidelines.

### Light mode deferred to v2

The dark base is **not a theme variant**, it's the brand. A light theme is not a no-op color swap — it requires rethinking the glass panels (translucency doesn't read the same on white), the chrome (chrome on white needs different gradients to feel metallic, not pasty), and the sunlight glow (warm radial on dark = sunlight; warm radial on white = stain). v1 ships dark-only. v2 is a re-brand exercise, not a toggle.

## Consequences

**Accepted positives:**

- The product is **instantly recognizable** in a screenshot or social card. This compounds over time as more screenshots circulate.
- New components inherit the brand by composing tokens — they cannot be "almost right" because the alternative (literal colors) fails CI.
- Refactors and contributor PRs **cannot drift back to generic** without deliberately disabling the guardrails.
- Token-driven theming means a future cobrand or seasonal accent is a token override, not a fork.

**Accepted negatives:**

- **Some users prefer light themes** and we lose them in v1. Accepted: serving the brand-mood vision tightly beats serving everyone weakly.
- **Accessibility requires care.** Gold-on-obsidian is high contrast; gold-on-glass with backdrop-blur can fall below WCAG AA in some panels. Compensated by `text.muted` falling back to brighter values in low-contrast contexts, and by explicit contrast tests (queued for v1.x).
- **OKLCH browser support** is universal in 2026 (Chromium 111+, Firefox 113+, Safari 15.4+), but anyone on a 3-year-old enterprise browser sees fallback colors. Mitigated by a single `@supports not (color: oklch(0% 0 0))` block in globals.css with sRGB fallbacks. [Operator: verify this fallback strategy matches your intent.]
- **Light mode is a real future cost.** v2 will require visual designer time, not just CSS work.

## Alternatives considered

- **Generic SaaS palette** (zinc + blue accent). Rejected: indistinguishable from competitors; nothing to defend.
- **Pure flat design** (no glass, no gradients). Rejected: too cold for a tool about growth and warmth.
- **Skeuomorphic / heavy textures** (wood, leaf imagery). Rejected: dates fast, fights the map at every layer, doesn't translate to UI chrome.
- **HSL or sRGB tokens** instead of OKLCH. Rejected: sibling-token math is unworkable in HSL (see above); sRGB is the wrong color space for perceptual operations.
- **Both light + dark in v1.** Rejected on cost: a high-quality light variant is a real design project, not a CSS toggle.

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **User research shows the "luxe nocturnal" mood actively repels target users** — specifically, > [Operator: name a threshold — suggested: 30%] of a survey of permaculture / agroforestry practitioners cite the visual style as a blocker to adoption. → Reopen the brand brief; light-mode acceleration is on the table.
- **Accessibility audits flag systemic contrast failures** that token-tweaks can't resolve. → Reopen with a contrast-first redesign mandate.
- **OKLCH support regresses** in any browser holding > 2% of our user base (extremely unlikely; included for completeness).
- **The DON'T list catches more than 1 PR per month** for a sustained period. The guardrails are then doing valuable work but signal that contributor onboarding is failing. → Re-examine CONTRIBUTING.md's brand section and/or write a brand-onboarding doc.

[Operator: verify the 30% survey threshold or substitute the metric you actually plan to track. The current value is a placeholder.]
