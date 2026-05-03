/**
 * Case Conversion Utilities
 * Converts between camelCase (TypeScript) and snake_case (Database)
 */

/**
 * Converts camelCase to snake_case
 * @example
 * camelToSnake('ruc') // 'ruc'
 * camelToSnake('businessName') // 'business_name'
 * camelToSnake('freeUseField1') // 'free_use_field1'
 * camelToSnake('vatAmount') // 'vat_amount'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts snake_case to camelCase
 * @example
 * snakeToCamel('ruc') // 'ruc'
 * snakeToCamel('business_name') // 'businessName'
 * snakeToCamel('free_use_field1') // 'freeUseField1'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts object keys from camelCase to snake_case
 * Useful for preparing TypeScript objects for database insertion
 *
 * @example
 * objectToSnakeCase({ ruc: '12345678901', businessName: 'ACME' })
 * // { ruc: '12345678901', business_name: 'ACME' }
 */
export function objectToSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

/**
 * Converts object keys from snake_case to camelCase
 * Useful for converting database rows to TypeScript objects
 *
 * @example
 * objectToCamelCase({ ruc: '12345678901', business_name: 'ACME' })
 * // { ruc: '12345678901', businessName: 'ACME' }
 */
export function objectToCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}
