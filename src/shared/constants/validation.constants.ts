/**
 * Validation Constants
 * SUNAT (Peru) document validation rules
 */

/**
 * RUC (Registro Único de Contribuyentes) validation
 * Peru tax ID for companies
 */
export const RUC_LENGTH = 11;
export const RUC_PATTERN = /^\d{11}$/;

/**
 * DNI (Documento Nacional de Identidad) validation
 * Peru national ID for individuals
 */
export const DNI_LENGTH = 8;
export const DNI_PATTERN = /^\d{8}$/;

/**
 * Business operational constants
 * Used for period validation and year selector generation
 */
export const BUSINESS = {
  // Business start date (when operations began)
  START_YEAR: 2024,
  START_MONTH: 8, // August 2024
} as const;

/**
 * Field length limits for database operations
 * Prevents buffer overflow and ensures data integrity
 */
export const FIELD_LENGTH_LIMITS = {
  // Company/Person names
  BUSINESS_NAME: 500,
  CUSTOMER_NAME: 500,
  SUPPLIER_NAME: 500,

  // Document identifiers
  SERIES: 20,
  NUMBER: 20,

  // Addresses
  ADDRESS: 500,

  // Free-use codes (CLU)
  CLU_CODE: 100,

  // General text fields
  SHORT_TEXT: 100,
  MEDIUM_TEXT: 500,
  LONG_TEXT: 1000
} as const;

/**
 * Validation helper functions
 */

/**
 * Validates if a string is a valid RUC
 * @param ruc - RUC string to validate
 * @returns true if valid, false otherwise
 */
export function isValidRUC(ruc: string | null | undefined): boolean {
  if (!ruc) return false;
  return RUC_PATTERN.test(ruc);
}

/**
 * Validates if a string is a valid DNI
 * @param dni - DNI string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDNI(dni: string | null | undefined): boolean {
  if (!dni) return false;
  return DNI_PATTERN.test(dni);
}

/**
 * Validates if a string exceeds maximum length
 * @param value - String to validate
 * @param maxLength - Maximum allowed length
 * @returns true if valid (within limit), false if exceeds
 */
export function isValidLength(value: string | null | undefined, maxLength: number): boolean {
  if (!value) return true; // null/undefined are valid (optional fields)
  return value.length <= maxLength;
}

/**
 * Truncates a string to maximum length
 * @param value - String to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated string or original if within limit
 */
export function truncateToLength(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength);
}

/**
 * Sanitizes a string by trimming whitespace
 * @param value - String to sanitize
 * @returns Trimmed string or null if empty
 */
export function sanitizeString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
