import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/shared/components/common/data-table/DataTable';
import { ImportConfirmationDialog } from './ImportConfirmationDialog';
import { ConfirmDiscardDialog } from '../dialogs/ConfirmDiscardDialog';
import { DeclaredPeriodWarningDialog } from '../dialogs/DeclaredPeriodWarningDialog';
import { SireExportOptionsDialog, type SireExportOptionsResult } from '../dialogs/SireExportOptionsDialog';
import type { FooterTotalConfig } from '@/shared/components/common/data-table/DataTableFooter';

// ✅ NUEVO: Componentes con composición
import { InvoiceListHeader } from './InvoiceListHeader';
import { DeclaredToggle } from '../DeclaredToggle';
import { AddInvoiceButton } from '../AddInvoiceButton';
import { ImportButton } from '../import-export/ImportButton';
import { ExportButton } from '../import-export/ExportButton';
import { ExportPDFButton } from '../import-export/ExportPDFButton';

import type { PeriodSummaryData } from '@/shared/lib/export/pdf-export';
import { EmptyStateView } from './EmptyStateView';
import { ErrorBoundary } from '../ErrorBoundary';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { usePeriod } from '@/core/presentation/contexts/period.context';
import { useInvoiceData } from '@/shared/hooks/useInvoiceData';
import { useImport } from '@/shared/hooks/useImport';
import { useExport } from '@/shared/hooks/useExport';
import {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showExportSuccess,
  showExportCancelled,
  showExportError
} from '@/shared/lib/utils/toast';
import { useSalesColumns } from '@/features/sales/components/SalesColumns';
import { usePurchasesColumns } from '@/features/purchases/components/PurchasesColumns';
import { calculateSalesRelatedFields, calculatePurchaseRelatedFields } from '@/shared/lib/utils/invoice-calculations';
import { validateRvieRow, validateRceRow } from '@/shared/lib/export/pvsire-row-validator';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { emitDataImported } from '@/shared/lib/events/data-events';
import type { ColumnDef } from '@tanstack/react-table';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { InvoiceType, InvoiceMap, CreateInvoiceData } from '@/shared/types/invoice.types';

/**
 * Configuration interface for InvoiceListPage component
 *
 * @template T - The invoice type ('sales' | 'purchases')
 * @template FormData - Optional custom form data type (defaults to InvoiceMap<T>)
 *
 * @remarks
 * This interface defines all required and optional props for the invoice list page.
 * It supports generic invoice types and custom form data structures.
 */
interface InvoiceListPageConfig<T extends InvoiceType, FormData = InvoiceMap<T>> {
  /** Invoice type: 'sales' or 'purchases' */
  type: T;

  /** Page title displayed in header (e.g., "Registro de Ventas") */
  title: string;

  /** Singular label for invoices (e.g., "registro") */
  singularLabel: string;

  /** Plural label for invoices (e.g., "registros") */
  pluralLabel: string;

  /** Label for add button (e.g., "Agregar Compra") */
  addButtonLabel: string;

  /** Title for invoice form dialog (e.g., "Nuevo Comprobante de Compra") */
  dialogTitle: string;

  /** Description shown in invoice form dialog */
  dialogDescription: string;

  /** Success messages for various operations */
  successMessage: {
    added: string;
    addedDescription: string;
  };

  /** TanStack Table column definitions for this invoice type (optional - generated automatically if not provided) */
  columns?: ColumnDef<InvoiceMap<T>>[];

  /**
   * Form component for adding new invoices
   * Must accept onSubmit callback and optional defaultValues
   */
  FormComponent: React.ComponentType<{
    onSubmit: (data: FormData) => void;
    defaultValues?: Partial<FormData>;
  }>;

  /**
   * Optional transformer to convert form data to CreateInvoiceData<T>
   * Use this when FormData differs from the invoice structure
   *
   * @param data - Form data from FormComponent
   * @returns Invoice data ready to be added (without id, createdAt, updatedAt)
   *
   * @example
   * ```typescript
   * transformFormData: (data) => ({
   *   ...data,
   *   // Add default null values for SUNAT fields
   *   ruc: null,
   *   businessName: null,
   *   // ... other fields
   * })
   * ```
   */
  transformFormData?: (data: FormData) => CreateInvoiceData<T>;
}

