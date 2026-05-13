import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState
} from '@tanstack/react-table';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DevProfiler } from '@/shared/lib/utils/perf-debug';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTableFooter, type FooterTotalConfig } from './DataTableFooter';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { formatDate } from '@/shared/lib/formatters/date';
import { showError } from '@/shared/lib/utils/toast';
import { validateInteger, validateFloat, validateDate } from '@/shared/lib/validators/data-type.validators';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
  onDiscardSelected?: () => void;
  enableSelection?: boolean;
  onCellEdit?: (rowId: number, columnId: string, newValue: unknown) => Promise<void>;
  editableColumns?: string[]; // Optional: list of editable column IDs, if not provided all are editable except 'select'
  totalsConfig?: FooterTotalConfig[]; // Optional: configuration for footer column totals
  /** Override del overscan automático. Solo uso dev (perf harness). */
  overscanOverride?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  onSelectionChange,
  onDiscardSelected,
  enableSelection = true,
  onCellEdit,
  editableColumns,
  totalsConfig,
  overscanOverride
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingCell, setEditingCell] = useState<{ rowId: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [originalEditValue, setOriginalEditValue] = useState<string>('');
  const [editingDataType, setEditingDataType] = useState<'string' | 'integer' | 'float' | 'date'>('string');
  const [isSaving, setIsSaving] = useState(false);

  const selectionColumn: ColumnDef<TData, unknown> = useMemo(
    () => ({
      id: 'select',
      header: ({ table }) => (
        <div className="flex h-full items-center justify-center px-1">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="border-white bg-white/20 data-[state=checked]:bg-white data-[state=checked]:text-primary"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-1">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false
    }),
    []
  );

  const tableColumns = useMemo(() => {
    if (enableSelection) {
      return [selectionColumn, ...columns];
    }
    return columns;
  }, [columns, enableSelection, selectionColumn]);

  // Reset row selection when data changes completely (e.g., after import)
  useEffect(() => {
    setRowSelection({});
  }, [data]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection
    },
    enableRowSelection: true,
    // getRowId estable: cuando ordenamos/filtramos, los rowSelection keys siguen
    // refiriéndose a la misma fila (no al índice). Sin esto, ordenar invalida
    // toda la selección y obliga a remount.
    getRowId: (row) => String((row as { id?: number | string }).id ?? ''),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onSelectionChange) {
        const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
        // Con getRowId estable, las keys de newSelection son los row.id originales.
        const selectedSet = new Set(Object.keys(newSelection).filter((k) => newSelection[k]));
        const selectedRows = data.filter((d) => selectedSet.has(String((d as { id?: number | string }).id ?? '')));
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 60,
      maxSize: 800
    }
  });

  const handleRowClick = useCallback(
    (rowData: TData) => {
      onRowClick?.(rowData);
    },
    [onRowClick]
  );

  const handleCellDoubleClick = useCallback(
    (rowId: number, columnId: string, currentValue: unknown, columnMeta?: Record<string, unknown>) => {
      if (!onCellEdit) return;
      if (columnId === 'select') return;
      if (editableColumns && !editableColumns.includes(columnId)) return;

      setEditingCell({ rowId, columnId });

      const dataType = (columnMeta?.dataType as 'string' | 'integer' | 'float' | 'date' | undefined) || 'string';
      setEditingDataType(dataType);

      if (currentValue === null || currentValue === undefined) {
        setEditValue('');
        setOriginalEditValue('');
        return;
      }

      if (dataType === 'date') {
        const formattedDate = formatDate(currentValue as Date | string);
        setEditValue(formattedDate);
        setOriginalEditValue(formattedDate);
      } else {
        const stringValue = String(currentValue);
        setEditValue(stringValue);
        setOriginalEditValue(stringValue);
      }
    },
    [onCellEdit, editableColumns]
  );

  const handleCellEditSave = useCallback(async () => {
    if (!editingCell || !onCellEdit || isSaving) return;

    setIsSaving(true);
    try {
      if (editValue.trim() === '') {
        await onCellEdit(editingCell.rowId, editingCell.columnId, null);
        setEditingCell(null);
        setEditValue('');
        setOriginalEditValue('');
        setEditingDataType('string');
        setIsSaving(false);
        return;
      }

      let parsedValue: unknown;
      let validationResult;

      switch (editingDataType) {
        case 'integer': {
          validationResult = validateInteger(editValue, { allowNull: false });
          if (!validationResult.isValid) {
            showError('Número entero inválido', {
              description: validationResult.errorMessage || 'Por favor, ingrese un número entero válido sin decimales.'
            });
            setEditValue(originalEditValue);
            setIsSaving(false);
            return;
          }
          parsedValue = validationResult.sanitizedValue;
          break;
        }

        case 'float': {
          validationResult = validateFloat(editValue, { allowNull: false, decimals: 2 });
          if (!validationResult.isValid) {
            showError('Número decimal inválido', {
              description: validationResult.errorMessage || 'Por favor, ingrese un número decimal válido.'
            });
            setEditValue(originalEditValue);
            setIsSaving(false);
            return;
          }
          parsedValue = validationResult.sanitizedValue;
          break;
        }

        case 'date': {
          validationResult = validateDate(editValue, { allowNull: false });
          if (!validationResult.isValid) {
            showError('Fecha inválida', {
              description: validationResult.errorMessage || 'Por favor, use el formato DD/MM/YYYY con valores válidos.'
            });
            setEditValue(originalEditValue);
            setIsSaving(false);
            return;
          }
          const dateObj = validationResult.sanitizedValue as Date;
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          parsedValue = `${year}-${month}-${day}`;
          break;
        }

        case 'string':
        default:
          parsedValue = editValue;
          break;
      }

      await onCellEdit(editingCell.rowId, editingCell.columnId, parsedValue);
      setEditingCell(null);
      setEditValue('');
      setOriginalEditValue('');
      setEditingDataType('string');
    } catch {
      // Keep editing mode open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  }, [editingCell, editValue, originalEditValue, editingDataType, onCellEdit, isSaving]);

  const handleCellEditCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setOriginalEditValue('');
    setEditingDataType('string');
  }, []);

  const handleCellEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCellEditSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCellEditCancel();
      }
    },
    [handleCellEditSave, handleCellEditCancel]
  );

  const rows = table.getRowModel().rows;

  // Virtualización: solo renderizamos las filas visibles + un buffer arriba/abajo.
  // El cuello medido a 500 filas × 51 cols era ~880ms/sort. La causa raíz: 25k
  // celdas DOM montadas. Virtualizando bajamos a ~30 filas × 51 cols = 1500
  // celdas. El padding-row pattern mantiene <table> semantics y sticky header.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT_ESTIMATE = 28; // text-xs + py-0.5 + border-b ≈ 28px
  // Overscan 10: mejor balance medido en ambos engines.
  //
  // Sweep empírico (Chromium harness, 500 filas, ms wall clock):
  //   overscan 1:   sort 59-76,  selectAll 83,  scroll5000 55,  DOM 27 filas
  //   overscan 10:  sort 80-102, selectAll 122, scroll5000 86,  DOM 36 filas ← elegido
  //   overscan 30:  sort 108-148, selectAll 317, scroll5000 133, DOM 56 filas
  //   overscan 100: sort 230-389, selectAll 775, scroll5000 312, DOM 126 filas
  //
  // Mismo patrón en WKWebView (Mac): subir overscan empeora linealmente todo.
  // El costo de DOM extra escala más rápido que el beneficio de buffer.
  //
  // 10 es el sweet spot: ~280px de buffer (5 filas arriba + 5 abajo) cubre
  // scroll suave con rueda (3-4 frames de gracia). Para jump scroll grande
  // hay ~50-80ms de blanks por 1 frame — aceptable vs el costo de mantener
  // 2-3× más DOM en todos los demás casos.
  const OVERSCAN = overscanOverride ?? 10;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: OVERSCAN
  });
  const measuredVirtualRows = virtualizer.getVirtualItems();
  // Fallback: si el virtualizer aún no midió el contenedor (jsdom en tests,
  // primer render antes del layout en prod), rendereamos todas las filas
  // sin offsets. En prod-runtime real este array se sobreescribe en el
  // siguiente render con la ventana virtualizada.
  const virtualRows =
    measuredVirtualRows.length > 0 || rows.length === 0
      ? measuredVirtualRows
      : rows.map((_, index) => ({ index, start: 0, end: 0, key: index, size: 0, lane: 0 }));
  const totalHeight = virtualizer.getTotalSize();
  const useVirtualOffsets = measuredVirtualRows.length > 0;
  const paddingTop = useVirtualOffsets ? virtualRows[0].start : 0;
  const paddingBottom = useVirtualOffsets ? totalHeight - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div className="flex h-full flex-col">
      <DevProfiler id="DataTableToolbar">
        <DataTableToolbar
          table={table}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          selectedRows={Object.keys(rowSelection).length}
          onDiscardSelected={onDiscardSelected}
        />
      </DevProfiler>

      {/* min-h-0 es CRÍTICO: sin esto, flex-1 + overflow-y-auto crece al tamaño
          del contenido (todas las filas) → virtualizer mide full-height y no
          virtualiza. Con min-h-0 el contenedor se constrain a la altura
          disponible del flex parent, scroll se activa, virtualizer trabaja. */}
      <div ref={scrollContainerRef} className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-scroll rounded-md border">
        {/* Profiler dev-only del árbol completo de la tabla — actualDuration aquí
            incluye header + body + footer. Para descomponer, hay un Profiler
            adicional dentro de DataTableFooter con id="DataTableFooter". */}
        <DevProfiler id="DataTable">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-primary">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="!hover:bg-primary hover:!bg-primary">
                  {headerGroup.headers.map((header) => {
                    const isSelectionColumn = header.column.id === 'select';
                    const meta = header.column.columnDef.meta as {
                      headerClassName?: string;
                      headerStyle?: React.CSSProperties;
                    };
                    const headerClassName = meta?.headerClassName || '';
                    const headerStyle = meta?.headerStyle;
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize(), ...headerStyle }}
                        className={cn(
                          'whitespace-nowrap p-0',
                          isSelectionColumn &&
                            'sticky left-0 z-[15] bg-primary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
                          headerClassName
                        )}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                <>
                  {/* Spacer top: ocupa el espacio de las filas no renderizadas arriba */}
                  {paddingTop > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={tableColumns.length} style={{ height: paddingTop, padding: 0, border: 'none' }} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        onClick={() => handleRowClick(row.original)}
                        // content-visibility: auto → el navegador saltea layout/paint de filas
                        // fuera del viewport. Crítico con 100-500 filas × 80 columnas:
                        // sin esto, abrir un dialog dispara recalc de layout sobre todas
                        // las celdas detrás (1.2s observado en Safari Web Inspector).
                        // contain-intrinsic-size: hint inicial de altura (~28px) para evitar
                        // flicker antes de que el navegador mida la fila real.
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/50',
                          '[content-visibility:auto] [contain-intrinsic-size:auto_28px]'
                        )}
                        style={{
                          backgroundColor: row.getIsSelected() ? 'rgb(186, 230, 253)' : undefined
                        }}
                        onMouseEnter={(e) => {
                          if (row.getIsSelected()) {
                            e.currentTarget.style.backgroundColor = 'rgb(125, 211, 252)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (row.getIsSelected()) {
                            e.currentTarget.style.backgroundColor = 'rgb(186, 230, 253)';
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isSelectionColumn = cell.column.id === 'select';
                          const rowData = row.original as { id?: number };
                          const rowId = (rowData.id as number) || (row.id as unknown as number);
                          const columnId = cell.column.id;
                          const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId;
                          const cellMeta = cell.column.columnDef.meta as {
                            cellClassName?: string;
                            cellStyle?: React.CSSProperties;
                          };
                          const cellClassName = cellMeta?.cellClassName || '';
                          const cellStyle = cellMeta?.cellStyle;

                          return (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                backgroundColor:
                                  isSelectionColumn && row.getIsSelected() ? 'rgb(186, 230, 253)' : undefined,
                                position: isEditing ? 'relative' : undefined,
                                ...cellStyle
                              }}
                              className={cn(
                                'overflow-visible whitespace-nowrap',
                                isSelectionColumn && 'sticky left-0 z-[5] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
                                isSelectionColumn && !row.getIsSelected() && 'bg-background',
                                cellClassName
                              )}
                              onDoubleClick={(e) => {
                                if (!isSelectionColumn) {
                                  e.stopPropagation();
                                  const cellValue = cell.getValue();
                                  handleCellDoubleClick(
                                    rowId,
                                    columnId,
                                    cellValue,
                                    cell.column.columnDef.meta as Record<string, unknown> | undefined
                                  );
                                }
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleCellEditKeyDown}
                                  onBlur={handleCellEditCancel}
                                  onClick={(e) => e.currentTarget.select()}
                                  autoFocus
                                  disabled={isSaving}
                                  className={
                                    'absolute inset-0 w-full h-full px-1 py-0.5 text-xs ' +
                                    'border-2 border-primary focus:outline-none box-border'
                                  }
                                  style={{ margin: 0 }}
                                />
                              ) : (
                                flexRender(cell.column.columnDef.cell, cell.getContext())
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {/* Spacer bottom: ocupa el espacio de las filas no renderizadas abajo */}
                  {paddingBottom > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={tableColumns.length} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
                    </tr>
                  )}
                </>
              ) : (
                <>
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No se encontraron resultados.
                    </TableCell>
                  </TableRow>
                  <tr style={{ height: '100%' }}>
                    <td colSpan={tableColumns.length} style={{ padding: 0, border: 'none' }} />
                  </tr>
                </>
              )}
            </TableBody>
            <DataTableFooter table={table} totalsConfig={totalsConfig} />
          </Table>
        </DevProfiler>
      </div>
    </div>
  );
}
