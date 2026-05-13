import Papa from 'papaparse';
import type { ImportResult, ImportOptions } from './import-types';
import type { SupportedDataType } from '@/shared/types/common.types';

/**
 * Generic import utilities for CSV/TXT
 * Eliminates duplication between sales and purchases import logic
 */

/**
 * Generic field mapping interface for imports
 * Matches the FieldMapping interface from field-registry.ts
 */
export interface ImportFieldMapping {
  sunatHeader: string;
  tsField: string;
  dataType: SupportedDataType;
}

/**
 * Extended import options with callbacks for custom processing
 */
export interface ExtendedImportOptions extends ImportOptions {
  /** Custom ID generator function (generates temporary negative IDs for new records) */
  generateId?: () => number;
  /** Post-process each record after mapping (e.g., calculate vatPercentage) */
  postProcess?: <T>(record: Partial<T>) => void;
  /**
   * Validate and sanitize record (e.g., RUC validation, field truncation).
   * May return an array of warning messages to surface to the user.
   */
  validateRecord?: <T>(record: Partial<T>, rowNumber: number) => string[] | void;
  /** Check for extra columns not in mapping */
  strictColumnCheck?: boolean;
}

/**
 * Creates a generic CSV/TXT importer with configurable field mappings
 *
 * This factory function returns an importer object with methods for different delimited
 * formats (CSV, TXT, or custom). It eliminates code duplication by providing a reusable
 * import pipeline that can be configured for different invoice types.
 *
 * Features:
 * - Automatic column validation against expected mappings
 * - Type-safe data transformation (dates, numbers, strings)
 * - Error and warning collection for user feedback
 * - Support for multiple delimiters (comma, pipe, custom)
 * - Empty row handling (skip or warn)
 * - BOM (Byte Order Mark) handling for UTF-8 files
 * - Custom post-processing and validation callbacks
 *
 * The returned importer object provides three methods:
 * - fromCSV(): Import comma-separated values
 * - fromTXT(): Import pipe-separated values (SUNAT TXT format)
 * - fromDelimited(): Import with custom delimiter
 *
 * @param mappings - Array of field mappings (CSV header -> object field)
 * @param options - Import configuration options
 * @param options.requiredColumns - Columns that must be present (validation)
 * @param options.dateColumns - Fields to parse as dates
 * @param options.numberColumns - Fields to parse as numbers
 * @param options.skipEmptyRows - Whether to skip rows with no data (default: true)
 * @param options.strictColumnCheck - Check for extra columns not in mapping (default: false)
 * @param options.generateId - Custom ID generator function
 * @param options.postProcess - Post-process callback for each record
 * @param options.validateRecord - Validation/sanitization callback
 * @returns Importer object with fromCSV, fromTXT, and fromDelimited methods
 */
export function createImporter<T>(mappings: readonly ImportFieldMapping[], options: ExtendedImportOptions = {}) {
  const {
    requiredColumns = [],
    dateColumns = [],
    numberColumns = [],
    skipEmptyRows = true,
    strictColumnCheck = false,
    generateId,
    postProcess,
    validateRecord
  } = options;

  const sharedOptions = {
    requiredColumns,
    dateColumns,
    numberColumns,
    skipEmptyRows,
    strictColumnCheck,
    generateId,
    postProcess,
    validateRecord
  };

  return {
    fromCSV: async (content: string): Promise<ImportResult<T>> =>
      importFromDelimited<T>(content, ',', mappings, sharedOptions),
    fromTXT: async (content: string): Promise<ImportResult<T>> =>
      importFromDelimited<T>(content, '|', mappings, sharedOptions)
  };
}

/**
 * Import from delimited format (CSV/TXT)
 */
