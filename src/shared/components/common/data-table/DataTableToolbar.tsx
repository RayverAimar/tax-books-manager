import React from 'react';
import { Search, X } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

/**
 * Data Table Toolbar Props
 */
interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  selectedRows: number;
  onDiscardSelected?: () => void;
}

/**
 * Data Table Toolbar Component
 * Provides search/filter controls and selection actions
 */
export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  selectedRows,
  onDiscardSelected
}: DataTableToolbarProps<TData>) {
  const isFiltered = globalFilter.length > 0;

  return (
    <div className="flex items-center justify-between gap-4 border-b bg-muted/30 px-4 py-3">
      {/* Left: Search Input */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar en la tabla..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-9"
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalFilter('')}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpiar filtro</span>
            </Button>
          )}
        </div>

        {isFiltered && (
          <Badge variant="secondary" className="gap-1">
            <span className="text-xs">{table.getFilteredRowModel().rows.length} resultados</span>
          </Badge>
        )}
      </div>

      {/* Right: Selection Actions */}
      {selectedRows > 0 && onDiscardSelected && (
        <Button variant="destructive" size="sm" onClick={onDiscardSelected}>
          <X className="mr-2 h-4 w-4" />
          Descartar {selectedRows} registro{selectedRows > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
