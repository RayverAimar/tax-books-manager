import { useState, useCallback } from 'react';
import type { InvoiceType, InvoiceMap } from '@/shared/types/invoice.types';
import { generateInvoiceId } from '@/shared/lib/utils/invoice';

/**
 * Hook genérico para CRUD de facturas con updates optimistas. El parámetro `_type`
 * solo dirige el tipo genérico de retorno (`InvoiceMap<T>`), no se usa en runtime.
 * Optimizado para ~10k filas — usa UPDATE individual en lugar de replace-all.
 */
export function useInvoiceData<T extends InvoiceType>(_type: T) {
  const [invoices, setInvoices] = useState<InvoiceMap<T>[]>([]);

  /**
   * Initialize with data from database
   */
  const initializeData = useCallback((data: InvoiceMap<T>[]) => {
    setInvoices([...data]);
  }, []);

  /**
   * ADD - Add a new invoice (will be saved by caller)
   */
  const addInvoice = useCallback((invoiceData: Omit<InvoiceMap<T>, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newInvoice = {
      ...invoiceData,
      id: generateInvoiceId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as InvoiceMap<T>;

    setInvoices((prev) => [...prev, newInvoice]);
    return newInvoice;
  }, []);

  /**
   * UPDATE - Update a single invoice
   * Optimistic update: UI updates immediately, caller handles database save
   */
  const updateInvoice = useCallback((id: number, updates: Partial<InvoiceMap<T>>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates, updatedAt: new Date() } : inv)));
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
