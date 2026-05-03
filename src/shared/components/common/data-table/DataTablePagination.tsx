import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useCallback } from 'react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

const PAGE_SIZES = [250, 500, 750, 1000] as const;

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  // Get pagination state
  const paginationState = table.getState().pagination;

  // Get row models - these update automatically when data changes
  const filteredRows = table.getFilteredRowModel();
  const coreRows = table.getCoreRowModel();

  // Calculate total rows - this will update when data changes
  const totalRows = filteredRows?.rows?.length ?? coreRows?.rows?.length ?? 0;
  const pageSize = paginationState.pageSize;

  // Calculate page count
  const tablePageCount = table.getPageCount();
  const calculatedPageCount = Math.ceil(totalRows / pageSize) || 1;
  const pageCount = tablePageCount > 0 ? tablePageCount : calculatedPageCount;

  // Get navigation state
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();

  // Calculate the range of rows being displayed
  const startRow = totalRows === 0 ? 0 : paginationState.pageIndex * pageSize + 1;
  const endRow = Math.min((paginationState.pageIndex + 1) * pageSize, totalRows);

  // Memoize event handlers
  const handlePageSizeChange = useCallback(
    (value: string) => {
      if (value === 'all') {
        // Set page size to total rows to show all
        table.setPageSize(totalRows);
      } else {
        table.setPageSize(Number(value));
      }
    },
    [table, totalRows]
  );

  const handleFirstPage = useCallback(() => {
    table.setPageIndex(0);
  }, [table]);

  const handlePreviousPage = useCallback(() => {
    table.previousPage();
  }, [table]);

  const handleNextPage = useCallback(() => {
    table.nextPage();
  }, [table]);

  const handleLastPage = useCallback(() => {
    table.setPageIndex(pageCount - 1);
  }, [table, pageCount]);

  return (
    <div className="flex items-center justify-between px-2 py-1">
      {/* Records counter at bottom left */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-muted-foreground">
          <span className="font-bold text-foreground">{totalRows}</span> registros
        </span>
        {totalRows > 0 && (
          <span className="text-sm text-muted-foreground">
            (Mostrando {startRow} a {endRow})
          </span>
        )}
      </div>

      {/* Pagination controls at bottom right */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Filas por página</p>
          <Select
            value={pageSize >= totalRows ? 'all' : `${paginationState.pageSize}`}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue placeholder={paginationState.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
              {totalRows > 0 && (
                <SelectItem value="all">
                  Todos ({totalRows})
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {paginationState.pageIndex + 1} de {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={handleFirstPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Ir a la primera página</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handlePreviousPage} disabled={!canPreviousPage}>
            <span className="sr-only">Página anterior</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handleNextPage} disabled={!canNextPage}>
            <span className="sr-only">Página siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={handleLastPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">Ir a la última página</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
