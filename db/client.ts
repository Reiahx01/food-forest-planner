import 'server-only';

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

import { serverEnv } from '@/lib/env';


interface CreateClientOptions {
  /** Override the connection string. Default: `DATABASE_URL`. */
  connectionString?: string;
  /** Override the max pool size. Default: 1 (one process per route handler). */
  max?: number;
}

export interface DrizzleClient {
  db: PostgresJsDatabase<typeof schema>;
  close: () => Promise<void>;
}

/**
 * Build a Drizzle client backed by a `postgres-js` connection. Use **once per
 * request** in server actions / route handlers and call `.close()` before
 * returning. The driver itself pools at the process level when reused, but in
 * Next.js server actions a per-call client is simpler to reason about.
 *
 * Browser code MUST NOT import this module — `server-only` enforces that.
 */
export function createDrizzleClient(options: CreateClientOptions = {}): DrizzleClient {
  const connectionString = options.connectionString ?? serverEnv().databaseUrl;

  const client = postgres(connectionString, {
    max: options.max ?? 1,
    prepare: false,
  });

  return {
    db: drizzle(client, { schema }),
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}
