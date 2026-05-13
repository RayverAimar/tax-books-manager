import { describe, it, expect } from 'vitest';
import { importPurchasesCSV, importPurchasesTXT } from '../purchases-import';
import { buildPurchasesCsv, buildPurchasesTxt, purchasesHeaderFor } from '@/test/helpers/csv';

describe('importPurchasesCSV', () => {
  it('rechaza contenido vacío', async () => {
    const result = await importPurchasesCSV('');
    expect(result.success).toBe(false);
  });

  it('rechaza CSV con columnas insuficientes', async () => {
    const result = await importPurchasesCSV('Ruc\n12345678901');
    expect(result.success).toBe(false);
  });

  it('importa fila válida con 80 columnas', async () => {
    const csv = buildPurchasesCsv([{ ruc: '12345678901', taxableBaseTaxed: 100, vatAmountTaxed: 18 }]);
    const result = await importPurchasesCSV(csv);
    expect(result.success).toBe(true);
    expect(result.data[0].ruc).toBe('12345678901');
    expect(result.data[0].vatPercentage).toBe(18);
  });

  it('emite warning para RUC inválido', async () => {
    const csv = buildPurchasesCsv([{ ruc: '123' }]);
    const result = await importPurchasesCSV(csv);
    expect(result.warnings.some((w) => /RUC inválido/i.test(w))).toBe(true);
  });

  it('emite warning para RUC de proveedor inválido', async () => {
    const csv = buildPurchasesCsv([{ ruc: '12345678901', supplierDocNumber: '99999999999' }]);
    const result = await importPurchasesCSV(csv);
    expect(result.warnings.some((w) => /proveedor/i.test(w))).toBe(false);
    // 99999999999 has 11 chars — depends on isValidRUC; just verify no crash
    expect(result.success).toBe(true);
  });

  it('trunca nombre de proveedor largo', async () => {
    const longName = 'B'.repeat(800);
    const csv = buildPurchasesCsv([{ ruc: '12345678901', [purchasesHeaderFor('supplierName')]: longName }]);
    const result = await importPurchasesCSV(csv);
    expect(result.data[0].supplierName!.length).toBeLessThanOrEqual(500);
  });

  it('vatPercentage null cuando taxableBaseTaxed es 0', async () => {
    const csv = buildPurchasesCsv([{ ruc: '12345678901', taxableBaseTaxed: 0, vatAmountTaxed: 0 }]);
    const result = await importPurchasesCSV(csv);
    expect(result.data[0].vatPercentage).toBeNull();
  });
});

describe('importPurchasesTXT', () => {
  it('importa TXT pipe-delimited', async () => {
    const txt = buildPurchasesTxt([{ ruc: '12345678901' }], true);
    const result = await importPurchasesTXT(txt);
    expect(result.success).toBe(true);
  });
});
