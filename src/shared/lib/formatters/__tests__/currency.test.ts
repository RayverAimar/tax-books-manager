import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats positive amount in PEN', () => {
    expect(formatCurrency(1234.56)).toMatch(/1[,.]234[,.]56/);
    expect(formatCurrency(1234.56)).toMatch(/S\/|PEN/);
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/0[,.]00/);
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50.25)).toMatch(/50[,.]25/);
  });

  it('formats fractional cents with rounding', () => {
    expect(formatCurrency(0.1 + 0.2)).toMatch(/0[,.]30/);
  });
});