function importFromDelimited<T>(
  content: string,
  delimiter: string,
  mappings: readonly ImportFieldMapping[],
  options: ExtendedImportOptions
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: T[] = [];

    // Validate file is not empty
    if (!content || content.trim().length === 0) {
      resolve({
        success: false,
        data: [],
        errors: ['El archivo está vacío'],
        warnings: []
      });
      return;
    }

    // Parse the content with BOM handling
    Papa.parse<Record<string, string>>(content, {
      delimiter,
      header: true,
      skipEmptyLines: options.skipEmptyRows,
      // Remove BOM (Byte Order Mark) if present
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
      complete: (parseResult) => {
        // Check for parsing errors
        if (parseResult.errors.length > 0) {
          parseResult.errors.forEach((error) => {
            errors.push(`Error de parsing en línea ${error.row}: ${error.message}`);
          });
        }

        // Validation 1: Get CSV headers
        const csvHeaders = parseResult.meta.fields || [];

        if (csvHeaders.length === 0) {
          errors.push('No se pudieron leer las columnas del archivo');
          resolve({
            success: false,
            data: [],
            errors,
            warnings
          });
          return;
        }

        // Validation 2: Verify columns
        const missingColumns: string[] = [];
        const extraColumns: string[] = [];
        const expectedColumns = mappings.map((m) => m.sunatHeader);

        // Check for missing columns
        expectedColumns.forEach((expectedCol) => {
          if (!csvHeaders.includes(expectedCol)) {
            missingColumns.push(expectedCol);
          }
        });

        // Check for extra columns (if strict mode enabled)
        if (options.strictColumnCheck) {
          csvHeaders.forEach((csvHeader) => {
            if (!expectedColumns.includes(csvHeader)) {
              extraColumns.push(csvHeader);
            }
          });
        }

        // Report column errors
        if (missingColumns.length > 0 || extraColumns.length > 0) {
          if (missingColumns.length > 0) {
            errors.push(`Columnas faltantes (${missingColumns.length}): ${missingColumns.join(', ')}`);
          }
          if (extraColumns.length > 0) {
            errors.push(`Columnas extra no soportadas (${extraColumns.length}): ${extraColumns.join(', ')}`);
          }

          resolve({
            success: false,
            data: [],
            errors,
            warnings
          });
          return;
        }

        // Process rows
        let skippedRows = 0;

        parseResult.data.forEach((row, index) => {
          try {
            const record: Partial<T> = {} as Partial<T>;
            const recordMap = record as Record<string, string | number | null>;

            // Map all columns
            mappings.forEach((mapping) => {
              const csvValue = row[mapping.sunatHeader];
              const fieldName = mapping.tsField;

              if (!fieldName) {
                return; // Skip if no fieldName defined
              }

              // Empty values become null
              if (!csvValue || csvValue.trim() === '') {
                recordMap[fieldName] = null;
                return;
              }

              const trimmedValue = csvValue.trim();

              // Transform based on data type
              switch (mapping.dataType) {
                case 'date': {
                  const dateMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                  if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    recordMap[fieldName] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  } else {
                    recordMap[fieldName] = trimmedValue;
                  }
                  break;
                }

                case 'integer': {
                  // SUNAT usa coma como separador decimal en algunos campos. Normalizar antes de parsear.
                  // Si el valor no es parseable como entero, dejarlo como null y reportar warning —
                  // NUNCA forzarlo a 0, eso ocultaría montos inválidos como ceros reales en SIRE.
                  const normalized = trimmedValue.replace(/[\s,]/g, '');
                  if (!/^-?\d+$/.test(normalized)) {
                    recordMap[fieldName] = null;
                    warnings.push(
                      `Fila ${index + 2}: valor no numérico en "${mapping.sunatHeader}" → "${trimmedValue}"`
                    );
                    break;
                  }
                  recordMap[fieldName] = parseInt(normalized, 10);
                  break;
                }

                case 'float': {
                  // Reemplazar SOLO la coma decimal final, no separadores de miles.
                  // Si quedan caracteres no numéricos, fallar a null con warning.
                  const normalized = trimmedValue.replace(/,/g, '.');
                  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
                    recordMap[fieldName] = null;
                    warnings.push(
                      `Fila ${index + 2}: valor no numérico en "${mapping.sunatHeader}" → "${trimmedValue}"`
                    );
                    break;
                  }
                  recordMap[fieldName] = parseFloat(normalized);
                  break;
                }

                case 'string':
                default:
                  recordMap[fieldName] = trimmedValue;
                  break;
              }
            });

            // Post-process (e.g., calculate vatPercentage)
            if (options.postProcess) {
              options.postProcess(record);
            }

            // Validate and sanitize (e.g., RUC validation, field truncation)
            if (options.validateRecord) {
              const rowNumber = index + 2;
              const validationWarnings = options.validateRecord(record, rowNumber);
              if (validationWarnings && validationWarnings.length > 0) {
                warnings.push(...validationWarnings);
              }
            }

            // Generate ID
            if (options.generateId) {
              recordMap.id = options.generateId();
            } else if (!recordMap.id) {
              recordMap.id = `imported-${Date.now()}-${index}`;
            }

            // Add timestamps (cast to any to avoid type issues)
            (recordMap as Record<string, unknown>).createdAt = new Date();
            (recordMap as Record<string, unknown>).updatedAt = new Date();

            data.push(record as T);
          } catch (error) {
            // Track and report critical mapping errors
            skippedRows++;
            const rowNumber = index + 2;
            const errorMsg = error instanceof Error ? error.message : String(error);
            warnings.push(`Fila ${rowNumber}: Error al procesar - ${errorMsg}`);
          }
        });

        if (skippedRows > 0) {
          warnings.push(`⚠️ ${skippedRows} filas no se pudieron importar. Revisa la consola para más detalles.`);
        }

        if (data.length === 0) {
          errors.push('No se encontraron datos válidos en el archivo');
          resolve({
            success: false,
            data: [],
            errors,
            warnings
          });
          return;
        }

        resolve({
          success: errors.length === 0,
          data,
          errors,
          warnings
        });
      },
      error: (error: Error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Error al parsear archivo: ${error.message}`],
          warnings: []
        });
      }
    });
  });
}
