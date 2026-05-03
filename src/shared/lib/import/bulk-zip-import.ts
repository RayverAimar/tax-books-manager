import JSZip from 'jszip';
import { SALES_SUNAT_COLUMNS_MAPPING, PURCHASE_SUNAT_COLUMNS_MAPPING } from '@/shared/constants/field-registry';
import type { InvoiceType } from '@/shared/types/invoice.types';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { emitDataImported } from '@/shared/lib/events/data-events';

/**
 * File info extracted from ZIP
 */
export interface ZipFileInfo {
  path: string;
  period: string;
  type: InvoiceType;
  content: string;
}

/**
 * Validation error for a specific file
 */
export interface FileValidationError {
  filePath: string;
  error: string;
}

/**
 * Collision info for a period
 */
export interface PeriodCollision {
  period: string;
  type: InvoiceType;
  existingRecordCount: number;
}

/**
 * Result of ZIP validation
 */
export interface ZipValidationResult {
  success: boolean;
  filesProcessed: number;
  errors: FileValidationError[];
  validatedFiles?: ZipFileInfo[];
}

/**
 * Result of bulk import with collision detection
 */
export interface BulkImportResult {
  success: boolean;
  filesProcessed: number;
  recordsImported: number;
  errors: FileValidationError[];
  periodCollisions: PeriodCollision[];
}

/**
 * Get current period in YYYYMM format
 */
function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Validate period format and range
 */
function validatePeriod(period: string): { valid: boolean; error?: string } {
  // Check format YYYYMM
  if (!/^\d{6}$/.test(period)) {
    return {
      valid: false,
      error: `Formato de período inválido: ${period}. Debe ser YYYYMM (ej: 202408)`
    };
  }

  const month = parseInt(period.substring(4, 6));

  // Validate month
  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: `Mes inválido en período ${period}: ${month}`
    };
  }

  // Check minimum period (202408)
  if (period < '202408') {
    return {
      valid: false,
      error: `Período ${period} es anterior a Agosto 2024 (202408). Solo se aceptan períodos desde 202408 en adelante`
    };
  }

  // Check if period is in the future
  const currentPeriod = getCurrentPeriod();
  if (period > currentPeriod) {
    return {
      valid: false,
      error: `Período ${period} es futuro. El período actual es ${currentPeriod}`
    };
  }

  return { valid: true };
}

/**
 * Validate CSV/TXT headers against SUNAT format
 */
function validateFileHeaders(
  content: string,
  type: 'sales' | 'purchases',
  filePath: string
): { valid: boolean; error?: string } {
  // Get first line (headers)
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    return {
      valid: false,
      error: `Archivo ${filePath} está vacío`
    };
  }

  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  // Get expected headers
  const expectedHeaders =
    type === 'sales'
      ? SALES_SUNAT_COLUMNS_MAPPING.map((m) => m.sunatHeader)
      : PURCHASE_SUNAT_COLUMNS_MAPPING.map((m) => m.sunatHeader);

  const expectedCount = type === 'sales' ? 40 : 80;

  // Check column count
  if (headers.length !== expectedCount) {
    return {
      valid: false,
      error:
        `Archivo ${filePath} tiene ${headers.length} columnas, ` +
        `se esperaban ${expectedCount} columnas del formato SUNAT`
    };
  }

  // Check if headers match (case-insensitive, trimmed)
  const missingHeaders: string[] = [];
  const extraHeaders: string[] = [];

  for (const expected of expectedHeaders) {
    const found = headers.some((h) => h.toLowerCase().trim() === expected.toLowerCase().trim());
    if (!found) {
      missingHeaders.push(expected);
    }
  }

  for (const header of headers) {
    const found = expectedHeaders.some((e) => e.toLowerCase().trim() === header.toLowerCase().trim());
    if (!found) {
      extraHeaders.push(header);
    }
  }

  if (missingHeaders.length > 0 || extraHeaders.length > 0) {
    let errorMsg = `Archivo ${filePath} no cumple con el formato SUNAT:\n`;
    if (missingHeaders.length > 0) {
      const missing = missingHeaders.slice(0, 5).join(', ');
      const suffix = missingHeaders.length > 5 ? '...' : '';
      errorMsg += `  - Columnas faltantes: ${missing}${suffix}\n`;
    }
    if (extraHeaders.length > 0) {
      const extra = extraHeaders.slice(0, 5).join(', ');
      const suffix = extraHeaders.length > 5 ? '...' : '';
      errorMsg += `  - Columnas extra: ${extra}${suffix}`;
    }
    return {
      valid: false,
      error: errorMsg.trim()
    };
  }

  return { valid: true };
}

/**
 * Process ZIP file and extract structured data (validation only)
 */
