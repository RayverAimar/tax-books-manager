/**
 * Database-related constants
 *
 * These constants define the structure of database tables for SUNAT records.
 * The column counts include both SUNAT official fields and system fields.
 */

/**
 * Number of columns in sales_records table
 *
 * Breakdown:
 * - 1 company_id (system field for multi-tenant support)
 * - 40 SUNAT official fields (from SUNAT's sales registry format)
 * - 1 vat_percentage (calculated field for display/filtering)
 *
 * Note: id, year, created_at, updated_at are not counted as they are
 * auto-generated or managed by the database.
 */
export const SALES_RECORD_COLUMNS = 42;

/**
 * Number of columns in purchase_records table
 *
 * Breakdown:
 * - 1 company_id (system field for multi-tenant support)
 * - 80 SUNAT official fields (from SUNAT's purchase registry format)
 * - 1 vat_percentage (calculated field for display/filtering)
 *
 * Note: id, year, created_at, updated_at are not counted as they are
 * auto-generated or managed by the database.
 */
export const PURCHASE_RECORD_COLUMNS = 82;

/**
 * Batch sizes for bulk inserts
 *
 * SQLite has a limit of 999 parameters per query. We calculate batch sizes
 * to stay well under this limit based on the number of columns in each table.
 *
 * Formula: Max safe records = floor(999 / column_count)
 *
 * Sales records (42 columns):
 * - Theoretical max: 999 / 42 = 23 records
 * - Safe batch size: 100 records (actual implementation uses larger batches)
 *
 * Purchase records (82 columns):
 * - Theoretical max: 999 / 82 = 12 records
 * - Safe batch size: 50 records (actual implementation)
 *
 * Note: The actual SQLite limit in Tauri may be higher, allowing these larger batches.
 */
// floor(999 / 42) = 23, use 20 for safety
export const SALES_BATCH_SIZE = 20;
// floor(999 / 82) = 12, use 12
export const PURCHASES_BATCH_SIZE = 12;

/**
 * Legacy constant - use SALES_BATCH_SIZE or PURCHASES_BATCH_SIZE instead
 * @deprecated
 */
export const BULK_INSERT_BATCH_SIZE = 100;
