import { sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { designs } from './designs';

/**
 * Per-design Element: polymorphic via `type` + `attributes` jsonb. v1 ships
 * with just `'guild'` in the enum; #16-#20 each add one more value via a
 * subsequent enum-extend migration. The shape inside `attributes` is owned
 * by the matching ElementTypeModule's Zod schema (see lib/elements/types.ts).
 *
 * RLS gates access through Design -> Property -> owner (see
 * 0005_elements.sql). Drizzle is the typed shape only.
 */
export const elementTypeEnum = pgEnum('element_type', ['guild']);

export const ELEMENT_TYPES = ['guild'] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

export const elements = pgTable(
  'elements',
  {
    id: uuid('id').primaryKey().default(sql`extensions.uuid_generate_v4()`),
    designId: uuid('design_id')
      .notNull()
      .references(() => designs.id, { onDelete: 'cascade' }),
    type: elementTypeEnum('type').notNull(),
    geometry: jsonb('geometry').notNull(),
    attributes: jsonb('attributes').notNull().default(sql`'{}'::jsonb`),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    designIdx: index('elements_design_idx').on(table.designId),
    typeIdx: index('elements_type_idx').on(table.type),
  }),
);

export type Element = typeof elements.$inferSelect;
export type NewElement = typeof elements.$inferInsert;
