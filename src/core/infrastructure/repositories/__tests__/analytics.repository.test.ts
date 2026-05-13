import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsRepository } from '../analytics.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { queryCache } from '@/shared/lib/cache/query-cache';

describe('AnalyticsRepository', () => {
  let repo: AnalyticsRepository;

  beforeEach(async () => {
    await initTestDb();
    queryCache.clear();
    repo = new AnalyticsRepository();
  });

  describe('getPeriodSummary', () => {
    it('rechaza tipo inválido', async () => {
      // @ts-expect-error invalid type
      await expect(repo.getPeriodSummary(1, '202401', 'bad')).rejects.toThrow();
    });

    it('devuelve null si no hay datos', async () => {
      mockHandler(() => []);
      expect(await repo.getPeriodSummary(1, '202401', 'sales')).toBeNull();
    });

    it('devuelve el primer registro para sales', async () => {
      mockHandler(() => [{ periodCode: '202401', totalAmount: 100, recordCount: 1 }]);
      const result = await repo.getPeriodSummary(1, '202401', 'sales');
      expect(result?.totalAmount).toBe(100);
    });

    it('usa la tabla correcta para purchases', async () => {
      let sql = '';
      mockHandler((s) => {
        sql = s;
        return [];
      });
      await repo.getPeriodSummary(1, '202401', 'purchases');
      expect(sql).toContain('purchase_records');
    });
  });

  describe('getSalesPeriodSummary / getPurchasesPeriodSummary', () => {
    it('cachean el resultado entre llamadas', async () => {
      let calls = 0;
      mockHandler(() => {
        calls++;
        return [{ totalAmount: 50 }];
      });
      await repo.getSalesPeriodSummary(1, '202401');
      await repo.getSalesPeriodSummary(1, '202401');
      expect(calls).toBe(1); // 2nd call hits cache
    });

    it('purchases tiene cache key independiente', async () => {
      let calls = 0;
      mockHandler(() => {
        calls++;
        return [{ totalAmount: 1 }];
      });
      await repo.getSalesPeriodSummary(1, '202401');
      await repo.getPurchasesPeriodSummary(1, '202401');
      expect(calls).toBe(2);
    });
  });

  describe('getPeriodComparison', () => {
    it('rechaza tipo inválido', async () => {
      // @ts-expect-error invalid
      await expect(repo.getPeriodComparison(1, '202401', 'bad')).rejects.toThrow();
    });

    it('devuelve null si no hay filas', async () => {
      mockHandler(() => []);
      expect(await repo.getPeriodComparison(1, '202401', 'sales')).toBeNull();
    });

    it('devuelve la comparación', async () => {
      mockHandler(() => [{ periodCode: '202401', totalAmount: 100, delta1Month: 50 }]);
      const out = await repo.getPeriodComparison(1, '202401', 'sales');
      expect(out?.delta1Month).toBe(50);
    });
  });

  describe('getYearlySummary', () => {
    it('combina sales y purchases', async () => {
      mockHandler((sql) => {
        if (/FROM sales_records/.test(sql)) {
          return [{ sales_total: 1000, sales_taxable_base: 850, sales_vat: 150, sales_months: 6 }];
        }
        if (/FROM purchase_records/.test(sql)) {
          return [{ purchases_total: 600, purchases_taxable_base: 500, purchases_vat: 90, purchases_months: 5 }];
        }
        return [];
      });
      const summary = await repo.getYearlySummary(1, 2024);
      expect(summary?.year).toBe(2024);
      expect(summary?.salesTotal).toBe(1000);
      expect(summary?.purchasesTotal).toBe(600);
      expect(summary?.netTotal).toBe(400);
    });
  });

  describe('getMonthlyTrend', () => {
    it('retorna las filas tal cual para sales', async () => {
      mockHandler(() => [{ periodCode: '202401', totalAmount: 100 }]);
      const out = await repo.getMonthlyTrend(1, 2024, 'sales');
      expect(out).toHaveLength(1);
    });

    it('usa la rama de purchases cuando aplica', async () => {
      let usedSql = '';
      mockHandler((s) => {
        usedSql = s;
        return [];
      });
      await repo.getMonthlyTrend(1, 2024, 'purchases');
      expect(usedSql).toContain('purchase_records');
    });
  });

  describe('getDashboardMetrics', () => {
    it('agrupa los queries en una respuesta', async () => {
      mockHandler(() => []);
      const out = await repo.getDashboardMetrics(1, '202402', 'sales');
      expect(out).toHaveProperty('currentPeriod');
      expect(out).toHaveProperty('previousPeriod');
      expect(out).toHaveProperty('yearToDate');
      expect(out).toHaveProperty('monthlyTrend');
      expect(out).toHaveProperty('periodComparison');
    });

    it('maneja transición de enero a diciembre del año anterior', async () => {
      mockHandler(() => []);
      const out = await repo.getDashboardMetrics(1, '202401', 'sales');
      expect(out).toBeDefined();
    });
  });

  describe('getTopClients / getTopSuppliers', () => {
    it('limita el número de filas', async () => {
      let lastParams: unknown[] = [];
      mockHandler((_sql, params) => {
        lastParams = params;
        return [];
      });
      await repo.getTopClients(1, '202401', 5);
      expect(lastParams[2]).toBe(5);
    });

    it('getTopSuppliers usa default limit = 10', async () => {
      let lastParams: unknown[] = [];
      mockHandler((_sql, params) => {
        lastParams = params;
        return [];
      });
      await repo.getTopSuppliers(1, '202401');
      expect(lastParams[2]).toBe(10);
    });
  });

  describe('getDocumentDistribution', () => {
    it('rechaza tipo inválido', async () => {
      // @ts-expect-error invalid
      await expect(repo.getDocumentDistribution(1, '202401', 'bad')).rejects.toThrow();
    });

    it('devuelve filas', async () => {
      mockHandler(() => [{ documentType: '01', count: 5, percentage: 80 }]);
      const out = await repo.getDocumentDistribution(1, '202401', 'sales');
      expect(out).toHaveLength(1);
    });
  });

  describe('getTaxSummary', () => {
    it('rechaza tipo inválido', async () => {
      // @ts-expect-error invalid
      await expect(repo.getTaxSummary(1, '202401', 'bad')).rejects.toThrow();
    });

    it('devuelve null si no hay resultados', async () => {
      mockHandler(() => []);
      expect(await repo.getTaxSummary(1, '202401', 'sales')).toBeNull();
    });

    it('devuelve resumen para sales', async () => {
      mockHandler(() => [{ taxableBase: 1000, vatTotal: 180, grandTotal: 1180 }]);
      const out = await repo.getTaxSummary(1, '202401', 'sales');
      expect(out?.grandTotal).toBe(1180);
    });

    it('usa el query de purchases', async () => {
      let sql = '';
      mockHandler((s) => {
        sql = s;
        return [];
      });
      await repo.getTaxSummary(1, '202401', 'purchases');
      expect(sql).toContain('purchase_records');
    });
  });
});
