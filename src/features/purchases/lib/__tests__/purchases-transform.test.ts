import { describe, it, expect } from 'vitest';
import { transformPurchaseFormData } from '../purchases-transform';

describe('transformPurchaseFormData', () => {
  it('convierte strings numéricos en floats', () => {
    const out = transformPurchaseFormData({ taxableBaseTaxed: '200.00', vatAmountTaxed: '36' });
    expect(out.taxableBaseTaxed).toBe(200);
    expect(out.vatAmountTaxed).toBe(36);
  });

  it('strings vacíos en null', () => {
    const out = transformPurchaseFormData({ supplierName: '' });
    expect(out.supplierName).toBeNull();
  });

  it('rellena con null los campos SUNAT no provistos', () => {
    const out = transformPurchaseFormData({ ruc: '12345678901' });
    expect(out.totalAmount).toBeNull();
    expect(out.freeUseField1).toBeNull();
  });

  it('preserva strings de campos libres CLU', () => {
    const out = transformPurchaseFormData({ freeUseField1: 'CODIGO-X' });
    expect(out.freeUseField1).toBe('CODIGO-X');
  });
});
