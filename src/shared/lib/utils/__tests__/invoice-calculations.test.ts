import { describe, it, expect } from 'vitest';
import {
  roundWithEpsilon,
  calculateSalesRelatedFields,
  calculatePurchaseRelatedFields,
  calculateSalesVatBreakdown,
  calculatePurchasesVatBreakdown
} from '../invoice-calculations';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

describe('roundWithEpsilon', () => {
  it('redondea al entero más cercano dentro del epsilon', () => {
    expect(roundWithEpsilon(17.98)).toBe(18);
    expect(roundWithEpsilon(18.05)).toBe(18);
    expect(roundWithEpsilon(11.92)).toBe(12);
  });

  it('preserva 2 decimales fuera del epsilon', () => {
    expect(roundWithEpsilon(18.5)).toBe(18.5);
    expect(roundWithEpsilon(10.75)).toBe(10.75);
  });

  it('respeta epsilon personalizado', () => {
    expect(roundWithEpsilon(18.3, 0.5)).toBe(18);
    expect(roundWithEpsilon(18.3, 0.1)).toBe(18.3);
  });

  it('valores enteros se devuelven sin cambio', () => {
    expect(roundWithEpsilon(0)).toBe(0);
    expect(roundWithEpsilon(18)).toBe(18);
  });
});

describe('calculateSalesRelatedFields', () => {
  it('recalcula taxableBase y vatAmount al cambiar vatPercentage', () => {
    const inv = aSalesInvoice({ totalAmount: 118 });
    const result = calculateSalesRelatedFields(inv, 'vatPercentage', 10);
    expect(result.vatPercentage).toBe(10);
    expect(result.taxableBase).toBeCloseTo(107.27, 2);
    expect(result.vatAmount).toBeCloseTo(10.73, 2);
  });

  it('recalcula al cambiar totalAmount con vatPercentage > 0', () => {
    const inv = aSalesInvoice({ vatPercentage: 18 });
    const result = calculateSalesRelatedFields(inv, 'totalAmount', 236);
    expect(result.totalAmount).toBe(236);
    expect(result.taxableBase).toBeCloseTo(200, 1);
    expect(result.vatAmount).toBeCloseTo(36, 1);
  });

  it('ignora vatPercentage fuera de rango', () => {
    const inv = aSalesInvoice();
    expect(calculateSalesRelatedFields(inv, 'vatPercentage', -1).taxableBase).toBeUndefined();
    expect(calculateSalesRelatedFields(inv, 'vatPercentage', 101).taxableBase).toBeUndefined();
  });

  it('no recalcula si totalAmount es 0', () => {
    const inv = aSalesInvoice({ totalAmount: 0 });
    const result = calculateSalesRelatedFields(inv, 'vatPercentage', 18);
    expect(result.taxableBase).toBeUndefined();
  });

  it('acepta valor numérico como string', () => {
    const inv = aSalesInvoice({ vatPercentage: 18 });
    const result = calculateSalesRelatedFields(inv, 'totalAmount', '118');
    expect(result.totalAmount).toBe(118);
  });

  it('totalAmount NaN se ignora', () => {
    const inv = aSalesInvoice({ vatPercentage: 18 });
    const result = calculateSalesRelatedFields(inv, 'totalAmount', 'abc');
    expect(result.taxableBase).toBeUndefined();
  });

  it('cambio en columna no especial sólo actualiza esa columna', () => {
    const inv = aSalesInvoice();
    const result = calculateSalesRelatedFields(inv, 'ruc', 'XX');
    expect(result.ruc).toBe('XX');
    expect(result.taxableBase).toBeUndefined();
  });
});

