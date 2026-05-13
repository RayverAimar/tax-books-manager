import { describe, it, expect } from 'vitest';
import {
  validateInteger,
  validateFloat,
  validateDate,
  validateString,
  validateByDataType,
  parseAndSanitizeValue
} from '../data-type.validators';

describe('validateInteger', () => {
  it('accepts whole numbers', () => {
    expect(validateInteger(5).isValid).toBe(true);
    expect(validateInteger('10').isValid).toBe(true);
    expect(validateInteger(0).isValid).toBe(true);
  });

  it('rejects decimals', () => {
    expect(validateInteger(1.5).isValid).toBe(false);
    expect(validateInteger('1.5').isValid).toBe(false);
    expect(validateInteger('1,5').isValid).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(validateInteger('abc').isValid).toBe(false);
  });

  it('allows null by default', () => {
    expect(validateInteger(null).isValid).toBe(true);
    expect(validateInteger(undefined).isValid).toBe(true);
    expect(validateInteger('').isValid).toBe(true);
  });

  it('rejects null when allowNull=false', () => {
    expect(validateInteger(null, { allowNull: false }).isValid).toBe(false);
  });

  it('enforces min and max', () => {
    expect(validateInteger(5, { min: 10 }).isValid).toBe(false);
    expect(validateInteger(15, { max: 10 }).isValid).toBe(false);
    expect(validateInteger(10, { min: 1, max: 10 }).isValid).toBe(true);
  });

  it('sanitizedValue is the parsed number', () => {
    expect(validateInteger('42').sanitizedValue).toBe(42);
  });
});

describe('validateFloat', () => {
  it('accepts decimals', () => {
    expect(validateFloat(1.5).isValid).toBe(true);
    expect(validateFloat('1.5').isValid).toBe(true);
  });

  it('accepts comma as decimal separator', () => {
    expect(validateFloat('1,5').isValid).toBe(true);
    expect(validateFloat('1,5').sanitizedValue).toBe(1.5);
  });

  it('rounds to specified decimals', () => {
    expect(validateFloat(1.2345, { decimals: 2 }).sanitizedValue).toBe(1.23);
    expect(validateFloat(1.235, { decimals: 2 }).sanitizedValue).toBeCloseTo(1.24, 2);
  });

  it('rejects NaN', () => {
    expect(validateFloat('abc').isValid).toBe(false);
  });

  it('enforces min/max', () => {
    expect(validateFloat(0, { min: 1 }).isValid).toBe(false);
    expect(validateFloat(100, { max: 50 }).isValid).toBe(false);
  });
});

describe('validateDate', () => {
  it('accepts DD/MM/YYYY', () => {
    const r = validateDate('15/03/2025');
    expect(r.isValid).toBe(true);
    expect(r.sanitizedValue).toBeInstanceOf(Date);
  });

  it('accepts D/M/YYYY', () => {
    expect(validateDate('1/3/2025').isValid).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validateDate('2025-01-15').isValid).toBe(false);
    expect(validateDate('15-03-2025').isValid).toBe(false);
    expect(validateDate('not a date').isValid).toBe(false);
  });

  it('rejects impossible dates', () => {
    expect(validateDate('30/02/2025').isValid).toBe(false);
    expect(validateDate('31/04/2025').isValid).toBe(false);
  });

  it('rejects out-of-range day or month', () => {
    expect(validateDate('32/01/2025').isValid).toBe(false);
    expect(validateDate('15/13/2025').isValid).toBe(false);
  });

  it('accepts Date objects', () => {
    expect(validateDate(new Date(2025, 0, 1)).isValid).toBe(true);
  });

  it('enforces date range', () => {
    const min = new Date(2025, 0, 1);
    const max = new Date(2025, 11, 31);
    expect(validateDate('01/01/2024', { minDate: min }).isValid).toBe(false);
    expect(validateDate('01/01/2026', { maxDate: max }).isValid).toBe(false);
    expect(validateDate('15/06/2025', { minDate: min, maxDate: max }).isValid).toBe(true);
  });
});

describe('validateString', () => {
  it('accepts within length bounds', () => {
    expect(validateString('hello', { minLength: 1, maxLength: 10 }).isValid).toBe(true);
  });

  it('rejects too short / too long', () => {
    expect(validateString('hi', { minLength: 5 }).isValid).toBe(false);
    expect(validateString('hello world', { maxLength: 5 }).isValid).toBe(false);
  });

  it('checks regex pattern', () => {
    expect(validateString('12345678901', { pattern: /^\d{11}$/ }).isValid).toBe(true);
    expect(validateString('abc', { pattern: /^\d+$/, patternDescription: 'Solo dígitos' }).errorMessage).toBe(
      'Solo dígitos'
    );
  });

  it('trims input', () => {
    expect(validateString('  hi  ').sanitizedValue).toBe('hi');
  });
});

describe('validateByDataType', () => {
  it('routes to the correct validator', () => {
    expect(validateByDataType('5', 'integer').isValid).toBe(true);
    expect(validateByDataType('5.5', 'float').isValid).toBe(true);
    expect(validateByDataType('15/03/2025', 'date').isValid).toBe(true);
    expect(validateByDataType('hello', 'string').isValid).toBe(true);
  });

  it('returns error for unknown type', () => {
    // @ts-expect-error testing fallback
    expect(validateByDataType('x', 'unknown').isValid).toBe(false);
  });
});

describe('parseAndSanitizeValue', () => {
  it('returns sanitized value on success', () => {
    expect(parseAndSanitizeValue('42', 'integer')).toBe(42);
  });

  it('throws on validation failure', () => {
    expect(() => parseAndSanitizeValue('not a number', 'integer')).toThrow();
  });
});
