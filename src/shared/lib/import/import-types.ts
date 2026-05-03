/**
 * Shared types for import operations
 */

/**
 * Import result
 */
export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

/**
 * Import options for configuring import behavior
 */
export interface ImportOptions {
  delimiter?: string;
  requiredColumns?: string[];
  dateColumns?: string[];
  numberColumns?: string[];
  skipEmptyRows?: boolean;
}