/**
 * Invoice list page with staging, change tracking, and data management
 *
 * @template T - Invoice type ('sales' | 'purchases')
 * @template FormData - Optional custom form data type (defaults to InvoiceMap<T>)
 *
 * @description
 * A comprehensive page component for managing invoice records with the following features:
 *
 * **Core Features:**
 * - Display invoices in a sortable, filterable data table
 * - Add new invoices via a modal form
 * - Import invoices from CSV/TXT files with confirmation dialog
 * - Export invoices to CSV/TXT/Excel formats
 * - Delete multiple invoices at once
 *
 * **Change Tracking (Staging):**
 * - All changes are staged in memory before saving
 * - Visual indicator shows number of unsaved changes
 * - Save/Discard actions for pending changes
 * - Change summary (added/modified/deleted counts)
 * - Persists changes to database on save
 *
 * **Data Management:**
 * - Loads data from period repository
 * - Automatically syncs with selected company and period
 * - Handles empty states (no company, no period, no data)
 * - Real-time updates in UI with optimistic updates
 *
 * **Navigation & Safety:**
 * - Prevents navigation with unsaved changes
 * - Confirmation dialog for discarding changes
 * - Blocks window close if changes are pending
 *
 * @param {InvoiceListPageConfig<T, FormData>} config - Component configuration
 *
 * @example
 * ```typescript
 * // Basic usage for sales
 * <InvoiceListPage
 *   type="sales"
 *   title="Registro de Ventas"
 *   singularLabel="registro"
 *   pluralLabel="registros"
 *   addButtonLabel="Agregar Venta"
 *   dialogTitle="Nueva Venta"
 *   dialogDescription="Complete los datos de la venta."
 *   successMessage={{
 *     added: 'Venta agregada',
 *     addedDescription: 'La venta se agregó correctamente.'
 *   }}
 *   columns={salesColumns}
 *   FormComponent={SalesInvoiceForm}
 * />
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with custom form data transformation
 * <InvoiceListPage
 *   type="purchases"
 *   title="Registro de Compras"
 *   // ... other props
 *   FormComponent={PurchaseInvoiceForm}
 *   transformFormData={(formData) => ({
 *     ...formData,
 *     ruc: null,
 *     businessName: null,
 *     // Add all required SUNAT fields
 *   })}
 * />
 * ```
 *
 * @see {@link https://tanstack.com/table/latest TanStack Table} for column definitions
 * @see useInvoiceData for invoice CRUD operations with optimistic updates
 * @see useImport for CSV/TXT import functionality
 * @see useExport for export functionality
 */
