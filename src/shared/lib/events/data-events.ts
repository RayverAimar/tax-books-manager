/**
 * Centralized Data Events System
 *
 * This module provides a type-safe event system for notifying components
 * about data changes (imports, updates, deletes) without tight coupling.
 *
 * Benefits:
 * - Decoupled: Components don't need to know about each other
 * - Type-safe: Full TypeScript support for event details
 * - Performance: No React re-renders, uses browser events
 * - Scalable: Easy to add more event types
 *
 * @example
 * ```typescript
 * // Emit event after import
 * import { emitDataImported } from '@/shared/lib/events/data-events';
 *
 * await saveToDatabase(data);
 * emitDataImported('sales', '202411');
 * ```
 *
 * @example
 * ```typescript
 * // Listen for events
 * import { useDataChangeListener } from '@/shared/lib/events/data-events';
 *
 * useDataChangeListener(() => {
 *   // Refresh data
 *   loadMetrics();
 * });
 * ```
 */

import { useEffect } from 'react';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Event names - centralized constants
 */
export const DATA_EVENTS = {
  /** Fired when invoice data is imported (CSV, TXT, bulk ZIP) */
  DATA_IMPORTED: 'tax-books:data-imported',

  /** Fired when invoice data is deleted */
  DATA_DELETED: 'tax-books:data-deleted',

  /** Fired when invoice data is updated */
  DATA_UPDATED: 'tax-books:data-updated'
} as const;

/**
 * Data import event detail
 */
export interface DataImportedDetail {
  /** Type of invoice data imported */
  type: InvoiceType;

  /** Period code (YYYYMM format) */
  period: string;

  /** Number of records imported */
  recordCount: number;

  /** Import source */
  source: 'single-file' | 'bulk-zip';
}

/**
 * Data deleted event detail
 */
export interface DataDeletedDetail {
  /** Type of invoice data deleted */
  type: InvoiceType;

  /** Period code (YYYYMM format) */
  period: string;

  /** Number of records deleted */
  recordCount: number;
}

/**
 * Data updated event detail
 */
export interface DataUpdatedDetail {
  /** Type of invoice data updated */
  type: InvoiceType;

  /** Period code (YYYYMM format) */
  period: string;

  /** Number of records updated */
  recordCount: number;
}

/**
 * Emit data imported event
 *
 * Call this after successfully importing invoice data to notify
 * other components (like Dashboard) to refresh their metrics.
 *
 * @param type - Invoice type ('sales' or 'purchases')
 * @param period - Period code in YYYYMM format
 * @param recordCount - Number of records imported
 * @param source - Import source ('single-file' or 'bulk-zip')
 *
 * @example
 * ```typescript
 * // After single file import
 * await salesRepo.replacePeriodRecords(companyId, period, data);
 * emitDataImported('sales', '202411', data.length, 'single-file');
 * ```
 *
 * @example
 * ```typescript
 * // After bulk import
 * await importValidatedFiles(files, companyId, decisions);
 * emitDataImported('purchases', '202410', 150, 'bulk-zip');
 * ```
 */
export function emitDataImported(
  type: InvoiceType,
  period: string,
  recordCount: number,
  source: 'single-file' | 'bulk-zip'
): void {
  const detail: DataImportedDetail = {
    type,
    period,
    recordCount,
    source
  };

  window.dispatchEvent(new CustomEvent(DATA_EVENTS.DATA_IMPORTED, { detail }));
}

/**
 * Emit data deleted event
 *
 * @param type - Invoice type
 * @param period - Period code
 * @param recordCount - Number of records deleted
 */
export function emitDataDeleted(type: InvoiceType, period: string, recordCount: number): void {
  const detail: DataDeletedDetail = {
    type,
    period,
    recordCount
  };

  window.dispatchEvent(new CustomEvent(DATA_EVENTS.DATA_DELETED, { detail }));
}

/**
 * Emit data updated event
 *
 * @param type - Invoice type
 * @param period - Period code
 * @param recordCount - Number of records updated
 */
export function emitDataUpdated(type: InvoiceType, period: string, recordCount: number): void {
  const detail: DataUpdatedDetail = {
    type,
    period,
    recordCount
  };

  window.dispatchEvent(new CustomEvent(DATA_EVENTS.DATA_UPDATED, { detail }));
}

/**
 * React hook to listen for data change events
 *
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Use this in components that need to refresh when data changes.
 *
 * @param callback - Function to call when any data change event is fired
 * @param deps - Optional dependency array (like useEffect)
 *
 * @example
 * ```typescript
 * // In Dashboard component
 * useDataChangeListener(() => {
 *   // Refresh metrics when any import/update/delete happens
 *   setRefreshKey(prev => prev + 1);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Listen only for specific period
 * useDataChangeListener((event) => {
 *   if (event.detail.period === selectedPeriod) {
 *     refreshData();
 *   }
 * }, [selectedPeriod]);
 * ```
 */
export function useDataChangeListener(
  callback: (event?: CustomEvent<DataImportedDetail | DataDeletedDetail | DataUpdatedDetail>) => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const handleDataImported = (event: Event) => {
      callback(event as CustomEvent<DataImportedDetail>);
    };

    const handleDataDeleted = (event: Event) => {
      callback(event as CustomEvent<DataDeletedDetail>);
    };

    const handleDataUpdated = (event: Event) => {
      callback(event as CustomEvent<DataUpdatedDetail>);
    };

    // Subscribe to all data change events
    window.addEventListener(DATA_EVENTS.DATA_IMPORTED, handleDataImported);
    window.addEventListener(DATA_EVENTS.DATA_DELETED, handleDataDeleted);
    window.addEventListener(DATA_EVENTS.DATA_UPDATED, handleDataUpdated);

    return () => {
      // Cleanup: unsubscribe on unmount
      window.removeEventListener(DATA_EVENTS.DATA_IMPORTED, handleDataImported);
      window.removeEventListener(DATA_EVENTS.DATA_DELETED, handleDataDeleted);
      window.removeEventListener(DATA_EVENTS.DATA_UPDATED, handleDataUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * React hook to listen only for import events
 *
 * @param callback - Function to call when import event is fired
 * @param deps - Optional dependency array
 */
export function useDataImportListener(
  callback: (event: CustomEvent<DataImportedDetail>) => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const handleDataImported = (event: Event) => {
      callback(event as CustomEvent<DataImportedDetail>);
    };

    window.addEventListener(DATA_EVENTS.DATA_IMPORTED, handleDataImported);

    return () => {
      window.removeEventListener(DATA_EVENTS.DATA_IMPORTED, handleDataImported);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
