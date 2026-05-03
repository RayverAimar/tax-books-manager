import type { ColumnDef } from '@tanstack/react-table';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SALES_TABLE_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
import { formatDate } from '@/shared/lib/formatters/date';
import {
  shouldHighlightColumn,
  getHighlightHeaderClasses,
  getHighlightContentClasses,
  getHighlightCellClasses
} from '@/shared/lib/utils/column-highlighting';
import { useMemo } from 'react';

/**
 * Calculate intelligent column width based on content type
 */
const getColumnWidth = (
  mapping: (typeof SALES_TABLE_COLUMNS_MAPPING)[0]
): number | { min: number; default: number; max: number } => {
  const fieldName = mapping.tsField as string;

  // Dates: reduced width (100px)
  if (mapping.dataType === 'date') {
    return 100;
  }

  // Small fixed codes (70px)
  const smallFixedFields = [
    'voucherType',
    'customerDocType',
    'currency',
    'voucherStatus',
    'modifiedVoucherType',
    'noteType'
  ];
  if (smallFixedFields.includes(fieldName)) {
    return 70;
  }

  // RUC and identity documents (110px)
  if (fieldName === 'taxId' || fieldName === 'customerDocNumber') {
    return 110;
  }

  // Period (80px) - YYYYMM format
  if (fieldName === 'period') {
    return 80;
  }

  // Series and invoice numbers (100px)
  if (
    fieldName === 'voucherSeries' ||
    fieldName === 'voucherNumber' ||
    fieldName === 'voucherEndNumber' ||
    fieldName === 'modifiedVoucherSeries' ||
    fieldName === 'modifiedVoucherNumber'
  ) {
    return 100;
  }

  // CAR SUNAT - wider (150px)
  if (fieldName === 'sunatCorrelative') {
    return 150;
  }

  // Numeric fields (amounts) (120px)
  if (mapping.dataType === 'integer' || mapping.dataType === 'float') {
    return 120;
  }

  // Names and business names - wider (minimum 600px, can grow)
  if (fieldName === 'businessName' || fieldName === 'customerName') {
    return { min: 600, default: 600, max: 1000 };
  }

  // Long text fields (250px)
  if (mapping.sunatHeader && mapping.sunatHeader.length > 20) {
    return 250;
  }

  // Default (150px)
  return 150;
};

/**
 * Hook to generate memoized columns dynamically from table column mapping
 * This ensures ALL columns are displayed in the table (40 SUNAT + 1 calculated)
 * Uses useMemo to prevent recreating 41 column objects on every render
 */
