import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getCurrentDate, getCurrentTimestamp, SYSTEM_TIMEZONE } from '../date';

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('formats YYYY-MM-DD string', () => {
    const result = formatDate('2025-01-15');
    expect(result).toMatch(/15\/01\/2025/);
  });

  it('formats Date object', () => {
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).toMatch(/15\/01\/2025/);
  });

  it('formats ISO datetime string', () => {
    const result = formatDate('2025-01-15T10:30:00.000Z');
    expect(result).toMatch(/15\/01\/2025/);
  });
});

describe('formatDateTime', () => {
  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('includes time portion', () => {
    const result = formatDateTime('2025-01-15T10:30:45.000Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('getCurrentDate', () => {
  it('returns a Date object', () => {
    expect(getCurrentDate()).toBeInstanceOf(Date);
  });
});

describe('getCurrentTimestamp', () => {
  it('returns ISO 8601 string', () => {
    const ts = getCurrentTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('SYSTEM_TIMEZONE', () => {
  it('is a non-empty string', () => {
    expect(typeof SYSTEM_TIMEZONE).toBe('string');
    expect(SYSTEM_TIMEZONE.length).toBeGreaterThan(0);
  });
});