describe('calculatePurchaseRelatedFields', () => {
  it('redistribuye BI proporcionalmente al cambiar vatPercentage', () => {
    const inv = aPurchaseInvoice({
      totalAmount: 236,
      taxableBaseTaxed: 100,
      taxableBaseMixed: 50,
      taxableBaseUntaxed: 50
    });
    const result = calculatePurchaseRelatedFields(inv, 'vatPercentage', 18);
    expect(result.vatPercentage).toBe(18);
    // Ratios should be preserved
    expect(result.taxableBaseTaxed).toBeGreaterThan(0);
    expect(result.taxableBaseMixed).toBeGreaterThan(0);
    expect(result.taxableBaseUntaxed).toBeGreaterThan(0);
  });

  it('ignora vatPercentage fuera de rango', () => {
    const inv = aPurchaseInvoice();
    expect(calculatePurchaseRelatedFields(inv, 'vatPercentage', -5).taxableBaseTaxed).toBeUndefined();
  });

  it('recalcula al cambiar totalAmount restando nonTaxableValue', () => {
    const inv = aPurchaseInvoice({ vatPercentage: 18, nonTaxableValue: 18 });
    const result = calculatePurchaseRelatedFields(inv, 'totalAmount', 136);
    expect(result.totalAmount).toBe(136);
    // gravable = 136 - 18 = 118, base = 100, vat = 18
    expect(result.taxableBaseTaxed).toBeCloseTo(100, 1);
    expect(result.vatAmountTaxed).toBeCloseTo(18, 1);
  });

  it('totalAmount = nonTaxableValue no recalcula DG', () => {
    const inv = aPurchaseInvoice({ vatPercentage: 18, nonTaxableValue: 100 });
    const result = calculatePurchaseRelatedFields(inv, 'totalAmount', 100);
    expect(result.taxableBaseTaxed).toBeUndefined();
  });

  it('cambio en columna no especial sólo actualiza esa columna', () => {
    const inv = aPurchaseInvoice();
    const result = calculatePurchaseRelatedFields(inv, 'ruc', 'YY');
    expect(result.ruc).toBe('YY');
    expect(result.taxableBaseTaxed).toBeUndefined();
  });
});

describe('calculateSalesVatBreakdown', () => {
  it('agrupa montos de IGV por tasa', () => {
    const invoices = [
      aSalesInvoice({ taxableBase: 100, vatAmount: 18 }),
      aSalesInvoice({ taxableBase: 200, vatAmount: 36 }),
      aSalesInvoice({ taxableBase: 500, vatAmount: 50 }) // 10%
    ];
    const out = calculateSalesVatBreakdown(invoices);
    expect(out).toContainEqual({ rate: 18, amount: 54 });
    expect(out).toContainEqual({ rate: 10, amount: 50 });
  });

  it('omite facturas sin IGV', () => {
    const invoices = [aSalesInvoice({ taxableBase: 100, vatAmount: 0 })];
    expect(calculateSalesVatBreakdown(invoices)).toEqual([]);
  });

  it('usa vatPercentage cuando taxableBase es 0', () => {
    const invoices = [aSalesInvoice({ taxableBase: 0, vatAmount: 18, vatPercentage: 18 })];
    expect(calculateSalesVatBreakdown(invoices)[0].rate).toBe(18);
  });

  it('ordena por tasa descendente', () => {
    const invoices = [
      aSalesInvoice({ taxableBase: 100, vatAmount: 10 }),
      aSalesInvoice({ taxableBase: 100, vatAmount: 18 })
    ];
    const out = calculateSalesVatBreakdown(invoices);
    expect(out[0].rate).toBeGreaterThan(out[1].rate);
  });
});

describe('calculatePurchasesVatBreakdown', () => {
  it('agrupa por tasa considerando DG+DGNG+DNG', () => {
    const invoices = [
      aPurchaseInvoice({ taxableBaseTaxed: 100, vatAmountTaxed: 18, taxableBaseMixed: null, vatAmountMixed: null }),
      aPurchaseInvoice({
        taxableBaseTaxed: null,
        vatAmountTaxed: null,
        taxableBaseMixed: 50,
        vatAmountMixed: 9
      })
    ];
    const out = calculatePurchasesVatBreakdown(invoices);
    expect(out.find((b) => b.rate === 18)?.amount).toBe(27);
  });

  it('omite registros sin IGV total', () => {
    expect(calculatePurchasesVatBreakdown([aPurchaseInvoice({ vatAmountTaxed: 0 })])).toEqual([]);
  });
});
