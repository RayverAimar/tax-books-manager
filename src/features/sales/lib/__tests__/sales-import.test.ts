import { describe, it, expect } from 'vitest';
import { importSalesCSV, importSalesTXT } from '../sales-import';
import { buildSalesCsv, buildSalesTxt, salesHeaderFor } from '@/test/helpers/csv';

describe('importSalesCSV', () => {
  it('rechaza contenido vacío', async () => {
    const result = await importSalesCSV('');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rechaza CSV con columnas faltantes', async () => {
    const result = await importSalesCSV('Ruc,RazonSocial\n12345678901,Test');
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toMatch(/columnas/i);
  });

  it('importa una fila mínima válida', async () => {
    const csv = buildSalesCsv([{ ruc: '12345678901' }]);
    const result = await importSalesCSV(csv);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ruc).toBe('12345678901');
  });

  it('emite warning para RUC inválido', async () => {
    const csv = buildSalesCsv([{ ruc: '123' }]);
    const result = await importSalesCSV(csv);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => /RUC inválido/i.test(w))).toBe(true);
  });

  it('emite warning para DNI de cliente inválido', async () => {
    const csv = buildSalesCsv([{ ruc: '12345678901', customerDocNumber: '1234567A' }]);
    const result = await importSalesCSV(csv);
    // Note: 1234567A has 8 chars but fails DNI regex
    expect(result.warnings.some((w) => /DNI de cliente/i.test(w))).toBe(true);
  });

  it('calcula vatPercentage a partir de taxableBase y vatAmount', async () => {
    const csv = buildSalesCsv([{ ruc: '12345678901', taxableBase: 100, vatAmount: 18 }]);
    const result = await importSalesCSV(csv);
    expect(result.data[0].vatPercentage).toBe(18);
  });

  it('importa varias filas en orden', async () => {
    const csv = buildSalesCsv([
      { ruc: '12345678901', taxableBase: 100, vatAmount: 18 },
      { ruc: '12345678901', taxableBase: 200, vatAmount: 36 }
    ]);
    const result = await importSalesCSV(csv);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].taxableBase).toBe(100);
    expect(result.data[1].taxableBase).toBe(200);
  });

  it('asigna IDs negativos a cada registro importado', async () => {
    const csv = buildSalesCsv([{ ruc: '12345678901' }, { ruc: '12345678901' }]);
    const result = await importSalesCSV(csv);
    expect(result.data[0].id).toBeLessThan(0);
    expect(result.data[1].id).toBeLessThan(0);
    expect(result.data[0].id).not.toBe(result.data[1].id);
  });

  it('trunca razón social larga', async () => {
    const longName = 'A'.repeat(1000);
    const bnHeader = salesHeaderFor('businessName');
    const csv = buildSalesCsv([{ ruc: '12345678901', [bnHeader]: longName }]);
    const result = await importSalesCSV(csv);
    expect(result.data[0].businessName!.length).toBeLessThanOrEqual(500);
  });
});

describe('importSalesTXT', () => {
  it('importa TXT pipe-delimited', async () => {
    const txt = buildSalesTxt([{ ruc: '12345678901', taxableBase: 50, vatAmount: 9 }], true);
    const result = await importSalesTXT(txt);
    expect(result.success).toBe(true);
    expect(result.data[0].ruc).toBe('12345678901');
  });
});
