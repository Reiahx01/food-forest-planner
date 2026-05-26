/**
 * Drizzle schema barrel.
 *
 * Each domain table lives in its own file (`accounts.ts`, `properties.ts`,
 * `designs.ts`, etc.) and is re-exported here. Drizzle Kit reads from this
 * barrel via `drizzle.config.ts > schema`.
 *
 * This file is intentionally empty in #4 — the first real table
 * (`accounts`) lands in #5, properties in #10, and so on. Keeping the barrel
 * exists-but-empty means `drizzle-kit generate` runs successfully now and
 * later contributors can add a schema file without touching the config.
 */
export {};
