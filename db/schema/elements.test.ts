import { describe, expect, test } from 'vitest';

import { ELEMENT_TYPES, elements, type Element, type ElementType, type NewElement } from './elements';

describe('db/schema/elements — typed contract', () => {
  test('exposes the v1 columns', () => {
    expect(elements.id.name).toBe('id');
    expect(elements.designId.name).toBe('design_id');
    expect(elements.type.name).toBe('type');
    expect(elements.geometry.name).toBe('geometry');
    expect(elements.attributes.name).toBe('attributes');
    expect(elements.label.name).toBe('label');
    expect(elements.createdAt.name).toBe('created_at');
    expect(elements.updatedAt.name).toBe('updated_at');
  });

  test('design_id and type and geometry are required', () => {
    expect(elements.designId.notNull).toBe(true);
    expect(elements.type.notNull).toBe(true);
    expect(elements.geometry.notNull).toBe(true);
  });

  test('label is optional (used as a human-friendly identifier in the editor)', () => {
    expect(elements.label.notNull).toBe(false);
  });

  test('id is a uuid primary key', () => {
    expect(elements.id.primary).toBe(true);
    expect(elements.id.columnType).toBe('PgUUID');
  });

  test('ELEMENT_TYPES starts with just guild (others land in #16-#20)', () => {
    expect(ELEMENT_TYPES).toEqual(['guild']);
  });

  test('exports inferred row types', () => {
    const _row: Element | null = null;
    const _new: NewElement | null = null;
    const _type: ElementType = 'guild';
    expect(_row).toBeNull();
    expect(_new).toBeNull();
    expect(_type).toBe('guild');
  });
});
