import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

// Load `.env.local` (and friends) the same way Next.js does — drizzle-kit runs
// outside the Next runtime, so it doesn't pick `.env*` up on its own.
loadEnvConfig(process.cwd());

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * Drizzle Kit config.
 *
 * - `schema` points at the barrel under `db/schema/` -- adding a new table
 *   means dropping a file in `db/schema/` and re-exporting from `index.ts`.
 *   No config edit needed.
 * - `out` writes generated SQL into `supabase/migrations/` so the Supabase
 *   CLI is the single migration runner. Drizzle Kit's filenames
 *   (`0001_*.sql`) coexist with hand-written `NNNN_*.sql` files and Supabase
 *   applies them in alphabetical order.
 * - `schemaFilter: ['public']` skips Supabase-owned schemas (`auth`,
 *   `storage`, `realtime`, `supabase_*`) so `drizzle-kit pull` and
 *   `drizzle-kit generate` operate only on our own tables.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './supabase/migrations',
  schemaFilter: ['public'],
  strict: true,
  verbose: true,
  dbCredentials: {
    url: databaseUrl,
  },
});
