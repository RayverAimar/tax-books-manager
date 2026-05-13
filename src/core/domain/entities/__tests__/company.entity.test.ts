import { describe, it, expect } from 'vitest';
import { CompanyValidation } from '../company.entity';

describe('CompanyValidation.isValidRuc', () => {
  it('rejects non-11-digit strings', () => {
    expect(CompanyValidation.isValidRuc('123')).toBe(false);
    expect(CompanyValidation.isValidRuc('1234567890A')).toBe(false);
    expect(CompanyValidation.isValidRuc('123456789012')).toBe(false);
  });

  it('validates check digit (Peruvian algorithm)', () => {
    // Compute a valid RUC for "1234567890X"
    const base = '1234567890';
    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(base[i]) * factors[i];
    const r = sum % 11;
    const cd = r === 0 ? 0 : 11 - r;
    expect(CompanyValidation.isValidRuc(`${base}${cd}`)).toBe(true);
  });

  it('rejects RUC with wrong check digit', () => {
    const base = '1234567890';
    expect(CompanyValidation.isValidRuc(`${base}9`)).toBe(false);
  });
});

describe('CompanyValidation.isValidBusinessName', () => {
  it('accepts names between 3 and 200 chars', () => {
    expect(CompanyValidation.isValidBusinessName('ACME')).toBe(true);
    expect(CompanyValidation.isValidBusinessName('A'.repeat(200))).toBe(true);
  });

  it('rejects too short or too long', () => {
    expect(CompanyValidation.isValidBusinessName('AB')).toBe(false);
    expect(CompanyValidation.isValidBusinessName('A'.repeat(201))).toBe(false);
  });

  it('trims before length check', () => {
    expect(CompanyValidation.isValidBusinessName('   AB   ')).toBe(false);
    expect(CompanyValidation.isValidBusinessName('  ACME  ')).toBe(true);
  });
});
