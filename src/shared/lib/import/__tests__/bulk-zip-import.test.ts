import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { processZipFile, checkPeriodCollisions, type ZipFileInfo } from '../bulk-zip-import';
import { buildSalesCsv, buildPurchasesCsv } from '@/test/helpers/csv';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { PeriodUtils } from '@/core/domain/entities/period.entity';

async function zipToFile(zip: JSZip, name = 'datos.zip'): Promise<File> {
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/zip' });
}

describe('processZipFile', () => {
  it('falla si no hay archivos válidos', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'hello');
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.success).toBe(false);
  });

  it('falla si la carpeta no es compras/ventas', async () => {
    const zip = new JSZip();
    zip.folder('otras')!.file('202408.csv', 'x');
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.errors.some((e) => /Carpeta inválida/.test(e.error))).toBe(true);
  });

  it('detecta period inválido', async () => {
    const zip = new JSZip();
    zip.folder('ventas')!.file('999999.csv', 'x');
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.errors.some((e) => /Mes inválido/.test(e.error))).toBe(true);
  });

  it('detecta period anterior a 202408', async () => {
    const zip = new JSZip();
    zip.folder('ventas')!.file('202407.csv', buildSalesCsv([{ ruc: '12345678901' }]));
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.errors.some((e) => /anterior a Agosto 2024/.test(e.error))).toBe(true);
  });

  it('exitoso con estructura válida', async () => {
    const validPeriod = PeriodUtils.getLastValidPeriod();
    const zip = new JSZip();
    zip.folder('ventas')!.file(`${validPeriod}.csv`, buildSalesCsv([{ ruc: '12345678901' }]));
    zip.folder('compras')!.file(`${validPeriod}.csv`, buildPurchasesCsv([{ ruc: '12345678901' }]));
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(2);
  });

  it('rechaza extensiones no soportadas', async () => {
    const validPeriod = PeriodUtils.getLastValidPeriod();
    const zip = new JSZip();
    zip.folder('ventas')!.file(`${validPeriod}.xlsx`, 'x');
    const file = await zipToFile(zip);
    const result = await processZipFile(file);
    expect(result.errors.some((e) => /no soportado/.test(e.error))).toBe(true);
  });
});

describe('checkPeriodCollisions', () => {
  beforeEach(async () => {
    await initTestDb();
  });

  it('retorna colisiones cuando el periodo tiene datos', async () => {
    const validPeriod = PeriodUtils.getLastValidPeriod();
    mockHandler(() => [
      { code: validPeriod, record_count: 10, last_modified: '2024-08-15', declared: 0 }
    ]);
    const files: ZipFileInfo[] = [
      { path: 'ventas/p.csv', period: validPeriod, type: 'sales', content: '' }
    ];
    const collisions = await checkPeriodCollisions(files, 1);
    expect(collisions).toHaveLength(1);
    expect(collisions[0].existingRecordCount).toBe(10);
  });

  it('no colisiones cuando no hay datos previos', async () => {
    mockHandler(() => []);
    const validPeriod = PeriodUtils.getLastValidPeriod();
    const collisions = await checkPeriodCollisions(
      [{ path: 'p.csv', period: validPeriod, type: 'sales', content: '' }],
      1
    );
    expect(collisions).toHaveLength(0);
  });
});
