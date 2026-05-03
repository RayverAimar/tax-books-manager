import type { ColumnDef } from '@tanstack/react-table';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PURCHASE_TABLE_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
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
  mapping: (typeof PURCHASE_TABLE_COLUMNS_MAPPING)[0]
): number | { min: number; default: number; max: number } => {
  const fieldName = mapping.tsField as string;

  // Dates: reduced width (100px)
  if (mapping.dataType === 'date') {
    return 100;
  }

  // Small fixed codes (60-80px)
  const smallFixedFields = [
    'voucherType',
    'supplierDocType',
    'customsYear',
    'currency',
    'voucherStatus',
    'modifiedVoucherType',
    'noteType'
  ];
  if (smallFixedFields.includes(fieldName)) {
    return 70;
  }

  // RUC and identity documents (110px)
  if (fieldName === 'taxId' || fieldName === 'supplierDocNumber') {
    return 110;
  }

  // Period (80px) - YYYYMM format
  if (fieldName === 'period') {
    return 80;
  }

  // Series and invoice numbers (100px)
  if (
    fieldName === 'voucherSeries' ||
    fieldName === 'voucherNumberStart' ||
    fieldName === 'voucherNumberEnd' ||
    fieldName === 'modifiedVoucherSeries' ||
    fieldName === 'modifiedVoucherNumber'
  ) {
    return 100;
  }

  // Numeric fields (amounts) (120px)
  if (mapping.dataType === 'integer' || mapping.dataType === 'float') {
    return 120;
  }

  // Names and business names - wider (minimum 600px, can grow)
  if (fieldName === 'supplierName' || fieldName === 'businessName') {
    return { min: 600, default: 600, max: 1000 };
  }

  // Long text fields (250px)
  if (mapping.sunatHeader && mapping.sunatHeader.length > 20) {
    return 250;
  }

  // CLU and other short fields (120px)
  if (fieldName.startsWith('freeUseField')) {
    return 120;
  }

  // Default (150px)
  return 150;
};

/**
 * Hook to generate memoized columns dynamically from table column mapping
 * This ensures ALL columns are displayed in the table (80 SUNAT + 1 calculated)
 * Uses useMemo to prevent recreating 81 column objects on every render
 */
export function usePurchasesColumns() {
  return useMemo<ColumnDef<PurchaseInvoice>[]>(() => {
    const columns: ColumnDef<PurchaseInvoice>[] = [];

    PURCHASE_TABLE_COLUMNS_MAPPING.forEach((mapping) => {
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
      const isHighlighted = shouldHighlightColumn('purchases', fieldName);
      const headerHighlight = getHighlightHeaderClasses(isHighlighted);
      const cellHighlight = getHighlightCellClasses(isHighlighted, fieldName);

      const column: ColumnDef<PurchaseInvoice> = {
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
                leading-tight transition-all hover:bg-primary-foreground/10 hover:backdrop-brightness-110
                ${isHighlighted ? 'text-yellow-50' : 'text-primary-foreground'}`}
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
            return <div className={`text-xs ${contentClasses}`}>{formatDate(value as Date | string)}</div>;
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

    // Reorder: Move vatPercentage to be right before vatAmountTaxed (IGV / IPM DG)
    const vatPercentageIndex = columns.findIndex((col) => 'accessorKey' in col && col.accessorKey === 'vatPercentage');
    const vatAmountTaxedIndex = columns.findIndex(
      (col) => 'accessorKey' in col && col.accessorKey === 'vatAmountTaxed'
    );

    if (vatPercentageIndex !== -1 && vatAmountTaxedIndex !== -1 && vatPercentageIndex !== vatAmountTaxedIndex - 1) {
      // Remove vatPercentage from its current position
      const [vatPercentageColumn] = columns.splice(vatPercentageIndex, 1);

      // Find new position of vatAmountTaxed after removal
      const newVatAmountTaxedIndex = columns.findIndex(
        (col) => 'accessorKey' in col && col.accessorKey === 'vatAmountTaxed'
      );

      // Insert vatPercentage right before vatAmountTaxed
      columns.splice(newVatAmountTaxedIndex, 0, vatPercentageColumn);
    }

    return columns;
  }, []); // No dependencies - columns are static
}
