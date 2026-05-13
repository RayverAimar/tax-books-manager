import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CompanyProvider, useCompany, useActiveCompany, useHasCompany } from '../company.context';
import { initTestDb, mockHandler } from '@/test/helpers/repo';
import { aCompany } from '@/test/helpers/factories';

function Probe({ probe }: { probe: (ctx: ReturnType<typeof useCompany>) => void }) {
  const ctx = useCompany();
  probe(ctx);
  return <div data-testid="loaded">{ctx.isLoading ? 'loading' : 'ready'}</div>;
}

describe('CompanyProvider', () => {
  beforeEach(async () => {
    await initTestDb();
    localStorage.clear();
  });

  it('useCompany lanza si no hay provider', () => {
    const ctxValues: ReturnType<typeof useCompany>[] = [];
    expect(() => render(<Probe probe={(c) => ctxValues.push(c)} />)).toThrow(/within CompanyProvider/);
  });

  it('isLoading=true mientras inicializa, luego carga companies', async () => {
    let ctx: ReturnType<typeof useCompany> | undefined;
    mockHandler((sql) => {
      if (/SELECT[\s\S]*FROM companies/i.test(sql))
        return [
          { id: 1, ruc: '12345678903', business_name: 'A', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ];
      return [];
    });
    render(
      <CompanyProvider>
        <Probe
          probe={(c) => {
            ctx = c;
          }}
        />
      </CompanyProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('ready'));
    expect(ctx?.companies).toHaveLength(1);
    // 1 company → auto-select
    expect(ctx?.company?.id).toBe(1);
  });

  it('createCompany agrega y la marca como activa', async () => {
    const companiesInDb: Record<string, unknown>[] = [];
    let nextId = 1;
    mockHandler((sql) => {
      if (sql.startsWith('INSERT INTO companies')) {
        const row = {
          id: nextId++,
          ruc: '12345678903',
          businessName: 'NEW',
          business_name: 'NEW',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };
        companiesInDb.push(row);
        return { lastInsertId: row.id as number, rowsAffected: 1 };
      }
      if (/SELECT[\s\S]*FROM companies/i.test(sql)) return companiesInDb;
      return [];
    });

    let ctx: ReturnType<typeof useCompany> | undefined;
    render(
      <CompanyProvider>
        <Probe
          probe={(c) => {
            ctx = c;
          }}
        />
      </CompanyProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('ready'));
    await act(async () => {
      await ctx!.createCompany('12345678903', 'NEW SAC');
    });
    expect(ctx?.company?.id).toBe(1);
  });
});

describe('useHasCompany / useActiveCompany', () => {
  beforeEach(async () => {
    await initTestDb();
    localStorage.clear();
  });

  function HasCompanyProbe() {
    return <div data-testid="has">{useHasCompany() ? 'yes' : 'no'}</div>;
  }

  function ActiveProbe() {
    return <div>{useActiveCompany().ruc}</div>;
  }

  it('useHasCompany devuelve false sin compañías', async () => {
    mockHandler(() => []);
    render(
      <CompanyProvider>
        <HasCompanyProbe />
      </CompanyProvider>
    );
    await waitFor(() => expect(screen.getByTestId('has').textContent).toBe('no'));
  });

  it('useActiveCompany lanza si no hay activa', async () => {
    mockHandler(() => []);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(
        <CompanyProvider>
          <ActiveProbe />
        </CompanyProvider>
      );
    }).toThrow(/No active company/);
    spy.mockRestore();
  });
});

// Test the factory directly to cover unused branches
describe('aCompany factory', () => {
  it('produce defaults overridables', () => {
    expect(aCompany().ruc).toBeDefined();
    expect(aCompany({ ruc: '11111111111' }).ruc).toBe('11111111111');
  });
});
