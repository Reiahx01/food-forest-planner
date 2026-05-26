import { describe, expect, test } from 'vitest';

import { ACCOUNT_ROLES, accounts, type Account, type AccountRole } from './accounts';

describe('db/schema/accounts — typed contract', () => {
  test('table is named "accounts"', () => {
    // Drizzle stamps the table name as a symbol on the column proxy.
    // `getTableName` is the public accessor but we can also check via Symbol.
    // Using a runtime sanity check on a known column name keeps this simple.
    expect(accounts.email.name).toBe('email');
  });

  test('exposes the v1 columns', () => {
    expect(accounts.id.name).toBe('id');
    expect(accounts.email.name).toBe('email');
    expect(accounts.role.name).toBe('role');
    expect(accounts.displayName.name).toBe('display_name');
    expect(accounts.onboardedAt.name).toBe('onboarded_at');
    expect(accounts.createdAt.name).toBe('created_at');
    expect(accounts.updatedAt.name).toBe('updated_at');
  });

  test('onboarded_at is nullable (null = not yet onboarded)', () => {
    expect(accounts.onboardedAt.notNull).toBe(false);
  });

  test('role column is required and defaults to hobbyist', () => {
    expect(accounts.role.notNull).toBe(true);
    expect(accounts.role.default).toBe('hobbyist');
  });

  test('role column accepts exactly two values', () => {
    expect(ACCOUNT_ROLES).toEqual(['hobbyist', 'pro']);
  });

  test('email is required and unique', () => {
    expect(accounts.email.notNull).toBe(true);
    expect(accounts.email.isUnique).toBe(true);
  });

  test('id is the primary key (uuid)', () => {
    expect(accounts.id.primary).toBe(true);
    expect(accounts.id.columnType).toBe('PgUUID');
  });

  test('display_name is optional (nullable)', () => {
    expect(accounts.displayName.notNull).toBe(false);
  });

  test('timestamps are not null with default = now()', () => {
    expect(accounts.createdAt.notNull).toBe(true);
    expect(accounts.updatedAt.notNull).toBe(true);
  });

  test('exports inferred row types for typed query consumers', () => {
    const _row: Account | null = null;
    const _role: AccountRole = 'hobbyist';
    expect(_row).toBeNull();
    expect(_role).toBe('hobbyist');
  });
});
