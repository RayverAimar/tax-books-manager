import React, { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { TableFooter, TableRow, TableCell } from '@/shared/components/ui/table';

/**
 * Configuration for footer column totals
 */
export interface FooterTotalConfig {
  /** Column ID to display the total */
  columnId: string;
  /** Label to display (e.g., "TOTAL", "Total registros") */
  label?: string;
  /** Function to calculate the total value from data */
  calculate: (data: unknown[]) => number;
  /** Number of decimal places to show (default: 2) */
  decimals?: number;
}

/**
 * Data Table Footer Props
 */
interface DataTableFooterProps<TData> {
  table: Table<TData>;
  /** Configuration for columns that should display totals */
  totalsConfig?: FooterTotalConfig[];
}

/**
 * Data Table Footer Component
 * Displays table footer with summary information and column totals
 */
export function DataTableFooter<TData>({ table, totalsConfig }: DataTableFooterProps<TData>) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const allColumns = table.getAllColumns();
  const visibleColumns = table.getVisibleLeafColumns();
  const data = table.getFilteredRowModel().rows.map((row) => row.original);

  // If no totals config provided, show simple footer
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

  // Memoize expensive totals calculations - only recalculate when data changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const totalsMap = useMemo(() => {
    const map = new Map<string, { label?: string; value: number; decimals: number }>();

    for (const config of totalsConfig) {
      const total = config.calculate(data);
      map.set(config.columnId, {
        label: config.label,
        value: total,
        decimals: config.decimals ?? 2
      });
    }

    return map;
  }, [data, totalsConfig]);

  return (
    <TableFooter>
      <TableRow className="hover:bg-primary">
        {visibleColumns.map((column, index) => {
          const columnId = column.id;
          const totalInfo = totalsMap.get(columnId);

          // First column (checkbox/select) - empty
          if (index === 0) {
            return <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground"></TableCell>;
          }

          // Second column shows "TOTAL" label
          if (index === 1) {
            return (
              <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                TOTAL
              </TableCell>
            );
          }

          // Third column shows record count
          if (index === 2) {
            return (
              <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                {totalRows.toLocaleString()} registro{totalRows !== 1 ? 's' : ''}
              </TableCell>
            );
          }

          // Columns with totals show calculated values (only if > 0)
          if (totalInfo) {
            // Handle both number and string values
            const numValue = typeof totalInfo.value === 'number' ? totalInfo.value : Number(totalInfo.value);

            // Only display if total is greater than 0
            if (!isNaN(numValue) && numValue > 0) {
              const displayValue = numValue.toFixed(totalInfo.decimals);

              return (
                <TableCell key={columnId} className="text-xs font-semibold text-primary-foreground">
                  {totalInfo.label && <>{totalInfo.label}: </>}
                  {displayValue}
                </TableCell>
              );
            }

            // If total is 0, show empty cell
            return <TableCell key={columnId} className="text-xs text-primary-foreground" />;
          }

          // Empty cells for other columns
          return <TableCell key={columnId} className="text-xs text-primary-foreground" />;
        })}
      </TableRow>
    </TableFooter>
  );
}
