import { describe, it, expect } from 'vitest';
import { createImporter, type ImportFieldMapping } from '../generic-import';

interface Sample {
  id?: number;
  ruc: string | null;
  amount: number | null;
  date: string | null;
}

const mappings: ImportFieldMapping[] = [
  { sunatHeader: 'RUC', tsField: 'ruc', dataType: 'string' },
  { sunatHeader: 'AMOUNT', tsField: 'amount', dataType: 'float' },
  { sunatHeader: 'DATE', tsField: 'date', dataType: 'date' }
];

describe('createImporter', () => {
  it('fromCSV importa filas válidas', async () => {
    const importer = createImporter<Sample>(mappings);
    const csv = 'RUC,AMOUNT,DATE\n12345678901,100.5,15/03/2024';
    const result = await importer.fromCSV(csv);
    expect(result.success).toBe(true);
    expect(result.data[0]).toMatchObject({ ruc: '12345678901', amount: 100.5, date: '2024-03-15' });
  });

  it('rechaza archivo vacío', async () => {
    const importer = createImporter<Sample>(mappings);
    const result = await importer.fromCSV('');
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/vacío/);
  });

  it('reporta columnas faltantes', async () => {
    const importer = createImporter<Sample>(mappings);
    const result = await importer.fromCSV('RUC\n12345678901');
    expect(result.errors.join(' ')).toMatch(/faltantes/);
  });

  it('reporta columnas extra en strictColumnCheck', async () => {
    const importer = createImporter<Sample>(mappings, { strictColumnCheck: true });
    const csv = 'RUC,AMOUNT,DATE,EXTRA\n1,2,01/01/2024,x';
    const result = await importer.fromCSV(csv);
    expect(result.errors.join(' ')).toMatch(/extra/i);
  });

  it('permite columnas extra cuando strictColumnCheck=false', async () => {
    const importer = createImporter<Sample>(mappings, { strictColumnCheck: false });
    const csv = 'RUC,AMOUNT,DATE,EXTRA\n1,2,01/01/2024,x';
    const result = await importer.fromCSV(csv);
    expect(result.success).toBe(true);
  });

  it('quita BOM UTF-8', async () => {
    const importer = createImporter<Sample>(mappings);
    const csv = '﻿RUC,AMOUNT,DATE\n12345678901,1,01/01/2024';
    const result = await importer.fromCSV(csv);
    expect(result.success).toBe(true);
    expect(result.data[0].ruc).toBe('12345678901');
  });

  it('reemplaza coma decimal por punto', async () => {
    const importer = createImporter<Sample>(mappings);
    // PapaParse splits on commas, so quote values containing "1234,56".
    const csv = 'RUC,AMOUNT,DATE\n1,"1234,56",01/01/2024';
    const result = await importer.fromCSV(csv);
    expect(result.success).toBe(true);
    expect(result.data[0].amount).toBeCloseTo(1234.56);
  });

  it('vacíos quedan como null', async () => {
    const importer = createImporter<Sample>(mappings);
    const csv = 'RUC,AMOUNT,DATE\n,,';
    const result = await importer.fromCSV(csv);
    expect(result.data[0].ruc).toBeNull();
    expect(result.data[0].amount).toBeNull();
    expect(result.data[0].date).toBeNull();
  });

  it('fromTXT importa con pipe', async () => {
    const importer = createImporter<Sample>(mappings);
    const txt = 'RUC|AMOUNT|DATE\n1|2|01/01/2024';
    const result = await importer.fromTXT(txt);
    expect(result.success).toBe(true);
  });

  it('aplica postProcess', async () => {
    const importer = createImporter<Sample & { computed?: number }>(mappings, {
      postProcess: (record) => {
        (record as Record<string, unknown>).computed = ((record as Record<string, unknown>).amount as number) * 2;
      }
    });
    const result = await importer.fromCSV('RUC,AMOUNT,DATE\n1,10,01/01/2024');
    expect((result.data[0] as Sample & { computed?: number }).computed).toBe(20);
  });

  it('aplica validateRecord y propaga warnings', async () => {
    const importer = createImporter<Sample>(mappings, {
      validateRecord: (_record, rowNumber) => [`Fila ${rowNumber}: warning de prueba`]
    });
    const result = await importer.fromCSV('RUC,AMOUNT,DATE\n1,10,01/01/2024');
    expect(result.warnings.some((w) => /warning de prueba/.test(w))).toBe(true);
  });

  it('usa generateId si se provee', async () => {
    let counter = -100;
    const importer = createImporter<Sample>(mappings, { generateId: () => counter-- });
    const result = await importer.fromCSV('RUC,AMOUNT,DATE\n1,10,01/01/2024\n2,20,02/01/2024');
    expect(result.data[0].id).toBe(-100);
    expect(result.data[1].id).toBe(-101);
  });

  it('integer dataType: convierte válido y reporta no parseable como null + warning', async () => {
    const mapInt: ImportFieldMapping[] = [{ sunatHeader: 'N', tsField: 'n', dataType: 'integer' }];
    const importer = createImporter<{ n: number | null }>(mapInt);
    const r1 = await importer.fromCSV('N\n42');
    expect(r1.data[0].n).toBe(42);
    // No coercionar NaN → 0: oculta montos inválidos como ceros reales en SIRE.
    const r2 = await importer.fromCSV('N\nabc');
    expect(r2.data[0].n).toBeNull();
    expect(r2.warnings.some((w) => w.includes('valor no numérico'))).toBe(true);
  });
});
