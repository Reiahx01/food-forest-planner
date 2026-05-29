/**
 * lib/elements barrel -- the single import surface for everything element
 * related. Consumers import the registry + types from here; the per-type
 * modules stay internal to this directory.
 */
export * from './types';
export * from './registry';
export type { GuildAttributes } from './guild';
export { guildAttributesSchema } from './guild';
