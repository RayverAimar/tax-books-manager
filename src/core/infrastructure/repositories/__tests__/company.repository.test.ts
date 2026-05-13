import { describe, it, expect, beforeEach } from 'vitest';
import { CompanyRepository } from '../company.repository';
import { initTestDb, mockHandler } from '@/test/helpers/repo';

describe('CompanyRepository', () => {
  let repo: CompanyRepository;

  beforeEach(async () => {
    await initTestDb();
    repo = new CompanyRepository();
  });

  it('rechaza crear con RUC inválido', async () => {
    await expect(repo.create({ ruc: '123', businessName: 'ACME' })).rejects.toThrow(/RUC/);
  });

  it('rechaza crear con businessName demasiado corto', async () => {
    await expect(repo.create({ ruc: '12345678903', businessName: 'AB' })).rejects.toThrow(/Razón social/);
  });

  it('crea y luego recupera la empresa', async () => {
    let inserted = false;
    mockHandler((sql) => {
      if (sql.startsWith('INSERT INTO companies')) {
        inserted = true;
        return { lastInsertId: 7, rowsAffected: 1 };
      }
      if (sql.startsWith('SELECT')) {
        return inserted
          ? [{ id: 7, ruc: '12345678903', businessName: 'ACME', createdAt: '2024-01-01', updatedAt: '2024-01-01' }]
          : [];
      }
      return [];
    });

    const created = await repo.create({ ruc: '12345678903', businessName: 'ACME SAC' });
    expect(created.id).toBe(7);
    expect(created.ruc).toBe('12345678903');
  });

  it('traduce UNIQUE constraint a error legible', async () => {
    mockHandler((sql) => {
      if (sql.startsWith('INSERT')) throw new Error('UNIQUE constraint failed: companies.ruc');
      return [];
    });
    await expect(repo.create({ ruc: '12345678903', businessName: 'ACME' })).rejects.toThrow(/Ya existe/);
  });

  it('getById lanza error si no existe', async () => {
    mockHandler(() => []);
    await expect(repo.getById(99)).rejects.toThrow(/no encontrada/);
  });

  it('getAll mapea filas y convierte timestamps a Date', async () => {
    mockHandler(() => [
      { id: 1, ruc: '20000000001', businessName: 'A', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 2, ruc: '20000000002', businessName: 'B', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
    ]);
    const companies = await repo.getAll();
    expect(companies).toHaveLength(2);
    expect(companies[0].businessName).toBe('A');
    expect(companies[0].createdAt).toBeInstanceOf(Date);
  });

  it('update valida businessName', async () => {
    await expect(repo.update(1, 'AB')).rejects.toThrow();
  });

  it('hasAnyCompany devuelve true cuando count > 0', async () => {
    mockHandler(() => [{ count: 3 }]);
    expect(await repo.hasAnyCompany()).toBe(true);
  });

  it('hasAnyCompany devuelve false cuando count = 0', async () => {
    mockHandler(() => [{ count: 0 }]);
    expect(await repo.hasAnyCompany()).toBe(false);
  });
});
