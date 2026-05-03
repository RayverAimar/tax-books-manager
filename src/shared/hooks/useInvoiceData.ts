import { useState, useCallback, useRef, useEffect } from 'react';
import type { InvoiceType, InvoiceMap } from '@/shared/types/invoice.types';
import { generateInvoiceId } from '@/shared/lib/utils/invoice';

/**
 * React hook for managing invoice data with CRUD operations
 *
 * This hook manages invoice state with optimistic updates.
 * Provides CRUD operations (Create, Read, Update, Delete) for invoice data.
 *
 * Key features:
 * - Optimistic UI updates
 * - Simple state management with single data array
 * - CRUD operations for invoice management
 * - Efficient state updates with refs
 *
 * Performance: Optimized for datasets up to ~10,000 records.
 * Uses individual UPDATE operations for edits (more efficient than replace-all).
 *
 * @param type - The type of invoice to manage ('sales' or 'purchases')
 * @returns Object containing invoice data and CRUD functions
 *
 * @example
 * const {
 *   invoices,
 *   setInvoices,
 *   addInvoice,
 *   updateInvoice,
 *   deleteInvoice
 * } = useInvoiceData('sales');
 */
export function useInvoiceData<T extends InvoiceType>(_type: T) {
  // Current data (loaded from database)
  const [invoices, setInvoices] = useState<InvoiceMap<T>[]>([]);

  // Ref to access current values without re-creating callbacks
  const invoicesRef = useRef<InvoiceMap<T>[]>(invoices);

  // Keep ref in sync with state
  useEffect(() => {
    invoicesRef.current = invoices;
  }, [invoices]);

  /**
   * Initialize with data from database
   */
  const initializeData = useCallback((data: InvoiceMap<T>[]) => {
    setInvoices([...data]);
  }, []);

  /**
   * ADD - Add a new invoice (will be saved by caller)
   */
  const addInvoice = useCallback(
    (invoiceData: Omit<InvoiceMap<T>, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newInvoice = {
        ...invoiceData,
        id: generateInvoiceId(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as InvoiceMap<T>;

      setInvoices((prev) => [...prev, newInvoice]);
      return newInvoice;
    },
    []
  );

  /**
   * UPDATE - Update a single invoice
   * Optimistic update: UI updates immediately, caller handles database save
   */
  const updateInvoice = useCallback((id: number, updates: Partial<InvoiceMap<T>>) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? { ...inv, ...updates, updatedAt: new Date() }
          : inv
      )
    );
  }, []);

  /**
   * DELETE - Delete a single invoice
   * Optimistic delete: removes from UI immediately, caller handles database
   */
  const deleteInvoice = useCallback((id: number) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  /**
   * BULK DELETE - Delete multiple invoices
   */
  const deleteMultipleInvoices = useCallback((ids: number[]) => {
    setInvoices((prev) => prev.filter((inv) => inv.id && !ids.includes(inv.id)));
  }, []);

  /**
   * REPLACE ALL - Replace all data (used for imports)
   * Simply replaces the array - no change tracking needed
   */
  const replaceAll = useCallback((newInvoices: InvoiceMap<T>[]) => {
    setInvoices(newInvoices);
  }, []);

  /**
   * APPEND ALL - Append new data (used for imports with append)
   */
  const appendAll = useCallback((newInvoices: InvoiceMap<T>[]) => {
    setInvoices((prev) => [...prev, ...newInvoices]);
  }, []);

  /**
   * Get invoice by ID
   */
  const getInvoiceById = useCallback(
    (id: number) => {
      return invoices.find((inv) => inv.id === id);
    },
    [invoices]
  );

  return {
    // Data
    invoices,
    setInvoices,

    // Actions
    initializeData,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    deleteMultipleInvoices,
    replaceAll,
    appendAll,

    // Utilities
    getInvoiceById
  };
}
