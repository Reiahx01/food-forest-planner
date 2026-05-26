import { describe, expect, test } from 'vitest';

import { properties, type NewProperty, type Property } from './properties';

describe('db/schema/properties — typed contract', () => {
  test('exposes the v1 columns', () => {
    expect(properties.id.name).toBe('id');
    expect(properties.ownerAccountId.name).toBe('owner_account_id');
    expect(properties.clientId.name).toBe('client_id');
    expect(properties.name.name).toBe('name');
    expect(properties.address.name).toBe('address');
    expect(properties.center.name).toBe('center');
    expect(properties.parcelOutline.name).toBe('parcel_outline');
    expect(properties.usdaZone.name).toBe('usda_zone');
    expect(properties.climateFacts.name).toBe('climate_facts');
    expect(properties.createdAt.name).toBe('created_at');
    expect(properties.updatedAt.name).toBe('updated_at');
  });

  test('owner_account_id is required (not null)', () => {
    expect(properties.ownerAccountId.notNull).toBe(true);
  });

  test('name is required, address is optional', () => {
    expect(properties.name.notNull).toBe(true);
    expect(properties.address.notNull).toBe(false);
  });

  test('parcel_outline is optional (gets drawn in #10 part 2)', () => {
    expect(properties.parcelOutline.notNull).toBe(false);
  });

  test('id is a uuid primary key', () => {
    expect(properties.id.primary).toBe(true);
    expect(properties.id.columnType).toBe('PgUUID');
  });

  test('exports inferred row types', () => {
    const _row: Property | null = null;
    const _new: NewProperty | null = null;
    expect(_row).toBeNull();
    expect(_new).toBeNull();
  });
});
