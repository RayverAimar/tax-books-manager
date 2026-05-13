import { describe, it, expect } from 'vitest';
import { generateInvoiceId } from '../invoice';

describe('generateInvoiceId', () => {
  it('returns a negative number', () => {
    expect(generateInvoiceId()).toBeLessThan(0);
  });

  it('returns strictly decreasing values', () => {
    const a = generateInvoiceId();
    const b = generateInvoiceId();
    const c = generateInvoiceId();
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
  });

  it('never returns zero', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInvoiceId()).not.toBe(0);
    }
  });
});
