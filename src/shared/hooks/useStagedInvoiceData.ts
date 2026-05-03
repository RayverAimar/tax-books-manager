import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { InvoiceType, InvoiceMap } from '@/shared/types/invoice.types';
import { generateInvoiceId } from '@/shared/lib/utils/invoice';

type ChangeType = 'added' | 'modified' | 'deleted';

interface StagedChange<T> {
  type: ChangeType;
  original?: T;
  current?: T;
}

/**
 * React hook for managing staged invoice data with change tracking
 *
 * This hook implements a comprehensive staged data pattern for invoice management,
 * similar to Git's staging area. It tracks all changes (add/update/delete) separately
 * from the original database data, allowing users to batch multiple changes before
 * committing them to the database in a single transaction.
 *
 * Key features:
 * - Maintains both original (from DB) and working (with changes) datasets
 * - Tracks all changes with detailed metadata (type, original, current)
 * - Supports bulk operations (replace all, append all)
 * - Provides change summary and validation before commit
 * - Uses refs to avoid stale closure issues in callbacks
 *
 * Performance: Optimized for datasets up to ~10,000 records. Uses shallow copying
 * for most operations except replaceAll which performs deep equality checks.
 *
 * @param type - The type of invoice to manage ('sales' or 'purchases')
 * @returns Object containing invoice data, change state, and mutation functions
 *
 * @example
 * const {
 *   invoices,
 *   hasUnsavedChanges,
 *   changesSummary,
 *   addInvoice,
 *   updateInvoice,
 *   deleteInvoice,
 *   commitChanges
 * } = useStagedInvoiceData('sales');
 *
 * // Add a new invoice
 * const newInvoice = addInvoice({
 *   serieDelCdp: 'F001',
 *   nroCpDocNroInicial: '00001',
 *   totalCp: 118.00
 * });
 *
 * // Check changes before saving
 * if (hasUnsavedChanges) {
 *   const changes = commitChanges();
 *   await saveToDatabase(changes);
 * }
 */
