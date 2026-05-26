import { sql } from 'drizzle-orm';
import { customType, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts';

/**
 * PostGIS geometry types don't have a first-class Drizzle helper, so we
 * declare them via `customType` with the right SQL fragment. Drizzle
 * forwards reads as opaque strings (the WKB hex or GeoJSON depending on
 * connection settings); we don't parse them here -- consumers either
 * project to GeoJSON in the query (`st_asgeojson(...)`) or use the
 * supabase-js representation which returns GeoJSON by default.
 */
const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

const geometryPolygon = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Polygon, 4326)';
  },
});

/**
 * A Property is a plot of land the user designs for. Owners are gated by
 * the four RLS policies in `0003_properties.sql`; Drizzle is the typed
 * shape only -- it does not re-enforce RLS at query time.
 */
export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().default(sql`extensions.uuid_generate_v4()`),
    ownerAccountId: uuid('owner_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id'),
    name: text('name').notNull(),
    address: text('address'),
    center: geometryPoint('center'),
    parcelOutline: geometryPolygon('parcel_outline'),
    usdaZone: text('usda_zone'),
    climateFacts: jsonb('climate_facts').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('properties_owner_idx').on(table.ownerAccountId),
  }),
);

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
