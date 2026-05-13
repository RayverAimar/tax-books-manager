import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PeriodProvider, usePeriod } from '../period.context';
import { initTestDb, mockHandler } from '@/test/helpers/repo';

function Probe({ probe }: { probe: (ctx: ReturnType<typeof usePeriod>) => void }) {
  const ctx = usePeriod();
  probe(ctx);
  return <div data-testid="period">{ctx.selectedPeriod ?? 'none'}</div>;
}

describe('PeriodProvider', () => {
  beforeEach(async () => {
    await initTestDb();
    localStorage.clear();
  });

  it('usePeriod fuera del provider lanza', () => {
    expect(() => render(<Probe probe={() => undefined} />)).toThrow(/PeriodProvider/);
  });

  it('lee periodo desde localStorage al inicializar', async () => {
    localStorage.setItem('selected_period', '202412');
    render(
      <PeriodProvider>
        <Probe probe={() => undefined} />
      </PeriodProvider>
    );
    await waitFor(() => expect(screen.getByTestId('period').textContent).toBe('202412'));
  });

  it('loadPeriod consulta repos y actualiza estado', async () => {
    mockHandler((sql) => {
      if (sql.startsWith('SELECT code')) return [];
      return [];
    });
    let ctx: ReturnType<typeof usePeriod> | undefined;
    render(
      <PeriodProvider>
        <Probe
          probe={(c) => {
            ctx = c;
          }}
        />
      </PeriodProvider>
    );
    await waitFor(() => ctx !== undefined);
    await act(async () => {
      await ctx!.loadPeriod('202401', 1);
    });
    expect(ctx?.selectedPeriod).toBe('202401');
    expect(ctx?.period?.salesDeclared).toBe(false);
  });

  it('toggleDeclared actualiza estado optimistamente', async () => {
    localStorage.setItem('selected_period', '202401');
    mockHandler(() => ({ rowsAffected: 1 }));
    let ctx: ReturnType<typeof usePeriod> | undefined;
    render(
      <PeriodProvider>
        <Probe
          probe={(c) => {
            ctx = c;
          }}
        />
      </PeriodProvider>
    );
    await waitFor(() => expect(ctx?.period).toBeDefined());
    await act(async () => {
      await ctx!.toggleDeclared(1, 'sales');
    });
    expect(ctx?.period?.salesDeclared).toBe(true);
  });

  it('clearPeriod borra el periodo', async () => {
    localStorage.setItem('selected_period', '202401');
    let ctx: ReturnType<typeof usePeriod> | undefined;
    render(
      <PeriodProvider>
        <Probe
          probe={(c) => {
            ctx = c;
          }}
        />
      </PeriodProvider>
    );
    await waitFor(() => expect(ctx?.period).toBeDefined());
    act(() => ctx!.clearPeriod());
    expect(ctx?.period).toBeNull();
  });
});
