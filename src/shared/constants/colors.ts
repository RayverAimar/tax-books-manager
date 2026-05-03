/**
 * Color constants for column highlighting
 * Centralized color definitions to ensure consistency across the application
 */

/**
 * Column highlighting colors
 * Used in data tables for sales and purchases
 */
export const HIGHLIGHT_COLORS = {
  /**
   * Header and footer background color
   * Uniform blue for all highlighted columns
   */
  HEADER_FOOTER_BLUE: '#0077aa',

  /**
   * Cell background colors
   */
  CELL_YELLOW: '#ffff33',  // Default for most highlighted columns
  CELL_ORANGE: '#ff9933',  // Special color for % IGV column

  /**
   * Text color for highlighted cells
   */
  CELL_TEXT: 'text-gray-900'
} as const;
