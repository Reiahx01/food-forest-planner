import { describe, expect, test } from 'vitest';

import { designs, type Design, type NewDesign } from './designs';

describe('db/schema/designs — typed contract', () => {
  test('exposes the v1 columns', () => {
    expect(designs.id.name).toBe('id');
    expect(designs.propertyId.name).toBe('property_id');
    expect(designs.name.name).toBe('name');
    expect(designs.description.name).toBe('description');
    expect(designs.createdAt.name).toBe('created_at');
    expect(designs.updatedAt.name).toBe('updated_at');
  });

  test('property_id and name are required', () => {
    expect(designs.propertyId.notNull).toBe(true);
    expect(designs.name.notNull).toBe(true);
  });

  test('description is optional', () => {
    expect(designs.description.notNull).toBe(false);
  });

  test('id is a uuid primary key', () => {
    expect(designs.id.primary).toBe(true);
    expect(designs.id.columnType).toBe('PgUUID');
  });

  test('exports inferred row types', () => {
    const _row: Design | null = null;
    const _new: NewDesign | null = null;
    expect(_row).toBeNull();
    expect(_new).toBeNull();
  });
});