export function InvoiceListPage<T extends InvoiceType, FormData = InvoiceMap<T>>({
  type,
  title,
  singularLabel: _singularLabel,
  pluralLabel: _pluralLabel,
  addButtonLabel,
  dialogTitle,
  dialogDescription,
  successMessage,
  columns: providedColumns,
  FormComponent,
  transformFormData
}: InvoiceListPageConfig<T, FormData>) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { selectedPeriod, period, toggleDeclared } = usePeriod(); // ✅ Leer del contexto
  const [selectedRows, setSelectedRows] = useState<InvoiceMap<T>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [declaredWarning, setDeclaredWarning] = useState<{
    isOpen: boolean;
    operationType: 'import' | 'edit' | 'delete' | null;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    operationType: null,
    onConfirm: null
  });
  const [sireOptionsOpen, setSireOptionsOpen] = useState(false);
  const [importConfirmation, setImportConfirmation] = useState<{
    isOpen: boolean;
    existingCount: number;
    newData: InvoiceMap<T>[] | null;
    format: 'csv' | 'txt' | null;
  }>({
    isOpen: false,
    existingCount: 0,
    newData: null,
    format: null
  });

  // Repository instances (singleton from factory)
  const salesRepo = useMemo(() => RepositoryFactory.getSalesRepository(), []);
  const purchasesRepo = useMemo(() => RepositoryFactory.getPurchasesRepository(), []);

  // Custom hooks
  const { invoices, initializeData, deleteMultipleInvoices, updateInvoice, setInvoices } = useInvoiceData(type);
  const { handleImport, isImporting } = useImport(type);
  const { handleExport, isExporting } = useExport(type, selectedPeriod || undefined);

  // Refs for large data to prevent callback re-creation (Coding Standards 2.1)
  const invoicesRef = useRef(invoices);
  const companyRef = useRef(company);
  const selectedPeriodRef = useRef(selectedPeriod);
  const periodRef = useRef(period);
  const initializeDataRef = useRef(initializeData);

  // Sync refs with state
  useEffect(() => {
    invoicesRef.current = invoices;
  }, [invoices]);

  useEffect(() => {
    companyRef.current = company;
  }, [company]);

  useEffect(() => {
    selectedPeriodRef.current = selectedPeriod;
  }, [selectedPeriod]);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    initializeDataRef.current = initializeData;
  }, [initializeData]);

  // Stores the resolve function of the active declared-warning Promise so the cancel path can resolve it
  const declaredWarningResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Generate columns (both hooks are called to comply with React Hooks rules)
  // Each hook uses useMemo internally, so columns are only generated once
  const salesColumns = useSalesColumns();
  const purchasesColumns = usePurchasesColumns();

  // ✅ OPTIMIZED: Select only the columns we need based on type
  const tableColumns = useMemo(() => {
    if (providedColumns) return providedColumns;
    return (type === 'sales' ? salesColumns : purchasesColumns) as ColumnDef<InvoiceMap<T>>[];
  }, [providedColumns, type, salesColumns, purchasesColumns]);

  // Footer totals configuration — declarative sum-per-column.
  const footerTotalsConfig = useMemo<FooterTotalConfig[]>(() => {
    const SALES_TOTAL_COLUMNS: (keyof SalesInvoice)[] = [
      'exportValue',
      'taxableBase',
      'taxableBaseDiscount',
      'vatAmount',
      'vatDiscount',
      'exemptAmount',
      'unaffectedAmount',
      'selectiveConsumptionTax',
      'riceVatBase',
      'riceVat',
      'plasticBagTax',
      'otherTaxes',
      'totalAmount'
    ];

    const PURCHASES_TOTAL_COLUMNS: (keyof PurchaseInvoice)[] = [
      'taxableBaseTaxed',
      'vatAmountTaxed',
      'taxableBaseMixed',
      'vatAmountMixed',
      'taxableBaseUntaxed',
      'vatAmountUntaxed',
      'nonTaxableValue',
      'selectiveConsumptionTax',
      'plasticBagTax',
      'otherTaxes',
      'totalAmount'
    ];

    const columns = type === 'sales' ? SALES_TOTAL_COLUMNS : PURCHASES_TOTAL_COLUMNS;
    return columns.map((columnId) => ({
      columnId: columnId as string,
      calculate: (data: unknown[]) =>
        (data as Record<string, unknown>[]).reduce((sum, inv) => {
          const value = inv[columnId as string];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0)
    }));
  }, [type]);

  // Auto-save helper function (used by import operations)
  const autoSaveRecords = useCallback(
    async (records: InvoiceMap<T>[]) => {
      if (!company || !selectedPeriod) {
        return false;
      }

      try {
        if (type === 'sales') {
          await salesRepo.replacePeriodRecords(company.id, selectedPeriod, records as SalesInvoice[]);
        } else {
          await purchasesRepo.replacePeriodRecords(company.id, selectedPeriod, records as PurchaseInvoice[]);
        }
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        showError('Error al guardar', {
          description: `No se pudieron guardar los cambios en la base de datos. ${errorMsg}`
        });
        return false;
      }
    },
    [company, selectedPeriod, type, salesRepo, purchasesRepo]
  );

  // Create ref for autoSaveRecords after it's declared
  const autoSaveRecordsRef = useRef(autoSaveRecords);
  useEffect(() => {
    autoSaveRecordsRef.current = autoSaveRecords;
  }, [autoSaveRecords]);

  // Load data when period changes
  useEffect(() => {
    if (!company || !selectedPeriod) return;

    let cancelled = false;

    const loadPeriodData = async () => {
      if (!cancelled) {
        setIsLoadingData(true);
      }

      try {
        const data =
          type === 'sales'
            ? await salesRepo.getAll(company.id, selectedPeriod)
            : await purchasesRepo.getAll(company.id, selectedPeriod);

        // SECURITY: Check if component is still mounted before updating state
        if (cancelled) return;

        initializeData(data as InvoiceMap<T>[]);
      } catch {
        if (!cancelled) {
          showError('Error al cargar datos', {
            description: 'No se pudieron cargar los datos del periodo'
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    };

    loadPeriodData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [company, selectedPeriod, type, initializeData, salesRepo, purchasesRepo]);

  // Simple navigation handler (no unsaved changes warning needed with auto-save)
  const handleNavigation = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  /**
   * Checks if the current period is declared and shows warning dialog if needed.
   * If not declared, executes the operation immediately.
   * If declared, shows dialog and executes after confirmation, automatically marking period as undeclared.
   *
   * @param operationType - Type of operation being performed
   * @param operation - Function to execute after confirmation (or immediately if not declared)
   * @returns Promise that resolves when operation completes or is cancelled
   */
  // ✅ Check declared and execute - simplificado (lee del contexto)
  const checkDeclaredAndExecute = useCallback(
    async (operationType: 'import' | 'edit' | 'delete', operation: () => void | Promise<void>): Promise<boolean> => {
      if (!company || !selectedPeriod) {
        await operation();
        return true;
      }

      // ✅ Leer directamente del contexto
      const isDeclared = type === 'sales' ? period?.salesDeclared || false : period?.purchasesDeclared || false;

      if (!isDeclared) {
        // No está declarado, ejecutar inmediatamente
        await operation();
        return true;
      }

      // Está declarado, mostrar warning dialog
      return new Promise((resolve) => {
        declaredWarningResolveRef.current = resolve;
        setDeclaredWarning({
          isOpen: true,
          operationType,
          onConfirm: async () => {
            try {
              await toggleDeclared(company.id, type);
            } catch {
              showError('Error', { description: 'No se pudo actualizar el estado del período.' });
              declaredWarningResolveRef.current = null;
              resolve(false);
              return;
            }

            await operation();
            declaredWarningResolveRef.current = null;
            resolve(true);
          }
        });
      });
    },
    [company, selectedPeriod, type, period, toggleDeclared]
  );

  // Handlers - OPTIMIZED: Use refs to minimize dependencies
  const handleImportClick = useCallback(
    async (format: 'csv' | 'txt') => {
      const result = await handleImport(format);

      if (result?.success) {
        // Check if period is declared before proceeding with import
        await checkDeclaredAndExecute('import', async () => {
          // Si hay filas existentes, mostrar el modal de confirmación
          if (invoicesRef.current.length > 0) {
            setImportConfirmation({
              isOpen: true,
              existingCount: invoicesRef.current.length,
              newData: result.data,
              format: format
            });
          } else {
            // Si no hay filas existentes, importar directamente y guardar
            const saveSuccess = await autoSaveRecordsRef.current(result.data);

            if (saveSuccess) {
              // Reload data from database to sync state
              const savedData =
                type === 'sales'
                  ? await salesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!)
                  : await purchasesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!);

              initializeDataRef.current(savedData as InvoiceMap<T>[]);

              // Emit data change event to notify Dashboard and other components
              emitDataImported(type, selectedPeriodRef.current!, result.data.length, 'single-file');

              showSuccess('Importación exitosa', {
                description: `Se importaron y guardaron ${result.data.length} registros correctamente.`
              });
            }

            if (result.warnings.length > 0) {
              showWarning('Advertencias', {
                description: `${result.warnings.length} advertencias durante la importación`
              });
            }
          }
        });
      } else if (result) {
        // Crear mensaje de error más específico
        let errorMessage = 'Error al procesar el archivo';

        if (result.errors.some((e) => e.includes('Columnas faltantes'))) {
          errorMessage =
            'El archivo no tiene todas las columnas requeridas. ' +
            'Verifica que sea un archivo de formato SUNAT válido.';
        } else if (result.errors.some((e) => e.includes('Columnas extra'))) {
          errorMessage = 'El archivo contiene columnas no reconocidas. Verifica el formato del archivo.';
        } else if (result.errors.some((e) => e.includes('está vacío'))) {
          errorMessage = 'El archivo está vacío o no contiene datos.';
        } else if (result.errors.some((e) => e.includes('no parece ser un formato válido'))) {
          errorMessage =
            format === 'csv'
              ? 'El archivo no es un CSV válido. Debe usar comas (,) como separador.'
              : 'El archivo no es un TXT válido. Debe usar pipe (|) como separador.';
        } else if (result.errors.some((e) => e.includes('No se pudieron leer las columnas'))) {
          errorMessage = 'No se pudieron identificar las columnas del archivo. Verifica que tenga encabezados.';
        }

        showError('Error al importar', {
          description: errorMessage
        });
      }
    },
    [handleImport, type, salesRepo, purchasesRepo, checkDeclaredAndExecute] // ✅ Reduced from 9 to 5 dependencies
  );

  // Handler para el modal de confirmación - OPTIMIZED: Use refs
  const handleImportConfirmation = useCallback(
    async (action: 'replace' | 'append' | 'cancel') => {
      if (!importConfirmation.newData) return;

      if (action === 'cancel') {
        showInfo('Importación cancelada', {
          description: 'No se realizaron cambios.'
        });

        setImportConfirmation({
          isOpen: false,
          existingCount: 0,
          newData: null,
          format: null
        });
        return;
      }

      // Replace or Append
      const newData = importConfirmation.newData;

      // Auto-save to database
      let dataToSave: InvoiceMap<T>[];

      if (action === 'replace') {
        // Replace: save only the new data (repository will DELETE then INSERT)
        dataToSave = newData;
      } else {
        // Append: reload from DB and append new data
        const existingData =
          type === 'sales'
            ? await salesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!)
            : await purchasesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!);
        dataToSave = [...(existingData as InvoiceMap<T>[]), ...newData];
      }

      const saveSuccess = await autoSaveRecordsRef.current(dataToSave);

      if (saveSuccess) {
        // Reload data from database to sync state
        const savedData =
          type === 'sales'
            ? await salesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!)
            : await purchasesRepo.getAll(companyRef.current!.id, selectedPeriodRef.current!);

        initializeDataRef.current(savedData as InvoiceMap<T>[]);

        // Emit data change event to notify Dashboard and other components
        emitDataImported(type, selectedPeriodRef.current!, newData.length, 'single-file');

        const actionText = action === 'replace' ? 'reemplazaron' : 'agregaron';
        showSuccess('Importación exitosa', {
          description: `Se ${actionText} y guardaron ${newData.length} registros correctamente.`
        });
      }

      // Cerrar el modal
      setImportConfirmation({
        isOpen: false,
        existingCount: 0,
        newData: null,
        format: null
      });
    },
    [importConfirmation.newData, type, salesRepo, purchasesRepo] // ✅ Reduced from 8 to 4 dependencies
  );

  const runExport = useCallback(
    async (format: 'csv' | 'txt', sireOptions?: SireExportOptionsResult) => {
      try {
        const filePath = await handleExport(
          invoicesRef.current as SalesInvoice[] | PurchaseInvoice[],
          format,
          sireOptions
        );

        if (filePath) {
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'archivo';
          const bookType = type === 'sales' ? 'ventas' : 'compras';
          showExportSuccess(fileName, filePath, `Se exportaron ${invoicesRef.current.length} registros de ${bookType}`);
        } else {
          showExportCancelled();
        }
      } catch (error) {
        showExportError(error);
      }
    },
    [handleExport, type]
  );

  const handleExportClick = useCallback(
    async (format: 'csv' | 'txt') => {
      // TXT es el archivo oficial SIRE — preguntamos oportunidad/correlativo antes
      // de generar. CSV se exporta directo (uso interno).
      if (format === 'txt') {
        setSireOptionsOpen(true);
        return;
      }
      await runExport(format);
    },
    [runExport]
  );

  const handleSireOptionsConfirm = useCallback(
    (result: SireExportOptionsResult) => {
      void runExport('txt', result);
    },
    [runExport]
  );

  const handleFormSubmit = useCallback(
    async (data: FormData) => {
      const currentCompany = companyRef.current;
      const currentPeriod = selectedPeriodRef.current;

      if (!currentCompany || !currentPeriod) {
        showError('Error', {
          description: 'No se puede agregar el registro sin una empresa o período seleccionado'
        });
        return;
      }

      await checkDeclaredAndExecute('edit', async () => {
        const invoiceData: CreateInvoiceData<T> = transformFormData
          ? transformFormData(data)
          : (data as CreateInvoiceData<T>);

        // Insert one row directly. The repository returns the persisted record with
        // its real SQLite id, so we just append it locally — no nuke-and-pave, no
        // refetching every other row.
        try {
          const created =
            type === 'sales'
              ? await salesRepo.create(
                  currentCompany.id,
                  currentPeriod,
                  invoiceData as unknown as Parameters<typeof salesRepo.create>[2]
                )
              : await purchasesRepo.create(
                  currentCompany.id,
                  currentPeriod,
                  invoiceData as unknown as Parameters<typeof purchasesRepo.create>[2]
                );

          setInvoices((prev) => [...prev, created as InvoiceMap<T>]);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          showError('Error al guardar', {
            description: `Ocurrió un error al guardar el registro en la base de datos. ${errorMsg}`
          });
          return;
        }

        showSuccess(successMessage.added, {
          description: successMessage.addedDescription
        });
      });
    },
    [transformFormData, successMessage, checkDeclaredAndExecute, type, salesRepo, purchasesRepo, setInvoices]
  );

  const handleSelectionChange = useCallback((rows: InvoiceMap<T>[]) => {
    setSelectedRows(rows);
  }, []);

  // Opens the confirmation dialog
  const handleDiscardClick = useCallback(() => {
    if (selectedRows.length === 0) return;
    setIsDiscardDialogOpen(true);
  }, [selectedRows.length]);

  // Actual discard logic (called after confirmation) - OPTIMIZED: Use refs
  const handleDiscardConfirmed = useCallback(async () => {
    if (selectedRows.length === 0) return;

    const idsToRemove = selectedRows.map((row) => row.id).filter(Boolean) as number[];
    const rowCount = selectedRows.length;

    // Close dialog
    setIsDiscardDialogOpen(false);

    // Check if period is declared before proceeding
    await checkDeclaredAndExecute('delete', async () => {
      // Compute before the optimistic state update — invoicesRef syncs via useEffect (after render)
      const updatedInvoices = invoicesRef.current.filter((inv) => inv.id && !idsToRemove.includes(inv.id));

      // Optimistically update UI
      deleteMultipleInvoices(idsToRemove);
      setSelectedRows([]);

      // Persist changes to database
      const saved = await autoSaveRecordsRef.current(updatedInvoices);

      if (saved) {
        showSuccess('Registros eliminados', {
          description: `Se eliminaron ${rowCount} registro${rowCount === 1 ? '' : 's'} correctamente.`
        });
      } else {
        // If save failed, show error (autoSaveRecords already shows toast)
      }
    });
  }, [selectedRows, deleteMultipleInvoices, checkDeclaredAndExecute]); // ✅ Reduced from 5 to 3 dependencies

  // Cell edit handler - saves changes and reloads data from database - OPTIMIZED: Use refs
  const handleCellEdit = useCallback(
    async (rowId: number, columnId: string, newValue: unknown) => {
      const currentCompany = companyRef.current;
      const currentPeriod = selectedPeriodRef.current;

      if (!currentCompany || !currentPeriod) {
        return;
      }

      // Check if period is declared before proceeding
      await checkDeclaredAndExecute('edit', async () => {
        try {
          // Find the current invoice
          const invoice = invoicesRef.current.find((inv) => inv.id === rowId);
          if (!invoice) {
            return;
          }

          // Calculate related fields using centralized logic
          let fieldsToUpdate: Partial<InvoiceMap<T>>;

          if (type === 'sales') {
            fieldsToUpdate = calculateSalesRelatedFields(invoice as SalesInvoice, columnId, newValue) as Partial<
              InvoiceMap<T>
            >;
          } else {
            fieldsToUpdate = calculatePurchaseRelatedFields(invoice as PurchaseInvoice, columnId, newValue) as Partial<
              InvoiceMap<T>
            >;
          }

          // Validación PVSIRE-parity cell-by-cell: aplicar los cambios sobre una copia
          // del invoice y correr el validator de la fila. Si los errores tocan algún
          // campo que estamos editando, abortar el guardado — nunca persistir datos
          // que SUNAT rechazaría al exportar.
          const proposed = { ...invoice, ...fieldsToUpdate } as InvoiceMap<T>;
          const validation =
            type === 'sales'
              ? validateRvieRow(proposed as SalesInvoice, currentPeriod)
              : validateRceRow(proposed as PurchaseInvoice, currentPeriod);

          if (!validation.ok) {
            const editedFields = new Set(Object.keys(fieldsToUpdate));
            const blocking = validation.errors.filter((e) => editedFields.has(e.field));
            if (blocking.length > 0) {
              const first = blocking[0];
              showError('Valor inválido para SIRE', {
                description: `${first.field} (PVSIRE ${first.code}): ${first.message}`
              });
              return;
            }
          }

          // ⭐ OPTIMIZED: Save all updated fields with a SINGLE database query
          // Instead of N separate UPDATEs, this executes ONE UPDATE with multiple SET clauses
          // Example: UPDATE table SET field1 = ?, field2 = ?, field3 = ? WHERE id = ?
          const fieldsMap: Record<string, string | number | null> = {};
          for (const [field, value] of Object.entries(fieldsToUpdate)) {
            fieldsMap[field] = value as string | number | null;
          }

          if (type === 'sales') {
            await salesRepo.updateFields(currentCompany.id, currentPeriod, rowId, fieldsMap);
          } else {
            await purchasesRepo.updateFields(currentCompany.id, currentPeriod, rowId, fieldsMap);
          }

          // Merge the just-saved fields into local state. The DB row matches now —
          // no need to re-fetch hundreds/thousands of rows after a single cell edit.
          updateInvoice(rowId, fieldsToUpdate);

          showSuccess(Object.keys(fieldsToUpdate).length > 1 ? 'Campos actualizados' : 'Celda actualizada', {
            description:
              Object.keys(fieldsToUpdate).length > 1
                ? `Se actualizaron ${Object.keys(fieldsToUpdate).length} campos correctamente.`
                : 'El cambio se guardó correctamente.'
          });
        } catch (error) {
          showError('Error al guardar', {
            description: 'No se pudo guardar el cambio.'
          });

          throw error;
        }
      });
    },
    [type, salesRepo, purchasesRepo, checkDeclaredAndExecute, updateInvoice]
  );

  // ✅ OPTIMIZED: Lazy calculation de PDF data usando refs (no dependencies!)
  const calculatePDFReportData = useCallback((): PeriodSummaryData | undefined => {
    const currentCompany = companyRef.current;
    const currentPeriod = selectedPeriodRef.current;
    const currentInvoices = invoicesRef.current;
    const currentPeriodData = periodRef.current;

    if (!currentCompany || !currentPeriod || currentInvoices.length === 0) {
      return undefined;
    }

    const periodFormatted = currentPeriod.replace(/^(\d{4})(\d{2})$/, '$1/$2');
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const transactionDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    // Leer isDeclared del contexto
    const isDeclared =
      type === 'sales' ? currentPeriodData?.salesDeclared || false : currentPeriodData?.purchasesDeclared || false;

    if (type === 'sales') {
      const salesTotals = currentInvoices.reduce(
        (acc, invoice) => {
          const salesInv = invoice as SalesInvoice;
          acc.taxableBase += salesInv.taxableBase || 0;
          acc.vatTotal += salesInv.vatAmount || 0;
          acc.totalAmount += salesInv.totalAmount || 0;
          return acc;
        },
        {
          taxableBase: 0,
          vatTotal: 0,
          totalAmount: 0
        }
      );

      return {
        ruc: currentCompany.ruc,
        businessName: currentCompany.businessName,
        registryType: 'RVIE',
        period: periodFormatted,
        isDeclared,
        recordCount: currentInvoices.length,
        transactionDate,
        totals: salesTotals
      };
    } else {
      const purchasesTotals = currentInvoices.reduce(
        (acc, invoice) => {
          const purchaseInv = invoice as PurchaseInvoice;
          acc.taxableBasePurchases += purchaseInv.taxableBaseTaxed || 0;
          acc.vatPurchases += purchaseInv.vatAmountTaxed || 0;
          acc.nonTaxableAmount += purchaseInv.nonTaxableValue || 0;
          acc.totalAmount += purchaseInv.totalAmount || 0;
          return acc;
        },
        {
          taxableBasePurchases: 0,
          vatPurchases: 0,
          nonTaxableAmount: 0,
          totalAmount: 0
        }
      );

      return {
        ruc: currentCompany.ruc,
        businessName: currentCompany.businessName,
        registryType: 'RVCE',
        period: periodFormatted,
        isDeclared,
        recordCount: currentInvoices.length,
        transactionDate,
        totals: purchasesTotals
      };
    }
  }, [type]); // ✅ Solo 'type' como dependency - los refs se sincronizan automáticamente

  if (!company) {
    return <EmptyStateView type="no-company" onNavigateHome={() => navigate('/')} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* ✅ NUEVO: Header con composición - SIN PROPS HELL */}
      <InvoiceListHeader>
        {/* Left side */}
        <div className="flex items-center gap-4">
          <InvoiceListHeader.Back onBack={() => handleNavigation('/')} />

          <InvoiceListHeader.Title title={title} period={selectedPeriod} recordCount={invoices.length} />

          {selectedPeriod && <DeclaredToggle type={type} disabled={isLoadingData || isImporting || isExporting} />}
        </div>

        {/* Right side */}
        <InvoiceListHeader.Actions>
          {selectedPeriod && (
            <>
              <ImportButton
                onImport={handleImportClick}
                isImporting={isImporting}
                disabled={isLoadingData || isExporting}
              />

              <ExportButton
                onExport={handleExportClick}
                isExporting={isExporting}
                disabled={isLoadingData || isImporting || invoices.length === 0}
              />

              <ExportPDFButton
                onCalculateData={calculatePDFReportData}
                invoices={invoices as SalesInvoice[] | PurchaseInvoice[]}
                disabled={isLoadingData || isImporting || invoices.length === 0}
              />

              <AddInvoiceButton
                label={addButtonLabel}
                dialogTitle={dialogTitle}
                dialogDescription={dialogDescription}
                FormComponent={FormComponent}
                onSubmit={handleFormSubmit}
                disabled={isLoadingData || isImporting || isExporting}
              />
            </>
          )}

          <InvoiceListHeader.Loading isLoading={isLoadingData} />
        </InvoiceListHeader.Actions>
      </InvoiceListHeader>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        {!selectedPeriod ? (
          <EmptyStateView type="no-period" />
        ) : isLoadingData ? (
          <EmptyStateView type="loading" />
        ) : (
          <ErrorBoundary
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-destructive">Error al cargar la tabla</p>
                  <p className="text-sm text-muted-foreground">
                    Hubo un problema al renderizar los datos. Intenta recargar la página.
                  </p>
                </div>
              </div>
            }
          >
            <DataTable
              key={type}
              columns={tableColumns}
              data={invoices}
              onSelectionChange={handleSelectionChange}
              onDiscardSelected={handleDiscardClick}
              onCellEdit={handleCellEdit}
              enableSelection
              totalsConfig={footerTotalsConfig}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Modal de confirmación de importación */}
      <ImportConfirmationDialog
        isOpen={importConfirmation.isOpen}
        onClose={() => setImportConfirmation({ isOpen: false, existingCount: 0, newData: null, format: null })}
        onConfirm={handleImportConfirmation}
        existingCount={importConfirmation.existingCount}
        newCount={importConfirmation.newData?.length || 0}
        type={type}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmDiscardDialog
        isOpen={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
        selectedCount={selectedRows.length}
        onConfirm={handleDiscardConfirmed}
        onCancel={() => setIsDiscardDialogOpen(false)}
      />

      {/* Modal de advertencia de periodo declarado */}
      <DeclaredPeriodWarningDialog
        open={declaredWarning.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeclaredWarning({ isOpen: false, operationType: null, onConfirm: null });
            // Resolve the pending Promise so callers don't hang
            if (declaredWarningResolveRef.current) {
              declaredWarningResolveRef.current(false);
              declaredWarningResolveRef.current = null;
            }
          }
        }}
        onConfirm={() => {
          if (declaredWarning.onConfirm) {
            declaredWarning.onConfirm();
            setDeclaredWarning({ isOpen: false, operationType: null, onConfirm: null });
          }
        }}
        periodCode={selectedPeriod || ''}
        operationType={declaredWarning.operationType || 'import'}
      />

      {/* Selector de oportunidad SIRE al exportar TXT */}
      <SireExportOptionsDialog
        open={sireOptionsOpen}
        onOpenChange={setSireOptionsOpen}
        onConfirm={handleSireOptionsConfirm}
      />
    </div>
  );
}
