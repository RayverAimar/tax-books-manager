import { describe, it, expect } from 'vitest';
import { isValidRUC, isValidDNI, truncateToLength, sanitizeString } from '../validation.constants';

describe('isValidRUC', () => {
  it('accepts 11-digit RUC', () => {
    expect(isValidRUC('12345678901')).toBe(true);
    expect(isValidRUC('20123456789')).toBe(true);
  });

  it('rejects invalid RUCs', () => {
    expect(isValidRUC('123')).toBe(false);
    expect(isValidRUC('1234567890A')).toBe(false);
    expect(isValidRUC('')).toBe(false);
    expect(isValidRUC(null)).toBe(false);
    expect(isValidRUC(undefined)).toBe(false);
  });
});

describe('isValidDNI', () => {
  it('accepts 8-digit DNI', () => {
    expect(isValidDNI('12345678')).toBe(true);
  });

  it('rejects invalid DNIs', () => {
    expect(isValidDNI('1234567')).toBe(false);
    expect(isValidDNI('123456789')).toBe(false);
    expect(isValidDNI('1234567A')).toBe(false);
    expect(isValidDNI(null)).toBe(false);
  });
});

describe('truncateToLength', () => {
  it('truncates strings exceeding max length', () => {
    expect(truncateToLength('hello world', 5)).toBe('hello');
  });

  it('preserves strings within limit', () => {
    expect(truncateToLength('hi', 10)).toBe('hi');
  });

  it('returns null for empty values', () => {
    expect(truncateToLength('', 10)).toBe(null);
    expect(truncateToLength(null, 10)).toBe(null);
    expect(truncateToLength(undefined, 10)).toBe(null);
  });
});

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns null when result is empty', () => {
    expect(sanitizeString('   ')).toBe(null);
    expect(sanitizeString('')).toBe(null);
    expect(sanitizeString(null)).toBe(null);
  });
});
