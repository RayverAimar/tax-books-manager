/**
 * Database migrations - SUNAT Compliant Schema
 *
 * This file contains a single unified migration that creates the complete database schema
 * with field names that match the TypeScript interfaces (in snake_case format).
 *
 * All column names are derived directly from the SalesInvoice and PurchaseInvoice interfaces
 * to ensure perfect consistency between TypeScript types and database schema.
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'unified_sunat_schema',
    sql: `
      -- ============================================================================
      -- COMPANIES TABLE
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruc TEXT UNIQUE NOT NULL CHECK(length(ruc) = 11),
        business_name TEXT NOT NULL CHECK(length(trim(business_name)) >= 3),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================================
      -- APPLICATION SETTINGS TABLE
      -- ============================================================================
      -- SECURITY TODO: API Key Storage
      -- CURRENT: API keys stored in PLAIN TEXT in the 'value' column
      -- TODO: Implement cryptographic encryption before production release
      --       Recommended: XOR cipher with machine-uid based key derivation
      --       Dependencies: machine-uid, sha2, base64
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,  -- SECURITY: Stores sensitive data (API keys) in plain text - encrypt before production
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================================
      -- PERIODS TABLE
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        code TEXT NOT NULL CHECK(length(code) = 6),
        type TEXT NOT NULL CHECK(type IN ('sales', 'purchases')),
        has_data INTEGER DEFAULT 0,
        record_count INTEGER DEFAULT 0,
        total_amount REAL,
        last_modified DATETIME,
        declared INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE(company_id, code, type)
      );

      -- ============================================================================
      -- SALES RECORDS TABLE (40 SUNAT fields + calculated fields)
      -- Maps to: SalesInvoice interface
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS sales_records (
        -- System Fields
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Issuer Information (4 fields)
        ruc TEXT,
        business_name TEXT,
        period TEXT,
        sunat_correlative TEXT,

        -- Voucher Information (6 fields)
        issue_date TEXT,
        due_date TEXT,
        voucher_type TEXT,
        voucher_series TEXT,
        voucher_number TEXT,
        voucher_end_number TEXT,

        -- Customer Information (3 fields)
        customer_doc_type TEXT,
        customer_doc_number TEXT,
        customer_name TEXT,

        -- Export Operations (1 field)
        export_value REAL,

        -- Tax Amounts (6 fields)
        taxable_base REAL,
        taxable_base_discount REAL,
        vat_amount REAL,
        vat_discount REAL,
        exempt_amount REAL,
        unaffected_amount REAL,

        -- Other Taxes (5 fields)
        selective_consumption_tax REAL,
        rice_vat_base REAL,
        rice_vat REAL,
        plastic_bag_tax REAL,
        other_taxes REAL,

        -- Totals (1 field)
        total_amount REAL,

        -- Currency Information (2 fields)
        currency TEXT,
        exchange_rate REAL,

        -- Modified Voucher Reference (4 fields)
        modified_voucher_date TEXT,
        modified_voucher_type TEXT,
        modified_voucher_series TEXT,
        modified_voucher_number TEXT,

        -- Additional Classification (7 fields)
        attribution_project_id TEXT,
        note_type TEXT,
        voucher_status TEXT,
        fob_shipped_value REAL,
        free_operations_value REAL,
        operation_type TEXT,
        dam_cp TEXT,
        free_use_field TEXT,

        -- Calculated Fields
        vat_percentage REAL,

        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- ============================================================================
      -- PURCHASE RECORDS TABLE (80 SUNAT fields + calculated fields)
      -- Maps to: PurchaseInvoice interface
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS purchase_records (
        -- System Fields
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Buyer Information (4 fields)
        ruc TEXT,
        business_name TEXT,
        period TEXT,
        sunat_correlative TEXT,

        -- Voucher Information (7 fields)
        issue_date TEXT,
        due_date TEXT,
        voucher_type TEXT,
        voucher_series TEXT,
        customs_year TEXT,
        voucher_number_start TEXT,
        voucher_number_end TEXT,

        -- Supplier Information (3 fields)
        supplier_doc_type TEXT,
        supplier_doc_number TEXT,
        supplier_name TEXT,

        -- Tax Bases - Taxed Operations (6 fields)
        taxable_base_taxed REAL,
        vat_amount_taxed REAL,
        taxable_base_mixed REAL,
        vat_amount_mixed REAL,
        taxable_base_untaxed REAL,
        vat_amount_untaxed REAL,

        -- Additional Tax Amounts (5 fields)
        non_taxable_value REAL,
        selective_consumption_tax REAL,
        plastic_bag_tax REAL,
        other_taxes REAL,
        total_amount REAL,

        -- Currency Information (2 fields)
        currency TEXT,
        exchange_rate REAL,

        -- Modified Voucher Reference (5 fields)
        modified_voucher_date TEXT,
        modified_voucher_type TEXT,
        modified_voucher_series TEXT,
        dam_code TEXT,
        modified_voucher_number TEXT,

        -- Classification (9 fields)
        goods_services_class TEXT,
        operators_project_id TEXT,
        participation_percentage REAL,
        municipal_bingo_tax TEXT,
        car_export_import_indicator TEXT,
        detraction TEXT,
        note_type TEXT,
        voucher_status TEXT,
        inconsistency_indicator TEXT,

        -- Free-Use Fields (39 fields: freeUseField1 to freeUseField39)
        free_use_field1 TEXT,
        free_use_field2 TEXT,
        free_use_field3 TEXT,
        free_use_field4 TEXT,
        free_use_field5 TEXT,
        free_use_field6 TEXT,
        free_use_field7 TEXT,
        free_use_field8 TEXT,
        free_use_field9 TEXT,
        free_use_field10 TEXT,
        free_use_field11 TEXT,
        free_use_field12 TEXT,
        free_use_field13 TEXT,
        free_use_field14 TEXT,
        free_use_field15 TEXT,
        free_use_field16 TEXT,
        free_use_field17 TEXT,
        free_use_field18 TEXT,
        free_use_field19 TEXT,
        free_use_field20 TEXT,
        free_use_field21 TEXT,
        free_use_field22 TEXT,
        free_use_field23 TEXT,
        free_use_field24 TEXT,
        free_use_field25 TEXT,
        free_use_field26 TEXT,
        free_use_field27 TEXT,
        free_use_field28 TEXT,
        free_use_field29 TEXT,
        free_use_field30 TEXT,
        free_use_field31 TEXT,
        free_use_field32 TEXT,
        free_use_field33 TEXT,
        free_use_field34 TEXT,
        free_use_field35 TEXT,
        free_use_field36 TEXT,
        free_use_field37 TEXT,
        free_use_field38 TEXT,
        free_use_field39 TEXT,

        -- Calculated Fields
        vat_percentage REAL,

        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      -- ============================================================================
      -- INDEXES FOR PERFORMANCE
      -- ============================================================================

      -- Sales Records Indexes
      CREATE INDEX IF NOT EXISTS idx_sales_company_period
        ON sales_records(company_id, period);
      CREATE INDEX IF NOT EXISTS idx_sales_issue_date
        ON sales_records(issue_date);
      CREATE INDEX IF NOT EXISTS idx_sales_customer
        ON sales_records(customer_doc_number);
      CREATE INDEX IF NOT EXISTS idx_sales_voucher_type
        ON sales_records(voucher_type);
      CREATE INDEX IF NOT EXISTS idx_sales_series_number
        ON sales_records(voucher_series, voucher_number);
      CREATE INDEX IF NOT EXISTS idx_sales_client_lookup
        ON sales_records(company_id, period, customer_doc_number, customer_name);

      -- Purchase Records Indexes
      CREATE INDEX IF NOT EXISTS idx_purchases_company_period
        ON purchase_records(company_id, period);
      CREATE INDEX IF NOT EXISTS idx_purchases_issue_date
        ON purchase_records(issue_date);
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier
        ON purchase_records(supplier_doc_number);
      CREATE INDEX IF NOT EXISTS idx_purchases_voucher_type
        ON purchase_records(voucher_type);
      CREATE INDEX IF NOT EXISTS idx_purchases_series_number
        ON purchase_records(voucher_series, voucher_number_start);
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_lookup
        ON purchase_records(company_id, period, supplier_doc_number, supplier_name);

      -- Periods Index
      CREATE INDEX IF NOT EXISTS idx_periods_lookup
        ON periods(company_id, type, code);

      -- ============================================================================
      -- TRIGGERS FOR AUTOMATIC UPDATED_AT TIMESTAMPS
      -- ============================================================================

      CREATE TRIGGER IF NOT EXISTS update_companies_timestamp
        AFTER UPDATE ON companies
        FOR EACH ROW
        BEGIN
          UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_periods_timestamp
        AFTER UPDATE ON periods
        FOR EACH ROW
        BEGIN
          UPDATE periods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_sales_timestamp
        AFTER UPDATE ON sales_records
        FOR EACH ROW
        BEGIN
          UPDATE sales_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_purchases_timestamp
        AFTER UPDATE ON purchase_records
        FOR EACH ROW
        BEGIN
          UPDATE purchase_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      -- ============================================================================
      -- VERSION TRACKING
      -- ============================================================================

      INSERT OR REPLACE INTO app_settings (key, value) VALUES ('schema_version', '002');
      INSERT OR REPLACE INTO app_settings (key, value) VALUES ('app_version', '1.0.0');
    `
  }
];

export function getMigrations(): Migration[] {
  return migrations;
}