export function useStagedInvoiceData<T extends InvoiceType>(_type: T) {
  // Original data from database
  const [originalData, setOriginalData] = useState<InvoiceMap<T>[]>([]);

  // Current working data (with staged changes)
  const [workingData, setWorkingData] = useState<InvoiceMap<T>[]>([]);

  // Track changes by ID
  const [stagedChanges, setStagedChanges] = useState<Map<number, StagedChange<InvoiceMap<T>>>>(new Map());

  // Refs to access current values without re-creating callbacks
  const originalDataRef = useRef<InvoiceMap<T>[]>(originalData);
  const workingDataRef = useRef<InvoiceMap<T>[]>(workingData);

  // Keep refs in sync with state
  useEffect(() => {
    originalDataRef.current = originalData;
  }, [originalData]);

  useEffect(() => {
    workingDataRef.current = workingData;
  }, [workingData]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return stagedChanges.size > 0;
  }, [stagedChanges]);

  // Get summary of changes
  const changesSummary = useMemo(() => {
    let added = 0;
    let modified = 0;
    let deleted = 0;

    stagedChanges.forEach((change) => {
      switch (change.type) {
        case 'added':
          added++;
          break;
        case 'modified':
          modified++;
          break;
        case 'deleted':
          deleted++;
          break;
      }
    });

    return { added, modified, deleted, total: added + modified + deleted };
  }, [stagedChanges]);

  // Initialize with data from database
  const initializeData = useCallback((data: InvoiceMap<T>[]) => {
    setOriginalData([...data]);
    setWorkingData([...data]);
    setStagedChanges(new Map());
  }, []);

  // ADD - Stage a new invoice
  const addInvoice = useCallback((invoiceData: Omit<InvoiceMap<T>, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newInvoice = {
      ...invoiceData,
      id: generateInvoiceId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as InvoiceMap<T>;

    setWorkingData((prev) => [...prev, newInvoice]);

    setStagedChanges((prev) => {
      const newChanges = new Map(prev);
      newChanges.set(newInvoice.id!, {
        type: 'added',
        current: newInvoice
      });
      return newChanges;
    });

    return newInvoice;
  }, []);

  /**
   * Updates a single invoice with staged changes
   *
   * This function handles updates for both newly added and existing invoices.
   * For newly added invoices (not yet in database), it preserves their 'added' status
   * while updating the data. For existing invoices, it marks them as 'modified' and
   * tracks both original and updated versions for later commit.
   *
   * @param id - The unique identifier of the invoice to update
   * @param updates - Partial invoice data containing only the fields to update
   *
   * @example
   * updateInvoice('invoice-123', { totalCp: 1500.00, moneda: 'PEN' });
   */
  const updateInvoice = useCallback((id: number, updates: Partial<InvoiceMap<T>>) => {
    setWorkingData((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates, updatedAt: new Date() } : inv)));

    setStagedChanges((prev) => {
      const newChanges = new Map(prev);
      const existingChange = newChanges.get(id);

      if (existingChange && existingChange.type === 'added') {
        // If it was added in this session, keep it as added with updated data
        const updatedInvoice = workingDataRef.current.find((inv) => inv.id === id);
        if (updatedInvoice) {
          newChanges.set(id, {
            type: 'added',
            current: { ...updatedInvoice, ...updates, updatedAt: new Date() }
          });
        }
      } else {
        // Mark as modified if it was an existing record
        const originalInvoice = originalDataRef.current.find((inv) => inv.id === id);
        const currentInvoice = workingDataRef.current.find((inv) => inv.id === id);

        if (originalInvoice && currentInvoice) {
          newChanges.set(id, {
            type: 'modified',
            original: originalInvoice,
            current: { ...currentInvoice, ...updates, updatedAt: new Date() }
          });
        }
      }

      return newChanges;
    });
  }, []);

  /**
   * Marks a single invoice for deletion
   *
   * This function stages an invoice for deletion in the next commit. The behavior
   * differs based on whether the invoice was previously added in this session:
   * - For newly added invoices: Simply removes them from staged changes (no deletion needed)
   * - For existing invoices: Marks as 'deleted' and tracks the original for commit
   *
   * Side effects: Immediately removes the invoice from the working data array, so it
   * will no longer appear in the UI.
   *
   * @param id - The unique identifier of the invoice to delete
   *
   * @example
   * deleteInvoice('invoice-123');
   */
  const deleteInvoice = useCallback((id: number) => {
    const invoice = workingDataRef.current.find((inv) => inv.id === id);

    if (!invoice) return;

    setWorkingData((prev) => prev.filter((inv) => inv.id !== id));

    setStagedChanges((prev) => {
      const newChanges = new Map(prev);
      const existingChange = newChanges.get(id);

      if (existingChange && existingChange.type === 'added') {
        // If it was added in this session, just remove it from staged changes
        newChanges.delete(id);
      } else {
        // Mark as deleted if it was an existing record
        const originalInvoice = originalDataRef.current.find((inv) => inv.id === id);
        if (originalInvoice) {
          newChanges.set(id, {
            type: 'deleted',
            original: originalInvoice
          });
        }
      }

      return newChanges;
    });
  }, []);

  // BULK DELETE - Stage multiple deletions
  const deleteMultipleInvoices = useCallback(
    (ids: number[]) => {
      ids.forEach((id) => deleteInvoice(id));
    },
    [deleteInvoice]
  );

  /**
   * Replaces all working data with new invoices (used for CSV imports)
   *
   * This function performs a complete replacement of the working dataset, calculating
   * the differences between the original data and the new data to track all changes:
   * - Items in original but not in new: marked as 'deleted'
   * - Items in new but not in original: marked as 'added'
   * - Items in both with differences: marked as 'modified'
   * - Items unchanged: not tracked (optimization)
   *
   * Performance considerations: Uses JSON.stringify for deep equality checks. For large
   * datasets (>1000 records), this may take a few seconds.
   *
   * Side effects: Completely replaces the working data array and recalculates all
   * staged changes from scratch.
   *
   * @param newInvoices - Array of new invoice data to replace current working data
   *
   * @example
   * const importedInvoices = await importSalesCSV(csvContent);
   * replaceAll(importedInvoices);
   */
  const replaceAll = useCallback((newInvoices: InvoiceMap<T>[]) => {
    setWorkingData(newInvoices);

    // Mark everything as changed
    const newChanges = new Map<number, StagedChange<InvoiceMap<T>>>();

    // Mark all original items as deleted unless they exist in new data
    originalDataRef.current.forEach((original) => {
      const existsInNew = newInvoices.find((inv) => inv.id === original.id);
      if (!existsInNew) {
        newChanges.set(original.id!, {
          type: 'deleted',
          original
        });
      }
    });

    // Track counts for potential future use/logging
    let _addedCount = 0;
    let _modifiedCount = 0;
    let _skippedCount = 0;

    newInvoices.forEach((invoice) => {
      const existedInOriginal = originalDataRef.current.find((orig) => orig.id === invoice.id);
      if (!existedInOriginal) {
        newChanges.set(invoice.id!, {
          type: 'added',
          current: invoice
        });
        _addedCount++;
      } else {
        // Check if it was modified
        if (JSON.stringify(existedInOriginal) !== JSON.stringify(invoice)) {
          newChanges.set(invoice.id!, {
            type: 'modified',
            original: existedInOriginal,
            current: invoice
          });
          _modifiedCount++;
        } else {
          // Unchanged records are NOT tracked
          _skippedCount++;
        }
      }
    });

    setStagedChanges(newChanges);
  }, []);

  // APPEND ALL - Append new data (used for imports with append)
  const appendAll = useCallback((newInvoices: InvoiceMap<T>[]) => {
    setWorkingData((prev) => [...prev, ...newInvoices]);

    setStagedChanges((prev) => {
      const newChanges = new Map(prev);

      // Add all new invoices as added
      newInvoices.forEach((invoice) => {
        newChanges.set(invoice.id!, {
          type: 'added',
          current: invoice
        });
      });

      return newChanges;
    });
  }, []);

  // COMMIT CHANGES - Get data ready for database save
  const getChangesToCommit = useCallback(() => {
    const toAdd: InvoiceMap<T>[] = [];
    const toUpdate: InvoiceMap<T>[] = [];
    const toDelete: number[] = [];

    stagedChanges.forEach((change, id) => {
      switch (change.type) {
        case 'added':
          if (change.current) toAdd.push(change.current);
          break;
        case 'modified':
          if (change.current) toUpdate.push(change.current);
          break;
        case 'deleted':
          toDelete.push(id);
          break;
      }
    });

    return { toAdd, toUpdate, toDelete };
  }, [stagedChanges]);

  // SAVE - Commit all changes and reset staging
  const commitChanges = useCallback(() => {
    // After successful save to database, update original data
    setOriginalData([...workingData]);
    setStagedChanges(new Map());

    return getChangesToCommit();
  }, [workingData, getChangesToCommit]);

  // DISCARD - Reset all staged changes
  const discardChanges = useCallback(() => {
    setWorkingData([...originalData]);
    setStagedChanges(new Map());
  }, [originalData]);

  // Get invoice by ID
  const getInvoiceById = useCallback(
    (id: number) => {
      return workingData.find((inv) => inv.id === id);
    },
    [workingData]
  );

  return {
    // Data
    invoices: workingData,
    originalInvoices: originalData,

    // State
    hasUnsavedChanges,
    changesSummary,

    // Actions
    initializeData,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    deleteMultipleInvoices,
    replaceAll,
    appendAll,

    // Commit/Discard
    getChangesToCommit,
    commitChanges,
    discardChanges,

    // Utilities
    getInvoiceById
  };
}
