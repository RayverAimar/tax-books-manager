import React, { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { TableFooter, TableRow, TableCell } from '@/shared/components/ui/table';
import { DevProfiler } from '@/shared/lib/utils/perf-debug';

export interface FooterTotalConfig {
  columnId: string;
  label?: string;
  calculate: (data: unknown[]) => number;
  decimals?: number;
}

interface DataTableFooterProps<TData> {
  table: Table<TData>;
  totalsConfig?: FooterTotalConfig[];
}

function DataTableFooterInner<TData>({ table, totalsConfig }: DataTableFooterProps<TData>) {
  // TanStack memoiza getFilteredRowModel() — el ref de `rows` solo cambia cuando
  // realmente cambian datos/filtros/orden. Lo usamos como dep estable del useMemo
  // en vez de `.map(r => r.original)` que asignaba un array fresco cada render
  // y rompía el cache → con muchas filas y muchos re-renders del padre (botones
  // del header cambiando isImporting/isExporting/selectedRows) costaba segundos.
  const rows = table.getFilteredRowModel().rows;
  const totalRows = rows.length;
  const allColumns = table.getAllColumns();
  const visibleColumns = table.getVisibleLeafColumns();

  // El ref de `rows` viene memoizado por TanStack — solo cambia cuando cambian
  // filtros/orden/datos. La regla preserve-manual-memoization no puede probarlo
  // estáticamente, pero el test de regresión en __tests__/DataTableFooter.test.tsx
  // verifica en runtime que calculate() no se re-ejecuta entre renders cuando
  // las filas son estables.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const totalsMap = useMemo(() => {
    const map = new Map<string, { label?: string; value: number; decimals: number }>();
    if (!totalsConfig || totalsConfig.length === 0) return map;
    const data = rows.map((row) => row.original);
    for (const config of totalsConfig) {
      const total = config.calculate(data);
      map.set(config.columnId, {
        label: config.label,
        value: total,
        decimals: config.decimals ?? 2
      });
    }
    return map;
  }, [rows, totalsConfig]);
  /* eslint-enable react-hooks/preserve-manual-memoization */

  if (!totalsConfig || totalsConfig.length === 0) {
    return (
      <TableFooter>
        <TableRow>
          <TableCell colSpan={allColumns.length} className="text-center text-xs text-muted-foreground">
            {totalRows === 0 ? (
              'No hay registros para mostrar'
            ) : (
              <>
                {totalRows.toLocaleString()} registro{totalRows !== 1 ? 's' : ''} en total
              </>
            )}
          </TableCell>
        </TableRow>
      </TableFooter>
    );
  }

  return (
    <TableFooter>
      <TableRow className="hover:bg-primary">
        {visibleColumns.map((column, index) => {
          const columnId = column.id;
          const totalInfo = totalsMap.get(columnId);

          if (index === 0) {
            return <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground"></TableCell>;
          }

          if (index === 1) {
            return (
              <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                TOTAL
              </TableCell>
            );
          }

          if (index === 2) {
            return (
              <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                {totalRows.toLocaleString()} registro{totalRows !== 1 ? 's' : ''}
              </TableCell>
            );
          }

          if (totalInfo) {
            const numValue = typeof totalInfo.value === 'number' ? totalInfo.value : Number(totalInfo.value);

            if (!isNaN(numValue) && numValue > 0) {
              const displayValue = numValue.toFixed(totalInfo.decimals);

              return (
                <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                  {totalInfo.label && <>{totalInfo.label}: </>}
                  {displayValue}
                </TableCell>
              );
            }

            return <TableCell key={columnId} className="text-xs text-primary-foreground" />;
          }

          return <TableCell key={columnId} className="text-xs text-primary-foreground" />;
        })}
      </TableRow>
    </TableFooter>
  );
}

export function DataTableFooter<TData>(props: DataTableFooterProps<TData>) {
  return (
    <DevProfiler id="DataTableFooter">
      <DataTableFooterInner {...props} />
    </DevProfiler>
  );
}
