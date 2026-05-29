import type { ElementType } from '@/db/schema/elements';

import { guildModule } from './guild';
import type { ElementTypeModule } from './types';

/**
 * A module without a known attribute shape -- the registry's value type.
 *
 * Why `any` in the type parameter: `ElementTypeModule<T>` is contravariant
 * in `T` (the optional `validateDomainRules` consumes `T`). That means
 * `ElementTypeModule<GuildAttributes>` is NOT assignable to
 * `ElementTypeModule<unknown>` because a validator that demands
 * GuildAttributes cannot safely accept `unknown`. `any` is the only TS
 * type that's both covariantly and contravariantly compatible with every
 * specific `T`.
 *
 * Callers safely consume modules through `attributesSchema.safeParse`
 * (which validates `unknown` -> typed `T`), so they never need to know the
 * `T` at compile time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyElementModule = ElementTypeModule<any>;

/**
 * Typed registry of every ElementTypeModule. Adding a new element type =
 * import it here + add it to the map. The host consumer reads via
 * `getElementModule(type)` and never branches on `type` directly.
 *
 * Discipline: this map MUST be exhaustive over the `element_type` enum.
 * If you add a value to the enum without registering a module, the
 * `assertExhaustive` line below fails to compile (the map's keyof becomes
 * a strict subset of `ElementType`).
 */
const REGISTRY: Record<ElementType, AnyElementModule> = {
  guild: guildModule,
};

// Compile-time check that every enum value has a registered module.
const _assertExhaustive: Record<ElementType, AnyElementModule> = REGISTRY;
void _assertExhaustive;

/**
 * Look up the module for a given element type. Throws if no module is
 * registered -- unreachable in practice (the registry is exhaustive per
 * the compile-time check) but throwing keeps caller code clean.
 *
 * `module` would be the natural local-variable name; Next's lint rule
 * `no-assign-module-variable` bans it to avoid clashing with the CommonJS
 * `module` global, so we use `found` instead.
 */
export function getElementModule(type: ElementType): AnyElementModule {
  const found = REGISTRY[type];
  if (!found) {
    throw new Error(`No ElementTypeModule registered for type "${type}".`);
  }
  return found;
}

/** All registered modules, ordered as the editor sidebar should display them. */
export function listElementModules(): AnyElementModule[] {
  return Object.values(REGISTRY);
}
