import { z } from 'zod';

import type { DomainRuleResult, ElementMapRender, ElementRenderInput, ElementTypeModule } from './types';

/**
 * Guild element module -- the first module to land. A Guild is a center
 * fruit/nut tree plus optional companion species, planted together as a
 * single guild unit. Visually it's a polygon drawn around the
 * canopy/footprint.
 *
 * #14 part 1 (this file): data half -- schema, defaults, domain rule.
 * #14 part 2: panel component + map-render factory + editor wiring.
 * #15 swaps the placeholder species-id text inputs for a SpeciesPicker.
 */

const uuid = z.string().uuid();

export const guildAttributesSchema = z.object({
  /** Species id (from the species library, #15) of the central tree. Required. */
  centerTreeSpeciesId: uuid,
  /** Optional companion species planted with / around the center tree. */
  companionSpeciesIds: z.array(uuid).default([]),
  /** Optional spacing-between-trees hint in metres. */
  spacingMeters: z.number().positive().optional(),
  /** Free-text notes the user attaches to this guild. */
  notes: z.string().max(2000).optional(),
});

export type GuildAttributes = z.infer<typeof guildAttributesSchema>;

/**
 * Domain rule (#14 spec):
 *   "Guild cannot save without a center tree species. UI surfaces the error."
 *
 * The Zod schema already requires `centerTreeSpeciesId`; this hook would
 * surface other Guild-specific cross-field invariants if/when they exist
 * (e.g. center tree USDA-zone overlap with the Property -- but that needs
 * Property context the #14 ElementDomainContext doesn't carry yet; #15
 * extends it). For now this returns [] -- the schema is the gate.
 */
export function validateGuildDomainRules(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _attrs: GuildAttributes,
): DomainRuleResult {
  return [];
}

/**
 * Map render for a Guild: the drawn polygon as a translucent gold fill with a
 * gold outline — the same brand `accent.gold` PropertyMap paints the parcel
 * with. Source + layer ids are namespaced by element id so many guilds coexist
 * on one Design without colliding.
 */
const GUILD_GOLD = 'oklch(72% 0.13 80)';

export function buildGuildMapLayers({ id, geometry }: ElementRenderInput): ElementMapRender {
  const sourceId = `element-${id}`;
  return {
    source: {
      id: sourceId,
      data: { type: 'Feature', properties: { elementId: id, type: 'guild' }, geometry },
    },
    layers: [
      {
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': GUILD_GOLD, 'fill-opacity': 0.25 },
      },
      {
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': GUILD_GOLD, 'line-width': 2 },
      },
    ],
  };
}

export const guildModule: ElementTypeModule<GuildAttributes> = {
  type: 'guild',
  label: 'Guild',
  summary: 'Center tree + companions',
  geometry: 'polygon',
  attributesSchema: guildAttributesSchema,
  defaultAttributes: () => ({
    // The user MUST pick a center tree before the form can save; leaving
    // this empty surfaces the Zod required-string error and the panel
    // (part 2) keeps the save button disabled until it's set.
    centerTreeSpeciesId: '',
    companionSpeciesIds: [],
  }),
  buildMapLayers: buildGuildMapLayers,
  validateDomainRules: validateGuildDomainRules,
};
