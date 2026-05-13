/**
 * Centralized column highlighting logic
 * Defines which columns should be highlighted in sales and purchases tables
 *
 * Color Scheme:
 * - Headers/Footers: Uniform blue (#0077aa) for all highlighted columns
 * - Cells: Yellow (#ffff33) for most columns, Orange (#ff9933) for `% IGV` column
 * - Content: Dark gray text with semibold weight for highlighted cells
 */

import { HIGHLIGHT_COLORS } from '@/shared/constants/colors';
import type { InvoiceType } from '@/shared/types/invoice.types';

// Sets en lugar de arrays: shouldHighlightColumn corre por celda
// (N filas × ~80 columnas por render). O(1) en lugar de O(k) `.includes`.
const HIGHLIGHTED_COLUMNS: Record<InvoiceType, ReadonlySet<string>> = {
  sales: new Set(['taxableBase', 'vatPercentage', 'vatAmount', 'totalAmount']),
  purchases: new Set(['taxableBaseTaxed', 'vatPercentage', 'vatAmountTaxed', 'nonTaxableValue', 'totalAmount'])
};

/**
 * Special column that uses orange highlighting in cells
 * Note: Headers and footers always use blue regardless of this setting
 */
const ORANGE_HIGHLIGHTED_COLUMN = 'vatPercentage';

/**
 * Check if a column should be highlighted
 *
 * @param type - Invoice type ('sales' or 'purchases')
 * @param fieldName - Field name to check
 * @returns true if the column should be highlighted
 *
 * @example
 * shouldHighlightColumn('sales', 'taxableBase') // true
 * shouldHighlightColumn('sales', 'ruc') // false
 * shouldHighlightColumn('purchases', 'vatAmountTaxed') // true
 */
export function shouldHighlightColumn(type: InvoiceType, fieldName: string): boolean {
  return HIGHLIGHTED_COLUMNS[type].has(fieldName);
}

/**
 * Check if a column should use orange highlighting
 *
 * @param fieldName - Field name to check
 * @returns true if the column should be orange
 */
export function shouldUseOrangeHighlight(fieldName: string): boolean {
  return fieldName === ORANGE_HIGHLIGHTED_COLUMN;
}

/**
 * Get CSS class names and inline styles for highlighted cells
 * Cells use yellow or orange backgrounds depending on the column
 *
 * @param isHighlighted - Whether the cell should be highlighted
 * @param fieldName - Field name to determine color (orange for % IGV, yellow for others)
 * @returns Object with className and style for the cell container
 */
export function getHighlightCellClasses(
  isHighlighted: boolean,
  fieldName?: string
): { className: string; style?: React.CSSProperties } {
  if (isHighlighted) {
    if (fieldName && shouldUseOrangeHighlight(fieldName)) {
      // Orange for % IGV column
      return {
        className: '',
        style: { backgroundColor: HIGHLIGHT_COLORS.CELL_ORANGE }
      };
    }
    // Yellow for other highlighted columns
    return {
      className: '',
      style: { backgroundColor: HIGHLIGHT_COLORS.CELL_YELLOW }
    };
  }
  return { className: '' };
}

/**
 * Get CSS class names for highlighted cell content
 *
 * @param isHighlighted - Whether the cell content should be highlighted
 * @returns Tailwind CSS class names for the cell content
 */
export function getHighlightContentClasses(isHighlighted: boolean): string {
  if (isHighlighted) {
    return `${HIGHLIGHT_COLORS.CELL_TEXT} font-semibold`;
  }
  return '';
}

/**
 * Get CSS class names and inline styles for highlighted headers
 * All highlighted headers use uniform blue color
 *
 * @param isHighlighted - Whether the header should be highlighted
 * @returns Object with className and style for the header
 */
export function getHighlightHeaderClasses(isHighlighted: boolean): { className: string; style?: React.CSSProperties } {
  if (isHighlighted) {
    return {
      className: '',
      style: { backgroundColor: HIGHLIGHT_COLORS.HEADER_FOOTER_BLUE }
    };
  }
  return { className: '' };
}

/**
 * Get CSS class names and inline styles for highlighted footers
 * All highlighted footers use uniform blue color
 *
 * @param isHighlighted - Whether the footer should be highlighted
 * @returns Object with className and style for the footer
 */
export function getHighlightFooterClasses(isHighlighted: boolean): { className: string; style?: React.CSSProperties } {
  if (isHighlighted) {
    return {
      className: '',
      style: { backgroundColor: HIGHLIGHT_COLORS.HEADER_FOOTER_BLUE }
    };
  }
  return { className: '' };
}
