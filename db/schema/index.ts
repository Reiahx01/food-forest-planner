/**
 * Drizzle schema barrel. Each domain table lives in its own file and is
 * re-exported here; Drizzle Kit and the runtime client both consume this
 * barrel via `drizzle.config.ts > schema` and `db/client.ts > * as schema`.
 *
 * Adding a new table = drop in `db/schema/<name>.ts` + add the re-export.
 */
export * from './accounts';
export * from './properties';
export * from './designs';
