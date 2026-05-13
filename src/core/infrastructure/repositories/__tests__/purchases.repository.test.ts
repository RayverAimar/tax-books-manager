import { describe, it, expect, beforeEach } from 'vitest';
import { PurchasesRepository } from '../purchases.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { getExecuteCalls } from '@/test/helpers/db';
import { aPurchaseInvoice } from '@/test/helpers/factories';

describe('PurchasesRepository', () => {
  let repo: PurchasesRepository;

  beforeEach(async () => {
    await initTestDb();
    repo = new PurchasesRepository();
  });

  it('rechaza create con periodo inválido', async () => {
    await expect(repo.create(1, 'BAD', aPurchaseInvoice())).rejects.toThrow();
  });

  it('create envuelve en transacción', async () => {
    mockHandler((sql) => {
      if (sql.startsWith('INSERT INTO purchase_records')) return { lastInsertId: 1, rowsAffected: 1 };
      if (sql.startsWith('SELECT COUNT')) return [{ count: 1, total: 118 }];
      if (sql.startsWith('SELECT * FROM purchase_records WHERE id')) {
        return [{ id: 1, period: '202401', currency: 'PEN', exchange_rate: '1' }];
      }
      return [];
    });
    try {
      await repo.create(1, '202401', aPurchaseInvoice());
    } catch {
      /* ignore mapping errors */
    }
    const sqls = getExecuteCalls().map((c) => c.sql);
    expect(sqls.some((s) => s.startsWith('BEGIN'))).toBe(true);
  });

  it('bulkCreate omite trabajo cuando no hay registros', async () => {
    await repo.bulkCreate(1, '202401', []);
    expect(getExecuteCalls()).toHaveLength(0);
  });

  it('replacePeriodRecords borra y bulk-inserta', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.replacePeriodRecords(1, '202401', [aPurchaseInvoice()]);
    const sqls = getExecuteCalls().map((c) => c.sql);
    expect(sqls.some((s) => /DELETE FROM purchase_records/.test(s))).toBe(true);
    expect(sqls.some((s) => /INSERT INTO purchase_records/.test(s))).toBe(true);
  });

  it('getAll mapea filas correctamente', async () => {
    mockHandler(() => [
      {
        id: 1,
        ruc: '12345678901',
        period: '202401',
        taxable_base_taxed: '100',
        vat_amount_taxed: '18',
        total_amount: '118',
        currency: 'PEN',
        exchange_rate: '1'
      }
    ]);
    const records = await repo.getAll(1, '202401');
    expect(records).toHaveLength(1);
    expect(records[0].taxableBaseTaxed).toBe(100);
  });

  it('updateField rechaza campo no permitido', async () => {
    await expect(repo.updateField(1, '202401', 1, 'evil', 'x')).rejects.toThrow();
  });

  it('updateField ejecuta UPDATE', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.updateField(1, '202401', 1, 'ruc', '12345678901');
    expect(getExecuteCalls().some((c) => /UPDATE purchase_records/.test(c.sql))).toBe(true);
  });

  it('updateFields acepta freeUseFieldN', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.updateFields(1, '202401', 1, { freeUseField5: 'X' });
    const update = getExecuteCalls().find((c) => /UPDATE purchase_records/.test(c.sql));
    expect(update?.sql).toContain('free_use_field5');
  });

  it('delete rechaza si rowsAffected = 0', async () => {
    mockHandler(() => ({ rowsAffected: 0 }));
    await expect(repo.delete(1, '202401', 99)).rejects.toThrow();
  });

  it('deleteByPeriod limpia el periodo', async () => {
    mockHandler(() => ({ rowsAffected: 3 }));
    await repo.deleteByPeriod(1, '202401');
    expect(getExecuteCalls().some((c) => /DELETE FROM purchase_records/.test(c.sql))).toBe(true);
  });

  it('getById devuelve null si no existe', async () => {
    mockHandler(() => []);
    expect(await repo.getById(1, 1)).toBeNull();
  });
});