export function useSalesColumns() {
  return useMemo<ColumnDef<SalesInvoice>[]>(() => {
    const columns: ColumnDef<SalesInvoice>[] = [];

    SALES_TABLE_COLUMNS_MAPPING.forEach((mapping) => {
      if (!mapping.tsField) return;

      const columnWidth = getColumnWidth(mapping);

      // Handle both number and object width specifications
      const sizes =
        typeof columnWidth === 'number'
          ? { size: columnWidth, minSize: columnWidth, maxSize: columnWidth }
          : {
              size: columnWidth.default,
              minSize: columnWidth.min,
              maxSize: columnWidth.max
            };

      const fieldName = mapping.tsField as string;
      const isHighlighted = shouldHighlightColumn('sales', fieldName);
      const headerHighlight = getHighlightHeaderClasses(isHighlighted);
      const cellHighlight = getHighlightCellClasses(isHighlighted, fieldName);

      const column: ColumnDef<SalesInvoice> = {
        accessorKey: mapping.tsField,
        ...sizes,
        meta: {
          headerClassName: headerHighlight.className,
          headerStyle: headerHighlight.style,
          cellClassName: cellHighlight.className,
          cellStyle: cellHighlight.style,
          dataType: mapping.dataType // Add dataType for validation
        },
        header: ({ column }) => {
          const isSorted = column.getIsSorted();

          return (
            <button
              onClick={() => {
                // Cycle through: none -> asc -> desc -> none
                if (!isSorted) {
                  column.toggleSorting(false); // Sort ascending
                } else if (isSorted === 'asc') {
                  column.toggleSorting(true); // Sort descending
                } else {
                  column.clearSorting(); // Clear sorting
                }
              }}
              className={`inline-flex h-full w-full items-center justify-center whitespace-normal px-1 py-0 text-xs
                leading-tight transition-all hover:bg-primary-foreground/10
                hover:backdrop-brightness-110 ${isHighlighted ? 'text-yellow-50' : 'text-primary-foreground'}`}
            >
              <span className="block text-center">
                {'sunatHeader' in mapping ? mapping.sunatHeader : mapping.displayLabel}
              </span>
              {!isSorted && <ArrowUpDown className="ml-1 h-3 w-3 flex-shrink-0 opacity-50" />}
              {isSorted === 'asc' && <ArrowUp className="ml-1 h-3 w-3 flex-shrink-0" />}
              {isSorted === 'desc' && <ArrowDown className="ml-1 h-3 w-3 flex-shrink-0" />}
            </button>
          );
        },
        cell: ({ row }) => {
          const value = row.getValue(mapping.tsField as string);
          const contentClasses = getHighlightContentClasses(isHighlighted);

          // If value is null or undefined, render blank space
          if (value === null || value === undefined) {
            return <div className={`text-xs ${contentClasses}`}></div>;
          }

          // Format dates as DD/MM/YYYY
          if (mapping.dataType === 'date') {
            return (
              <div className={`text-xs ${contentClasses}`}>
                {formatDate(value as Date | string)}
              </div>
            );
          }

          // Format percentage (% IGV) - show as "18%" not "18.00"
          if (mapping.tsField === 'vatPercentage') {
            const numValue = typeof value === 'number' ? value : Number(value);
            if (isNaN(numValue)) {
              return <div className={`text-xs ${contentClasses}`}></div>;
            }
            return <div className={`text-xs ${contentClasses}`}>{numValue}%</div>;
          }

          // Format Tipo Cambio - 3 decimals (1.000)
          if (mapping.tsField === 'exchangeRate') {
            const numValue = typeof value === 'number' ? value : Number(value);
            if (isNaN(numValue)) {
              return <div className={`text-xs ${contentClasses}`}></div>;
            }
            return <div className={`text-xs ${contentClasses}`}>{numValue.toFixed(3)}</div>;
          }

          // Format INTEGER - no decimals
          if (mapping.dataType === 'integer') {
            const numValue = typeof value === 'number' ? value : Number(value);
            if (isNaN(numValue)) {
              return <div className={`text-xs ${contentClasses}`}></div>;
            }
            return <div className={`text-xs ${contentClasses}`}>{numValue}</div>;
          }

          // Format FLOAT - 2 decimals
          if (mapping.dataType === 'float') {
            const numValue = typeof value === 'number' ? value : Number(value);
            if (isNaN(numValue)) {
              return <div className={`text-xs ${contentClasses}`}></div>;
            }
            return <div className={`text-xs ${contentClasses}`}>{numValue.toFixed(2)}</div>;
          }

          // Render value as string
          return <div className={`text-xs ${contentClasses}`}>{String(value)}</div>;
        }
      };

      columns.push(column);
    });

    // Reorder: Move vatPercentage to be right before vatAmount (IGV / IPM)
    const vatPercentageIndex = columns.findIndex(col =>
      'accessorKey' in col && col.accessorKey === 'vatPercentage'
    );
    const vatAmountIndex = columns.findIndex(col =>
      'accessorKey' in col && col.accessorKey === 'vatAmount'
    );

    if (vatPercentageIndex !== -1 && vatAmountIndex !== -1 && vatPercentageIndex !== vatAmountIndex - 1) {
      // Remove vatPercentage from its current position
      const [vatPercentageColumn] = columns.splice(vatPercentageIndex, 1);

      // Find new position of vatAmount after removal
      const newVatAmountIndex = columns.findIndex(col =>
        'accessorKey' in col && col.accessorKey === 'vatAmount'
      );

      // Insert vatPercentage right before vatAmount
      columns.splice(newVatAmountIndex, 0, vatPercentageColumn);
    }

    return columns;
  }, []); // No dependencies - columns are static
}
