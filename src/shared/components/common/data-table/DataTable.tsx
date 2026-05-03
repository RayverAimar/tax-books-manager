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
import { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTableFooter, type FooterTotalConfig } from './DataTableFooter';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { formatDate } from '@/shared/lib/formatters/date';
import { showError } from '@/shared/lib/utils/toast';
import { validateInteger, validateFloat, validateDate } from '@/shared/lib/validators/data-type.validators';

// Virtualization threshold: Enable when row count exceeds this number
const VIRTUALIZATION_THRESHOLD = 500;

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
}

function DataTableComponent<TData, TValue>({
  columns,
  data,
  onRowClick,
  onSelectionChange,
  onDiscardSelected,
  enableSelection = true,
  onCellEdit,
  editableColumns,
  totalsConfig
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingCell, setEditingCell] = useState<{ rowId: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [originalEditValue, setOriginalEditValue] = useState<string>(''); // Store original value for rollback
  // Track data type being edited
  const [editingDataType, setEditingDataType] = useState<'string' | 'integer' | 'float' | 'date'>('string');
  const [isSaving, setIsSaving] = useState(false);

  // Create selection column
  const selectionColumn: ColumnDef<TData, any> = useMemo(
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
            onClick={(e) => e.stopPropagation()} // Prevent row click when checking
          />
        </div>
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false
    }),
    []
  );

  // Combine columns with selection column
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      // Call onSelectionChange callback with selected rows
      if (onSelectionChange) {
        const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
        const selectedRows = data.filter((_, index) => newSelection[index]);
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


  // Memoize row click handler to prevent recreating on every render
  const handleRowClick = useCallback(
    (rowData: TData) => {
      onRowClick?.(rowData);
    },
    [onRowClick]
  );

  // Cell editing handlers
  const handleCellDoubleClick = useCallback(
    (rowId: number, columnId: string, currentValue: unknown, columnMeta?: Record<string, unknown>) => {
      // Only allow editing if onCellEdit callback is provided
      if (!onCellEdit) return;

      // Don't allow editing the select column
      if (columnId === 'select') return;

      // Check if column is editable (if editableColumns is provided)
      if (editableColumns && !editableColumns.includes(columnId)) return;

      setEditingCell({ rowId, columnId });

      // Get dataType from column metadata (single source of truth)
      const dataType = (columnMeta?.dataType as 'string' | 'integer' | 'float' | 'date' | undefined) || 'string';
      setEditingDataType(dataType);

      // Convert value to string for input
      if (currentValue === null || currentValue === undefined) {
        setEditValue('');
        setOriginalEditValue('');
        return;
      }

      // Format value based on data type
      if (dataType === 'date') {
        // Format date as DD/MM/YYYY for editing
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
      // Handle empty values
      if (editValue.trim() === '') {
        await onCellEdit(editingCell.rowId, editingCell.columnId, null);
        setEditingCell(null);
        setEditValue('');
        setOriginalEditValue('');
        setEditingDataType('string');
        setIsSaving(false);
        return;
      }

      // Validate based on data type
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

          // Convert to YYYY-MM-DD (ISO format) for storage
          // validateDate returns a Date object, not a string
          const dateObj = validationResult.sanitizedValue as Date;
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          parsedValue = `${year}-${month}-${day}`;
          break;
        }

        case 'string':
        default: {
          // No validation for strings, accept as-is
          parsedValue = editValue;
          break;
        }
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

  const handleCellEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellEditCancel();
    }
  }, [handleCellEditSave, handleCellEditCancel]);

  // Get rows from table
  const rows = table.getRowModel().rows;

  // Ref for the scrolling container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Enable virtualization for large datasets (>500 rows)
  const enableVirtualization = rows.length > VIRTUALIZATION_THRESHOLD;


  // Setup virtualizer for large datasets
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 10, // Number of items to render outside visible area
    enabled: enableVirtualization
  });

  // Get virtual items (only when virtualization is enabled)
  const virtualRows = enableVirtualization ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = enableVirtualization ? rowVirtualizer.getTotalSize() : 0;

  return (
    <div className="flex h-full flex-col">
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        selectedRows={Object.keys(rowSelection).length}
        onDiscardSelected={onDiscardSelected}
      />

      <div
        ref={tableContainerRef}
        className="mt-4 flex-1 overflow-y-auto overflow-x-scroll rounded-md border"
      >
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
            {rows?.length ? (
              enableVirtualization ? (
                // VIRTUALIZED RENDERING (>500 rows)
                <>
                  {/* Padding top for virtual scrolling */}
                  {virtualRows.length > 0 && (
                    <tr style={{ height: `${virtualRows[0].start}px` }} />
                  )}

                  {/* Render only visible rows */}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => handleRowClick(row.original)}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
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
                    const rowData = row.original as any;
                    const rowId = rowData.id || row.id;
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
                          isSelectionColumn &&
                            'sticky left-0 z-[5] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
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

                  {/* Padding bottom for virtual scrolling */}
                  {virtualRows.length > 0 && (
                    <tr
                      style={{
                        height: `${totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)}px`
                      }}
                    />
                  )}
                </>
              ) : (
                // NORMAL RENDERING (<=500 rows)
                <>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={() => handleRowClick(row.original)}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
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
                        const rowData = row.original as any;
                        const rowId = rowData.id || row.id;
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
                              isSelectionColumn &&
                                'sticky left-0 z-[5] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]',
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
                  ))}
                  {/* Spacer row to push footer to bottom */}
                  <tr style={{ height: '100%' }}>
                    <td colSpan={tableColumns.length} style={{ padding: 0, border: 'none' }} />
                  </tr>
                </>
              )
            ) : (
              <>
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
                {/* Spacer row to push footer to bottom when no data */}
                <tr style={{ height: '100%' }}>
                  <td colSpan={tableColumns.length} style={{ padding: 0, border: 'none' }} />
                </tr>
              </>
            )}
          </TableBody>
          <DataTableFooter table={table} totalsConfig={totalsConfig} />
        </Table>
      </div>
    </div>
  );
}

// Memoize the entire component to prevent re-renders when parent re-renders
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
