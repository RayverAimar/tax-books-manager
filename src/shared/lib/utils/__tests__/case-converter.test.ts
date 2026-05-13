import { describe, it, expect } from 'vitest';
import { camelToSnake, snakeToCamel, objectToSnakeCase, objectToCamelCase } from '../case-converter';

describe('camelToSnake', () => {
  it('passes through single-word strings', () => {
    expect(camelToSnake('ruc')).toBe('ruc');
  });

  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('businessName')).toBe('business_name');
    expect(camelToSnake('vatAmountTaxed')).toBe('vat_amount_taxed');
  });

  it('handles numbers attached to a word', () => {
    expect(camelToSnake('freeUseField1')).toBe('free_use_field1');
  });
});

describe('snakeToCamel', () => {
  it('passes through single-word strings', () => {
    expect(snakeToCamel('ruc')).toBe('ruc');
  });

  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('business_name')).toBe('businessName');
    expect(snakeToCamel('vat_amount_taxed')).toBe('vatAmountTaxed');
  });

  it('handles digits after underscore', () => {
    expect(snakeToCamel('free_use_field1')).toBe('freeUseField1');
  });
});

describe('objectToSnakeCase', () => {
  it('converts every key of a flat object', () => {
    const result = objectToSnakeCase({ ruc: '1', businessName: 'ACME', vatAmount: 18 });
    expect(result).toEqual({ ruc: '1', business_name: 'ACME', vat_amount: 18 });
  });

  it('preserves values verbatim', () => {
    const obj = { nestedObj: { foo: 'bar' }, anArray: [1, 2] };
    const out = objectToSnakeCase(obj);
    expect(out.nested_obj).toBe(obj.nestedObj);
    expect(out.an_array).toBe(obj.anArray);
  });
});

describe('objectToCamelCase', () => {
  it('inverts objectToSnakeCase for flat objects', () => {
    const camel = { businessName: 'ACME', vatAmount: 18 };
    const snake = objectToSnakeCase(camel);
    expect(objectToCamelCase(snake)).toEqual(camel);
  });
});
