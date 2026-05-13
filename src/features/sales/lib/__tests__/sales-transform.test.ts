import { describe, it, expect } from 'vitest';
import { transformSalesFormData } from '../sales-transform';

describe('transformSalesFormData', () => {
  it('convierte strings numéricos en floats', () => {
    const out = transformSalesFormData({ taxableBase: '100.50', vatAmount: '18.09' });
    expect(out.taxableBase).toBe(100.5);
    expect(out.vatAmount).toBe(18.09);
  });

  it('trata strings vacíos como null', () => {
    const out = transformSalesFormData({ businessName: '', taxableBase: '' });
    expect(out.businessName).toBeNull();
    expect(out.taxableBase).toBeNull();
  });

  it('campos numéricos no parseables se convierten a null', () => {
    const out = transformSalesFormData({ taxableBase: 'abc' });
    expect(out.taxableBase).toBeNull();
  });

  it('rellena con null campos SUNAT no provistos', () => {
    const out = transformSalesFormData({ ruc: '12345678901' });
    expect(out.ruc).toBe('12345678901');
    expect(out.businessName).toBeNull();
    expect(out.totalAmount).toBeNull();
  });

  it('preserva strings no numéricos sin transformar', () => {
    const out = transformSalesFormData({ voucherSeries: 'F001' });
    expect(out.voucherSeries).toBe('F001');
  });
});
