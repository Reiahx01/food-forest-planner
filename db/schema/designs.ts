import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { properties } from './properties';

/**
 * A Design is a named plan overlaid on a Property. One Property carries
 * many Designs; the elements that live on a Design (Guild, Pond, Swale,
 * Path, Bed, Building) land in #14.
 *
 * RLS is enforced through the parent Property (`0004_designs.sql`).
 * Drizzle is the typed shape only.
 */
export const designs = pgTable(
  'designs',
  {
    id: uuid('id').primaryKey().default(sql`extensions.uuid_generate_v4()`),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    propertyIdx: index('designs_property_idx').on(table.propertyId),
  }),
);

export type Design = typeof designs.$inferSelect;
export type NewDesign = typeof designs.$inferInsert;
