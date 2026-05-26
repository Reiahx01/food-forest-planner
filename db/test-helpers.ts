import 'server-only';

import { randomBytes } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

import { serverEnv } from '@/lib/env';


/**
 * Returns a unique schema name like `test_ab12cd34`. Used by integration tests
 * to spin up an ephemeral schema, run inside it, and tear it down — so two
 * tests running in parallel never see each other's rows.
 */
export function ephemeralSchemaName(): string {
  return `test_${randomBytes(4).toString('hex')}`;
}

/**
 * True only when integration tests have explicitly opted in to running against
 * a live Postgres. The CI workflow sets `IS_INTEGRATION=1` after
 * `npx supabase start` has booted the local stack.
 *
 * Defaulting to false means unit tests cannot accidentally hit a real DB and
 * developers can run `npm test` without Docker running.
 */
export function isIntegrationDbAvailable(): boolean {
  return process.env.IS_INTEGRATION === '1';
}

interface EphemeralSchemaContext {
  db: PostgresJsDatabase<typeof schema>;
  schemaName: string;
}

/**
 * Run `fn` inside a fresh Postgres schema. The schema is dropped (with
 * `CASCADE`) when `fn` resolves or throws.
 *
 * Refuses to run when `IS_INTEGRATION` is unset — see ADR-0003's
 * "fails loud, not silent" mock-mode discipline applied to integration setup.
 */
export async function withEphemeralSchema(
  fn: (ctx: EphemeralSchemaContext) => Promise<void>,
): Promise<void> {
  if (!isIntegrationDbAvailable()) {
    throw new Error(
      'withEphemeralSchema() refuses to run because IS_INTEGRATION is not set. ' +
        'Integration tests require a real local Supabase instance: run `npx supabase start`, then `IS_INTEGRATION=1 npm test`.',
    );
  }

  const schemaName = ephemeralSchemaName();
  const client = postgres(serverEnv().databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  try {
    await db.execute(sql.raw(`create schema if not exists "${schemaName}"`));
    await db.execute(sql.raw(`set search_path to "${schemaName}", public`));
    await fn({ db, schemaName });
  } finally {
    try {
      await db.execute(sql.raw(`drop schema if exists "${schemaName}" cascade`));
    } finally {
      await client.end({ timeout: 5 });
    }
  }
}