export async function processZipFile(file: File): Promise<ZipValidationResult> {
  const result: ZipValidationResult = {
    success: false,
    filesProcessed: 0,
    errors: []
  };

  try {
    // Load ZIP file
    const zip = await JSZip.loadAsync(file);
    const files: ZipFileInfo[] = [];

    // Extract files from ZIP
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      // Skip directories
      if (zipEntry.dir) continue;

      // Skip hidden files like .DS_Store
      if (path.includes('/.') || path.startsWith('.')) continue;

      // Parse path: can be compras/YYYYMM.csv or parent-folder/compras/YYYYMM.csv
      const pathParts = path.split('/').filter((p) => p.length > 0);

      // Need at least 2 parts: folder/file or parent/folder/file
      if (pathParts.length < 2) {
        result.errors.push({
          filePath: path,
          error: 'Estructura de carpetas incorrecta. Los archivos deben estar en carpetas compras/ o ventas/'
        });
        continue;
      }

      // Get the last two parts (folder/file)
      const fileName = pathParts[pathParts.length - 1];
      const folder = pathParts[pathParts.length - 2].toLowerCase();

      // Validate folder name (case-insensitive)
      if (folder !== 'compras' && folder !== 'ventas') {
        result.errors.push({
          filePath: path,
          error: `Carpeta inválida: ${folder}. Solo se aceptan 'compras' o 'ventas'`
        });
        continue;
      }

      const type = folder === 'compras' ? 'purchases' : 'sales';

      // Validate file extension
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        result.errors.push({
          filePath: path,
          error: `Formato de archivo no soportado: ${fileName}. Solo se aceptan .csv y .txt`
        });
        continue;
      }

      // Extract period from filename (remove extension)
      const periodMatch = fileName.match(/^(\d{6})\.(csv|txt)$/);
      if (!periodMatch) {
        result.errors.push({
          filePath: path,
          error: `Nombre de archivo inválido: ${fileName}. Debe ser YYYYMM.csv o YYYYMM.txt`
        });
        continue;
      }

      const period = periodMatch[1];

      // Validate period
      const periodValidation = validatePeriod(period);
      if (!periodValidation.valid) {
        result.errors.push({
          filePath: path,
          error: periodValidation.error!
        });
        continue;
      }

      // Read file content
      const content = await zipEntry.async('text');

      // Validate headers
      const headerValidation = validateFileHeaders(content, type, path);
      if (!headerValidation.valid) {
        result.errors.push({
          filePath: path,
          error: headerValidation.error!
        });
        continue;
      }

      files.push({
        path,
        period,
        type,
        content
      });
    }

    // If no valid files found
    if (files.length === 0) {
      result.errors.push({
        filePath: '',
        error: 'No se encontraron archivos válidos en el ZIP'
      });
      return result;
    }

    result.filesProcessed = files.length;
    result.success = true;

    return {
      ...result,
      validatedFiles: files // Return validated files for further processing
    };
  } catch (error) {
    result.errors.push({
      filePath: '',
      error: `Error al procesar el archivo ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`
    });
    return result;
  }
}

/**
 * Check for period collisions in the database
 */
export async function checkPeriodCollisions(files: ZipFileInfo[], companyId: number): Promise<PeriodCollision[]> {
  const periodRepo = RepositoryFactory.getPeriodRepository();
  const collisions: PeriodCollision[] = [];

  for (const file of files) {
    // Get available periods for this type
    const availablePeriods = await periodRepo.getAvailablePeriods(companyId, file.type);

    // Check if period exists and has data
    const existingPeriod = availablePeriods.find((p) => p.code === file.period && p.hasData);

    if (existingPeriod) {
      collisions.push({
        period: file.period,
        type: file.type,
        existingRecordCount: existingPeriod.recordCount || 0
      });
    }
  }

  return collisions;
}

/**
 * Import validated files into the database
 * @param overwriteDecisions - Map of period+type to 'overwrite' or 'append'
 */
export async function importValidatedFiles(
  files: ZipFileInfo[],
  companyId: number,
  overwriteDecisions: Map<string, 'overwrite' | 'append'>
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: false,
    filesProcessed: 0,
    recordsImported: 0,
    errors: [],
    periodCollisions: []
  };

  const { importSalesCSV } = await import('@/features/sales/lib/sales-import');
  const { importPurchasesCSV } = await import('@/features/purchases/lib/purchases-import');
  const salesRepo = RepositoryFactory.getSalesRepository();
  const purchasesRepo = RepositoryFactory.getPurchasesRepository();

  for (const file of files) {
    try {
      const fileKey = `${file.period}-${file.type}`;
      const userDecision = overwriteDecisions.get(fileKey);

      // If user chose 'append', we don't support it yet
      if (userDecision === 'append') {
        result.errors.push({
          filePath: file.path,
          error: `Período ${file.period} omitido - modo append no implementado aún`
        });
        continue;
      }

      // If no decision, it means there was no collision - just import as new data
      // If decision is 'overwrite', the save functions will delete existing data first

      // Import the file
      if (file.type === 'sales') {
        const importResult = await importSalesCSV(file.content);

        if (!importResult.success || !importResult.data) {
          result.errors.push({
            filePath: file.path,
            error: importResult.errors?.[0] || 'Error al importar ventas'
          });
          continue;
        }

        // replacePeriodRecords automatically deletes existing records (overwrite)
        await salesRepo.replacePeriodRecords(companyId, file.period, importResult.data);
        result.recordsImported += importResult.data.length;

        // Emit data change event to notify Dashboard and other components
        emitDataImported('sales', file.period, importResult.data.length, 'bulk-zip');
      } else {
        const importResult = await importPurchasesCSV(file.content);

        if (!importResult.success || !importResult.data) {
          result.errors.push({
            filePath: file.path,
            error: importResult.errors?.[0] || 'Error al importar compras'
          });
          continue;
        }

        // replacePeriodRecords automatically deletes existing records (overwrite)
        await purchasesRepo.replacePeriodRecords(companyId, file.period, importResult.data);
        result.recordsImported += importResult.data.length;

        // Emit data change event to notify Dashboard and other components
        emitDataImported('purchases', file.period, importResult.data.length, 'bulk-zip');
      }

      result.filesProcessed++;
    } catch (error) {
      result.errors.push({
        filePath: file.path,
        error: `Error al procesar ${file.path}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    }
  }

  result.success = result.errors.length === 0 && result.filesProcessed > 0;
  return result;
}
