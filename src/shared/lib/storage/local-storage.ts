/**
 * Local Storage Helper
 *
 * Provides a type-safe interface for localStorage.
 *
 * Strategy:
 * - Read/Write ONLY to localStorage
 * - NO database fallback for active_company_id and selected_period
 * - These values are UI preferences, not critical data
 *
 * Fallback behavior:
 * - active_company_id: If not found, user must select a company (redirect to companies page)
 * - selected_period: If not found, use current period (YYYYMM where MM = current month - 1)
 */

/**
 * Storage keys enum for type safety
 */
export const StorageKeys = {
  ACTIVE_COMPANY_ID: 'active_company_id',
  SELECTED_PERIOD: 'selected_period'
} as const;

type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/**
 * Gets a value from localStorage only
 *
 * @param key - Storage key to retrieve
 * @returns The value from localStorage, null if not found
 */
export function getStorageValue(key: StorageKey): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Sets a value in localStorage only
 *
 * @param key - Storage key to set
 * @param value - Value to store
 */
export function setStorageValue(key: StorageKey, value: string): void {
  localStorage.setItem(key, value);
}

/**
 * Removes a value from localStorage only
 *
 * @param key - Storage key to remove
 */
export function removeStorageValue(key: StorageKey): void {
  localStorage.removeItem(key);
}

/**
 * Calculates the current period (YYYYMM where MM = current month - 1)
 *
 * Examples:
 * - November 2025 → 202510 (October 2025)
 * - January 2026 → 202512 (December 2025)
 *
 * @returns Current period in YYYYMM format
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-11 (0 = January, 11 = December)

  // If current month is January (0), use December of previous year
  if (month === 0) {
    year -= 1;
    month = 11; // December
  } else {
    month -= 1; // Previous month
  }

  // Format as YYYYMM (month is 0-indexed, so add 1)
  const monthStr = String(month + 1).padStart(2, '0');
  return `${year}${monthStr}`;
}

/**
 * Gets the active company ID from localStorage
 *
 * @returns Company ID as number, or null if not found
 */
export function getActiveCompanyId(): number | null {
  const value = getStorageValue(StorageKeys.ACTIVE_COMPANY_ID);
  return value ? parseInt(value, 10) : null;
}

/**
 * Sets the active company ID in localStorage
 *
 * @param companyId - Company ID to save
 */
export function setActiveCompanyId(companyId: number): void {
  setStorageValue(StorageKeys.ACTIVE_COMPANY_ID, companyId.toString());
}

/**
 * Gets the selected period from localStorage
 * If not found, returns the current period (YYYYMM where MM = current month - 1)
 *
 * @returns Period code in YYYYMM format
 */
export function getSelectedPeriod(): string {
  const value = getStorageValue(StorageKeys.SELECTED_PERIOD);
  if (value) {
    return value;
  }

  // Fallback to current period
  const currentPeriod = getCurrentPeriod();
  return currentPeriod;
}

/**
 * Sets the selected period in localStorage
 *
 * @param periodCode - Period code in YYYYMM format
 */
export function setSelectedPeriod(periodCode: string): void {
  setStorageValue(StorageKeys.SELECTED_PERIOD, periodCode);
}

/**
 * Clears all app-specific storage from localStorage
 * Use with caution - only for logout/reset scenarios
 */
export function clearAppStorage(): void {
  removeStorageValue(StorageKeys.ACTIVE_COMPANY_ID);
  removeStorageValue(StorageKeys.SELECTED_PERIOD);
}
