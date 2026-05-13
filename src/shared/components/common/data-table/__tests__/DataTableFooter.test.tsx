import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableFooter, type FooterTotalConfig } from '../DataTableFooter';

function makeTable(rowOriginals: unknown[], columnIds: string[]) {
  return {
    getFilteredRowModel: () => ({ rows: rowOriginals.map((o) => ({ original: o })) }),
    getAllColumns: () => columnIds.map((id) => ({ id })),
    getVisibleLeafColumns: () => columnIds.map((id) => ({ id }))
  } as unknown as Parameters<typeof DataTableFooter>[0]['table'];
}

// TanStack Table memoizes getFilteredRowModel() — rows reference is stable across renders
// when filter state doesn't change. This mock mimics that to expose the real bug:
// even with stable rows, the footer used to `.map(r => r.original)` on every render,
// breaking useMemo's cache.
function makeStableTable(rowOriginals: unknown[], columnIds: string[]) {
  const rows = rowOriginals.map((o) => ({ original: o }));
  const filteredRowModel = { rows };
  return {
    getFilteredRowModel: () => filteredRowModel,
    getAllColumns: () => columnIds.map((id) => ({ id })),
    getVisibleLeafColumns: () => columnIds.map((id) => ({ id }))
  } as unknown as Parameters<typeof DataTableFooter>[0]['table'];
}

describe('DataTableFooter', () => {
  it('muestra mensaje cuando no hay datos y no hay totalsConfig', () => {
    render(<DataTableFooter table={makeTable([], ['a'])} />);
    expect(screen.getByText('No hay registros para mostrar')).toBeInTheDocument();
  });

  it('muestra count cuando hay datos sin totalsConfig', () => {
    render(<DataTableFooter table={makeTable([{}, {}], ['a'])} />);
    expect(screen.getByText(/2 registros en total/)).toBeInTheDocument();
  });

  it('muestra TOTAL y suma calculada cuando hay totalsConfig', () => {
    const data = [{ amount: 100 }, { amount: 50 }];
    const cfg: FooterTotalConfig[] = [
      { columnId: 'amount', calculate: (rows) => (rows as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0) }
    ];
    render(<DataTableFooter table={makeTable(data, ['select', 'col1', 'recordCount', 'amount'])} totalsConfig={cfg} />);
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    expect(screen.getByText('150.00')).toBeInTheDocument();
  });

  // Regression: footer used to recompute totals on every parent re-render because
  // `data = rows.map(r => r.original)` created a fresh array, breaking useMemo's
  // dependency cache. With many rows + many parent state changes (e.g. header
  // buttons toggling isImporting/isExporting), this caused multi-second lag.
  it('REGRESIÓN: no recomputa calculate() cuando las filas son estables entre re-renders', () => {
    let calcCount = 0;
    const cfg: FooterTotalConfig[] = [
      {
        columnId: 'amount',
        calculate: (rows) => {
          calcCount++;
          return (rows as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0);
        }
      }
    ];
    const stableTable = makeStableTable(
      [{ amount: 100 }, { amount: 50 }],
      ['select', 'col1', 'recordCount', 'amount']
    );

    function Wrapper() {
      const [, setN] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setN((x) => x + 1)}>
            bump
          </button>
          <DataTableFooter table={stableTable} totalsConfig={cfg} />
        </>
      );
    }

    render(<Wrapper />);
    const initial = calcCount;
    expect(initial).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('bump'));
    fireEvent.click(screen.getByText('bump'));
    fireEvent.click(screen.getByText('bump'));

    // After fix: useMemo cache hits because rows reference is stable.
    // Before fix: count would be initial + 3 (one per re-render).
    expect(calcCount).toBe(initial);
  });
});
