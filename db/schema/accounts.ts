import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Closed enum of account roles. `hobbyist` is the default tier (free, one
 * Property, design own land). `pro` is the paid tier (multiple Clients, design
 * for clients). The migration enforces this via a CHECK constraint rather than
 * a Postgres ENUM so that adding a future role (`'admin'`?) is a one-line
 * migration rather than a multi-step ENUM rebuild.
 */
export const ACCOUNT_ROLES = ['hobbyist', 'pro'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/**
 * `accounts` mirrors `auth.users` 1:1. The id is the same UUID, so any query
 * with `auth.uid()` can join `public.accounts` directly without a lookup.
 *
 * The mirror is maintained by a Postgres trigger (`handle_new_user`) in the
 * migration -- ADR-0003's "RLS is the security boundary" applied to creation:
 * if the trigger fails, the auth.users insert rolls back, so there's no
 * orphan-account class of bug.
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ACCOUNT_ROLES }).notNull().default('hobbyist'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
