import { describe, it, expect } from 'vitest';
import { PeriodUtils } from '../period.entity';

describe('PeriodUtils', () => {
  describe('isValidPeriodCode', () => {
    it('accepts 6-digit YYYYMM from valid year range', () => {
      expect(PeriodUtils.isValidPeriodCode('202501')).toBe(true);
      expect(PeriodUtils.isValidPeriodCode('202412')).toBe(true);
    });

    it('rejects malformed strings', () => {
      expect(PeriodUtils.isValidPeriodCode('20251')).toBe(false);
      expect(PeriodUtils.isValidPeriodCode('2025-01')).toBe(false);
      expect(PeriodUtils.isValidPeriodCode('abcdef')).toBe(false);
    });

    it('rejects out-of-range months and years', () => {
      expect(PeriodUtils.isValidPeriodCode('202500')).toBe(false);
      expect(PeriodUtils.isValidPeriodCode('202513')).toBe(false);
      expect(PeriodUtils.isValidPeriodCode('202001')).toBe(false);
      expect(PeriodUtils.isValidPeriodCode('210101')).toBe(false);
    });
  });

  describe('formatPeriodLabel', () => {
    it('formats valid codes as Spanish month + year', () => {
      expect(PeriodUtils.formatPeriodLabel('202501')).toBe('Enero 2025');
      expect(PeriodUtils.formatPeriodLabel('202412')).toBe('Diciembre 2024');
    });

    it('returns code as-is for malformed input', () => {
      expect(PeriodUtils.formatPeriodLabel('bad')).toBe('bad');
      expect(PeriodUtils.formatPeriodLabel('202513')).toBe('202513');
    });
  });

  describe('getCurrentPeriodCode', () => {
    it('returns YYYYMM', () => {
      expect(PeriodUtils.getCurrentPeriodCode()).toMatch(/^\d{6}$/);
    });
  });

  describe('getCurrentPeriod', () => {
    it('matches getCurrentPeriodCode', () => {
      expect(PeriodUtils.getCurrentPeriod()).toBe(PeriodUtils.getCurrentPeriodCode());
    });
  });

  describe('getLastValidPeriod', () => {
    it('returns YYYYMM', () => {
      expect(PeriodUtils.getLastValidPeriod()).toMatch(/^\d{6}$/);
    });

    it('is at most one month behind current period (calendar-wise)', () => {
      const current = PeriodUtils.getCurrentPeriodCode();
      const last = PeriodUtils.getLastValidPeriod();
      expect(last).not.toBe(current);
    });
  });

  describe('getAvailablePeriods', () => {
    it('returns at least one period in most-recent-first order', () => {
      const periods = PeriodUtils.getAvailablePeriods();
      expect(periods.length).toBeGreaterThan(0);
      // Sorted desc by code
      for (let i = 1; i < periods.length; i++) {
        expect(Number(periods[i - 1].code)).toBeGreaterThan(Number(periods[i].code));
      }
    });

    it('all codes are valid YYYYMM', () => {
      const periods = PeriodUtils.getAvailablePeriods();
      for (const p of periods) {
        expect(p.code).toMatch(/^\d{6}$/);
        expect(p.month).toBeGreaterThanOrEqual(1);
        expect(p.month).toBeLessThanOrEqual(12);
        expect(p.label).toMatch(/\d{4}/);
      }
    });
  });
});
