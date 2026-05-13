import { describe, it, expect, beforeEach } from 'vitest';
import { PeriodRepository } from '../period.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { getExecuteCalls } from '@/test/helpers/db';

describe('PeriodRepository', () => {
  let repo: PeriodRepository;

  beforeEach(async () => {
    await initTestDb();
    repo = new PeriodRepository();
  });

  it('getAvailablePeriods marca hasData a partir de la DB', async () => {
    const { PeriodUtils } = await import('@/core/domain/entities/period.entity');
    const available = PeriodUtils.getAvailablePeriods();
    const dbCode = available[0].code; // pick a code that PeriodUtils produces
    mockHandler((sql) => {
      if (sql.startsWith('SELECT code')) {
        return [{ code: dbCode, record_count: 5, last_modified: '2024-01-15T00:00:00Z', declared: 1 }];
      }
      return [];
    });
    const periods = await repo.getAvailablePeriods(1, 'sales');
    const target = periods.find((p) => p.code === dbCode);
    expect(target?.hasData).toBe(true);
    expect(target?.recordCount).toBe(5);
    expect(target?.declared).toBe(true);
  });

  it('getAvailablePeriods marca hasData=false cuando no hay datos', async () => {
    mockHandler(() => []);
    const periods = await repo.getAvailablePeriods(1, 'sales');
    expect(periods.every((p) => p.hasData === false)).toBe(true);
  });

  it('getOrCreatePeriod devuelve existente si lo encuentra', async () => {
    mockHandler(() => [
      {
        id: 9,
        company_id: 1,
        code: '202401',
        type: 'sales',
        has_data: 0,
        record_count: 0,
        total_amount: '0',
        last_modified: null,
        declared: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ]);
    const period = await repo.getOrCreatePeriod({ companyId: 1, code: '202401', type: 'sales' });
    expect(period.id).toBe(9);
  });

  it('getOrCreatePeriod crea cuando no existe', async () => {
    let created = false;
    mockHandler((sql, params) => {
      if (sql.startsWith('SELECT * FROM periods') && !created) return [];
      if (sql.startsWith('INSERT INTO periods')) {
        created = true;
        return { lastInsertId: 10, rowsAffected: 1 };
      }
      if (sql.startsWith('SELECT * FROM periods') && created) {
        return [
          {
            id: 10,
            company_id: params[0],
            code: '202401',
            type: 'sales',
            has_data: 0,
            record_count: 0,
            total_amount: '0',
            declared: 0,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ];
      }
      return [];
    });
    const period = await repo.getOrCreatePeriod({ companyId: 1, code: '202401', type: 'sales' });
    expect(period.id).toBe(10);
  });

  it('getById lanza si no existe', async () => {
    mockHandler(() => []);
    await expect(repo.getById(123)).rejects.toThrow(/no encontrado/);
  });

  it('update usa INSERT ... ON CONFLICT', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.update(1, '202401', 'sales', 5, 1234.56);
    const calls = getExecuteCalls();
    expect(calls.some((c) => /ON CONFLICT/.test(c.sql))).toBe(true);
  });

  it('setDeclared actualiza la fila correcta', async () => {
    mockHandler(() => ({ rowsAffected: 1 }));
    await repo.setDeclared(1, '202401', 'sales', true);
    const updateCall = getExecuteCalls().find((c) => /UPDATE periods/.test(c.sql));
    expect(updateCall?.params).toEqual([1, expect.any(String), 1, '202401', 'sales']);
  });
});
