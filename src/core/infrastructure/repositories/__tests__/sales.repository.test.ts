import { describe, it, expect, beforeEach } from 'vitest';
import { SalesRepository } from '../sales.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { getExecuteCalls, getSelectCalls } from '@/test/helpers/db';
import { aSalesInvoice } from '@/test/helpers/factories';

describe('SalesRepository', () => {
  let repo: SalesRepository;

  beforeEach(async () => {
    await initTestDb();
    repo = new SalesRepository();
  });

  describe('create', () => {
    it('rechaza periodo inválido', async () => {
      await expect(repo.create(1, 'BAD', aSalesInvoice())).rejects.toThrow(/periodo/i);
    });

    it('inserta, refresca metadata y retorna el registro creado', async () => {
      let inserted = false;
      const inv = aSalesInvoice();
      mockHandler((sql) => {
        if (sql.startsWith('INSERT INTO sales_records')) {
          inserted = true;
          return { lastInsertId: 42, rowsAffected: 1 };
        }
        if (sql.startsWith('SELECT COUNT')) {
          return [{ count: 1, total: 118 }];
        }
        if (sql.startsWith('SELECT * FROM sales_records WHERE id') && inserted) {
          return [
            {
              id: 42,
              ruc: inv.ruc,
              business_name: inv.businessName,
              period: '202401',
              sunat_correlative: inv.sunatCorrelative,
              issue_date: '2024-01-15',
              due_date: null,
              voucher_type: '01',
              voucher_series: 'F001',
              voucher_number: '00000001',
              voucher_end_number: null,
              customer_doc_type: '6',
              customer_doc_number: '20987654321',
              customer_name: 'CLIENTE',
              taxable_base: '100',
              vat_amount: '18',
              total_amount: '118',
              currency: 'PEN',
              exchange_rate: '1',
              created_at: '2024-01-15',
              updated_at: '2024-01-15'
            }
          ];
        }
        return [];
      });

      const created = await repo.create(1, '202401', inv);
      expect(created.id).toBe(42);
      expect(created.totalAmount).toBe(118);
    });

    it('envuelve la operación en una transacción', async () => {
      mockHandler((sql) => {
        if (sql.startsWith('INSERT INTO sales_records')) return { lastInsertId: 1, rowsAffected: 1 };
        if (sql.startsWith('SELECT COUNT')) return [{ count: 1, total: 0 }];
        if (sql.startsWith('SELECT * FROM sales_records WHERE id')) return [{ id: 1, period: '202401' }];
        return [];
      });
      try {
        await repo.create(1, '202401', aSalesInvoice());
      } catch {
        // ignore mapping errors — we only care about transaction SQL
      }
      const calls = getExecuteCalls().map((c) => c.sql);
      expect(calls.some((s) => s.startsWith('BEGIN'))).toBe(true);
      expect(calls.some((s) => s === 'COMMIT')).toBe(true);
    });
  });

  describe('bulkCreate', () => {
    it('omite bulkCreate cuando no hay registros', async () => {
      await repo.bulkCreate(1, '202401', []);
      expect(getExecuteCalls()).toHaveLength(0);
    });

    it('inserta múltiples filas en chunks', async () => {
      mockHandler(() => ({ rowsAffected: 1 }));
      const records = Array.from({ length: 3 }, (_, i) => aSalesInvoice({ id: i + 1 }));
      await repo.bulkCreate(1, '202401', records);
      const inserts = getExecuteCalls().filter((c) => c.sql.startsWith('INSERT INTO sales_records'));
      expect(inserts.length).toBeGreaterThan(0);
    });
  });

  describe('replacePeriodRecords', () => {
    it('rechaza periodo inválido', async () => {
      await expect(repo.replacePeriodRecords(1, 'BAD', [])).rejects.toThrow(/periodo/i);
    });

    it('borra y luego inserta nuevos registros', async () => {
      mockHandler(() => ({ rowsAffected: 1 }));
      await repo.replacePeriodRecords(1, '202401', [aSalesInvoice()]);
      const sqls = getExecuteCalls().map((c) => c.sql);
      expect(sqls.some((s) => /DELETE FROM sales_records/.test(s))).toBe(true);
      expect(sqls.some((s) => /INSERT INTO sales_records/.test(s))).toBe(true);
    });
  });

  describe('getAll', () => {
    it('mapea filas a SalesInvoice', async () => {
      mockHandler(() => [
        {
          id: 1,
          ruc: '12345678901',
          business_name: 'TEST',
          period: '202401',
          taxable_base: '100',
          vat_amount: '18',
          total_amount: '118',
          currency: 'PEN',
          exchange_rate: '1'
        }
      ]);
      const records = await repo.getAll(1, '202401');
      expect(records).toHaveLength(1);
      expect(records[0].taxableBase).toBe(100);
      expect(records[0].vatAmount).toBe(18);
    });
  });

  describe('updateField', () => {
    it('rechaza campos no permitidos', async () => {
      await expect(repo.updateField(1, '202401', 1, 'malicious', 'x')).rejects.toThrow(/not allowed/i);
    });

    it('rechaza si rowsAffected = 0', async () => {
      mockHandler(() => ({ rowsAffected: 0 }));
      await expect(repo.updateField(1, '202401', 1, 'ruc', 'x')).rejects.toThrow(/no encontrado/i);
    });

    it('ejecuta UPDATE para campos permitidos', async () => {
      mockHandler(() => ({ rowsAffected: 1 }));
      await repo.updateField(1, '202401', 1, 'ruc', '12345678901');
      const update = getExecuteCalls().find((c) => /UPDATE sales_records/.test(c.sql));
      expect(update?.sql).toContain('ruc');
    });
  });

  describe('updateFields', () => {
    it('arma un único UPDATE con múltiples columnas', async () => {
      mockHandler(() => ({ rowsAffected: 1 }));
      await repo.updateFields(1, '202401', 1, { taxableBase: 100, vatAmount: 18, vatPercentage: 18 });
      const update = getExecuteCalls().find((c) => /UPDATE sales_records/.test(c.sql));
      expect(update?.sql).toMatch(/taxable_base/);
      expect(update?.sql).toMatch(/vat_amount/);
    });

    it('rechaza si un campo no está en la whitelist', async () => {
      await expect(
        repo.updateFields(1, '202401', 1, { evil: 'x' } as unknown as Record<string, string>)
      ).rejects.toThrow(/not allowed/i);
    });
  });

  describe('update', () => {
    it('filtra campos del sistema y delega a updateFields', async () => {
      mockHandler(() => ({ rowsAffected: 1 }));
      mockHandler((sql) => {
        if (/UPDATE sales_records/.test(sql)) return { rowsAffected: 1 };
        if (sql.startsWith('SELECT * FROM sales_records')) {
          return [{ id: 1, ruc: '12345678901', period: '202401', currency: 'PEN', exchange_rate: '1' }];
        }
        return [];
      });
      const result = await repo.update(1, '202401', 1, { ruc: '12345678901' });
      expect(result.id).toBe(1);
    });
  });

  describe('delete', () => {
    it('rechaza si rowsAffected = 0', async () => {
      mockHandler(() => ({ rowsAffected: 0 }));
      await expect(repo.delete(1, '202401', 99)).rejects.toThrow(/no encontrado/i);
    });

    it('borra y luego refresca metadata en transacción', async () => {
      mockHandler((sql) => {
        if (sql.startsWith('DELETE')) return { rowsAffected: 1 };
        if (sql.startsWith('SELECT COUNT')) return [{ count: 0, total: 0 }];
        return [];
      });
      await repo.delete(1, '202401', 1);
      const sqls = getExecuteCalls().map((c) => c.sql);
      expect(sqls.some((s) => s.startsWith('BEGIN'))).toBe(true);
      expect(sqls.some((s) => /DELETE FROM sales_records/.test(s))).toBe(true);
    });
  });

  describe('deleteByPeriod', () => {
    it('borra todos los registros y resetea metadata', async () => {
      mockHandler(() => ({ rowsAffected: 5 }));
      await repo.deleteByPeriod(1, '202401');
      const sqls = getExecuteCalls().map((c) => c.sql);
      expect(sqls.some((s) => /DELETE FROM sales_records/.test(s))).toBe(true);
    });
  });

  describe('getById', () => {
    it('devuelve null cuando no hay filas', async () => {
      mockHandler(() => []);
      expect(await repo.getById(1, 1)).toBeNull();
    });

    it('emite consulta por id scopeada a company_id', async () => {
      mockHandler(() => [{ id: 7, ruc: '12345678901', period: '202401', currency: 'PEN', exchange_rate: '1' }]);
      const found = await repo.getById(7, 1);
      expect(found?.id).toBe(7);
      const calls = getSelectCalls();
      const lastSelect = calls[calls.length - 1];
      expect(lastSelect?.sql).toMatch(/SELECT \* FROM sales_records WHERE id = \? AND company_id = \?/);
    });
  });
});
