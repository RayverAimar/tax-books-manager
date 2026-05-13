/**
 * Centralized Field Registry
 *
 * This is the single source of truth for all field mappings across the application.
 * Maps SUNAT CSV headers → TypeScript fields → Database columns → Human-readable labels
 *
 * Architecture:
 * - SUNAT CSV Headers: Exact column names from official SUNAT format (unchanged)
 * - TypeScript Fields: camelCase names used in interfaces and React components
 * - Database Columns: snake_case names used in SQLite tables
 * - Display Labels: Human-readable labels for UI display
 */

import type { SupportedDataType } from '@/shared/types/common.types';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { SunatSalesFields, SunatPurchaseFields, CalculatedFields } from '@/shared/types/sunat.types';

/**
 * Base field mapping interface for SUNAT import/export
 * Used for CSV import/export - only official SUNAT fields
 */
interface BaseSunatFieldMapping {
  /** SUNAT CSV header (exact format from official specification) */
  sunatHeader: string;
  /** Database column name (snake_case) */
  dbColumn: string;
  /** Human-readable label for UI */
  displayLabel: string;
  /** Data type */
  dataType: SupportedDataType;
  /** Field description */
  description: string;
  /**
   * Si es true, al exportar este campo emite valor vacío sin importar lo que
   * tenga en BD. Usar para posiciones SIRE que SUNAT completa automáticamente
   * (RCE pos 38-41) — el archivo debe tener la columna pero vacía.
   */
  sireAutoFilled?: boolean;
  /**
   * Decimales a emitir al exportar valores numéricos. Por defecto 2 (importes).
   * SIRE exige exactamente 3 para Tipo de Cambio (regex `^(?!0\.000)(\d\.\d{3})$`).
   */
  exportDecimals?: number;
}

/**
 * Base field mapping for table display
 * Used for DataTable columns - can include calculated fields
 * sunatHeader is optional because calculated fields don't come from CSV
 */
interface BaseTableColumnMapping {
  /** SUNAT CSV header (optional - calculated fields don't have this) */
  sunatHeader?: string;
  /** Database column name (snake_case) */
  dbColumn: string;
  /** Human-readable label for UI */
  displayLabel: string;
  /** Data type */
  dataType: SupportedDataType;
  /** Field description */
  description: string;
}

/**
 * Sales field mapping for import/export
 * Only includes official SUNAT fields (40 fields)
 */
export interface SalesFieldMapping extends BaseSunatFieldMapping {
  /** TypeScript field name (camelCase) - must be a key of SalesInvoice */
  tsField: keyof SalesInvoice;
}

/**
 * Purchase field mapping for import/export
 * Only includes official SUNAT fields (80 fields)
 */
export interface PurchaseFieldMapping extends BaseSunatFieldMapping {
  /** TypeScript field name (camelCase) - must be a key of PurchaseInvoice */
  tsField: keyof PurchaseInvoice;
}

/**
 * Sales table column mapping for DataTable display
 * Includes SUNAT fields + calculated fields (vatPercentage)
 */
export interface SalesTableColumnMapping extends BaseTableColumnMapping {
  /** TypeScript field name (camelCase) - must be a key of SalesInvoice */
  tsField: keyof SalesInvoice;
}

/**
 * Purchase table column mapping for DataTable display
 * Includes SUNAT fields + calculated fields (vatPercentage)
 */
export interface PurchaseTableColumnMapping extends BaseTableColumnMapping {
  /** TypeScript field name (camelCase) - must be a key of PurchaseInvoice */
  tsField: keyof PurchaseInvoice;
}

/**
 * Generic field mapping (for backwards compatibility)
 */
export type FieldMapping = SalesFieldMapping | PurchaseFieldMapping;

/**
 * SALES SUNAT COLUMNS MAPPING — RVIE (50 fields)
 * Estructura conforme al Anexo 3 de la RS 112-2021/SUNAT
 * Excel oficial: cpe.sunat.gob.pe/estructura-de-archivos (verificado 2026-05-12)
 *
 * IMPORTANTE: headers byte-a-byte como el Excel oficial (tildes, dobles espacios y todo)
 */
export const SALES_SUNAT_COLUMNS_MAPPING: readonly SalesFieldMapping[] = [
  // Datos del contribuyente (4 campos)
  {
    sunatHeader: 'RUC',
    tsField: 'ruc',
    dbColumn: 'ruc',
    displayLabel: 'RUC',
    dataType: 'string',
    description: 'RUC del contribuyente emisor (11 dígitos)'
  },
  {
    // TODO: SIRE define este campo como "ID" alfanumérico hasta 1500. Hoy
    // mapeamos businessName por compatibilidad; cuando definamos la semántica
    // (Task #7), cambiar a un campo dedicado.
    sunatHeader: 'ID',
    tsField: 'businessName',
    dbColumn: 'business_name',
    displayLabel: 'ID',
    dataType: 'string',
    description: 'ID alfanumérico hasta 1500 chars (SIRE pos 2 — semántica pendiente)'
  },
  {
    sunatHeader: 'Periodo',
    tsField: 'period',
    dbColumn: 'period',
    displayLabel: 'Periodo',
    dataType: 'string',
    description: 'Tax period in YYYYMM format'
  },
  {
    sunatHeader: 'CAR SUNAT',
    tsField: 'sunatCorrelative',
    dbColumn: 'sunat_correlative',
    displayLabel: 'CAR SUNAT',
    dataType: 'string',
    description: 'Sequential correlative number assigned by SUNAT'
  },

  // Voucher Information (6 fields)
  {
    sunatHeader: 'Fecha de emisión',
    tsField: 'issueDate',
    dbColumn: 'issue_date',
    displayLabel: 'Fecha de Emisión',
    dataType: 'date',
    description: 'Date when the voucher was issued'
  },
  {
    sunatHeader: 'Fecha Vcto/Pago',
    tsField: 'dueDate',
    dbColumn: 'due_date',
    displayLabel: 'Fecha Vcto/Pago',
    dataType: 'date',
    description: 'Due date or payment date'
  },
  {
    sunatHeader: 'Tipo CP/Doc.',
    tsField: 'voucherType',
    dbColumn: 'voucher_type',
    displayLabel: 'Tipo CP/Doc.',
    dataType: 'string',
    description: 'Type code of the payment voucher'
  },
  {
    sunatHeader: 'Serie del CDP',
    tsField: 'voucherSeries',
    dbColumn: 'voucher_series',
    displayLabel: 'Serie del CDP',
    dataType: 'string',
    description: 'Series identifier of the voucher'
  },
  {
    sunatHeader: 'Nro CP o Doc. Nro Inicial (Rango)',
    tsField: 'voucherNumber',
    dbColumn: 'voucher_number',
    displayLabel: 'Nro CP o Doc. Nro Inicial',
    dataType: 'string',
    description: 'Sequential number of the voucher or initial number in range'
  },
  {
    sunatHeader: 'Nro Final (Rango)',
    tsField: 'voucherEndNumber',
    dbColumn: 'voucher_end_number',
    displayLabel: 'Nro Final',
    dataType: 'string',
    description: 'Final number for voucher ranges'
  },

  // Customer Information (3 fields)
  {
    sunatHeader: 'Tipo Doc Identidad',
    tsField: 'customerDocType',
    dbColumn: 'customer_doc_type',
    displayLabel: 'Tipo Doc Identidad',
    dataType: 'string',
    description: 'Type of customer identification document'
  },
  {
    sunatHeader: 'Nro Doc Identidad',
    tsField: 'customerDocNumber',
    dbColumn: 'customer_doc_number',
    displayLabel: 'Nro Doc Identidad',
    dataType: 'string',
    description: 'Customer identification document number'
  },
  {
    sunatHeader: 'Apellidos Nombres/ Razon  Social',
    tsField: 'customerName',
    dbColumn: 'customer_name',
    displayLabel: 'Apellidos Nombres/ Razón Social',
    dataType: 'string',
    description: 'Nombre o razón social del cliente (SIRE: sin tilde y con doble espacio en header)'
  },

  // Export Operations (1 field)
  {
    sunatHeader: 'Valor Facturado Exportación',
    tsField: 'exportValue',
    dbColumn: 'export_value',
    displayLabel: 'Valor Facturado Exportación',
    dataType: 'float',
    description: 'Billed export value'
  },

  // Tax Amounts (6 fields)
  {
    sunatHeader: 'BI Gravada',
    tsField: 'taxableBase',
    dbColumn: 'taxable_base',
    displayLabel: 'BI Gravada',
    dataType: 'float',
    description: 'Taxable base amount subject to VAT'
  },
  {
    sunatHeader: 'Dscto BI',
    tsField: 'taxableBaseDiscount',
    dbColumn: 'taxable_base_discount',
    displayLabel: 'Dscto BI',
    dataType: 'float',
    description: 'Discount on taxable base'
  },
  {
    sunatHeader: 'IGV / IPM DG',
    tsField: 'vatAmount',
    dbColumn: 'vat_amount',
    displayLabel: 'IGV / IPM DG',
    dataType: 'float',
    description: 'IGV / IPM (Destinado a operaciones Gravadas)'
  },
  {
    sunatHeader: 'Dscto IGV / IPM',
    tsField: 'vatDiscount',
    dbColumn: 'vat_discount',
    displayLabel: 'Dscto IGV / IPM',
    dataType: 'float',
    description: 'Discount on VAT amount'
  },
  {
    sunatHeader: 'Mto Exonerado',
    tsField: 'exemptAmount',
    dbColumn: 'exempt_amount',
    displayLabel: 'Mto Exonerado',
    dataType: 'float',
    description: 'Exempt amount'
  },
  {
    sunatHeader: 'Mto Inafecto',
    tsField: 'unaffectedAmount',
    dbColumn: 'unaffected_amount',
    displayLabel: 'Mto Inafecto',
    dataType: 'float',
    description: 'Unaffected amount'
  },

  // Other Taxes (5 fields)
  {
    sunatHeader: 'ISC',
    tsField: 'selectiveConsumptionTax',
    dbColumn: 'selective_consumption_tax',
    displayLabel: 'ISC',
    dataType: 'float',
    description: 'Selective Consumption Tax amount'
  },
  {
    sunatHeader: 'BI Grav IVAP',
    tsField: 'riceVatBase',
    dbColumn: 'rice_vat_base',
    displayLabel: 'BI Grav IVAP',
    dataType: 'float',
    description: 'Rice VAT taxable base'
  },
  {
    sunatHeader: 'IVAP',
    tsField: 'riceVat',
    dbColumn: 'rice_vat',
    displayLabel: 'IVAP',
    dataType: 'float',
    description: 'Hulled Rice Sales Tax'
  },
  {
    sunatHeader: 'ICBPER',
    tsField: 'plasticBagTax',
    dbColumn: 'plastic_bag_tax',
    displayLabel: 'ICBPER',
    dataType: 'float',
    description: 'Plastic Bag Consumption Tax'
  },
  {
    sunatHeader: 'Otros Tributos',
    tsField: 'otherTaxes',
    dbColumn: 'other_taxes',
    displayLabel: 'Otros Tributos',
    dataType: 'float',
    description: 'Sum of other applicable taxes'
  },

  // Totals (1 field)
  {
    sunatHeader: 'Total CP',
    tsField: 'totalAmount',
    dbColumn: 'total_amount',
    displayLabel: 'Total CP',
    dataType: 'float',
    description: 'Total voucher amount including all taxes'
  },

  // Currency Information (2 fields)
  {
    sunatHeader: 'Moneda',
    tsField: 'currency',
    dbColumn: 'currency',
    displayLabel: 'Moneda',
    dataType: 'string',
    description: 'Currency code'
  },
  {
    sunatHeader: 'Tipo de Cambio',
    tsField: 'exchangeRate',
    dbColumn: 'exchange_rate',
    displayLabel: 'Tipo de Cambio',
    dataType: 'float',
    description: 'Tipo de cambio aplicado (1 entero + hasta 3 decimales)',
    exportDecimals: 3
  },

  // Modified Voucher Reference (4 fields)
  {
    sunatHeader: 'Fecha Emision Doc Modificado',
    tsField: 'modifiedVoucherDate',
    dbColumn: 'modified_voucher_date',
    displayLabel: 'Fecha Emisión Doc Modificado',
    dataType: 'date',
    description: 'Fecha de emisión del doc modificado (SIRE: header sin tilde en "Emision")'
  },
  {
    sunatHeader: 'Tipo CP Modificado',
    tsField: 'modifiedVoucherType',
    dbColumn: 'modified_voucher_type',
    displayLabel: 'Tipo CP Modificado',
    dataType: 'string',
    description: 'Type of the voucher being modified'
  },
  {
    sunatHeader: 'Serie CP Modificado',
    tsField: 'modifiedVoucherSeries',
    dbColumn: 'modified_voucher_series',
    displayLabel: 'Serie CP Modificado',
    dataType: 'string',
    description: 'Series of the voucher being modified'
  },
  {
    sunatHeader: 'Nro CP Modificado',
    tsField: 'modifiedVoucherNumber',
    dbColumn: 'modified_voucher_number',
    displayLabel: 'Nro CP Modificado',
    dataType: 'string',
    description: 'Number of the voucher being modified'
  },

  // ID de proyecto de operadores (1 campo, pos 33)
  {
    sunatHeader: 'ID Proyecto Operadores Atribución',
    tsField: 'attributionProjectId',
    dbColumn: 'attribution_project_id',
    displayLabel: 'ID Proyecto Operadores Atribución',
    dataType: 'string',
    description: 'ID del proyecto de operadores de atribución'
  },

  // CLU1..CLU17 — campos de libre uso del contribuyente (pos 34-50)
  // Nota: los campos PLE clásico (Tipo de Nota, Est. Comp, Valor FOB Embarcado,
  // Valor OP Gratuitas, Tipo Operación, DAM/CP) no son parte de la estructura RVIE
  // de SIRE — se mantienen en el tipo SunatSalesFields para compatibilidad pero
  // no se exportan.
  ...Array.from({ length: 17 }, (_, i) => {
    const n = i + 1;
    return {
      sunatHeader: `CLU${n}`,
      tsField: `freeUseField${n}` as keyof SalesInvoice,
      dbColumn: `free_use_field_${n}`,
      displayLabel: `CLU${n}`,
      dataType: 'string' as const,
      description: `Campo de libre uso ${n} (hasta 200 chars)`
    };
  })
] as const;

/**
 * PURCHASE SUNAT COLUMNS MAPPING (80 fields)
 * Based on SUNAT Electronic Purchase Registry (RCE)
 * Used for CSV import/export - official SUNAT fields only
 *
 * IMPORTANT: SUNAT headers are case-sensitive and must match official format exactly
 * Headers verified against real CSV file: /data/historical-migration-data/compras/202408.csv
 *
 * Includes:
 * - 41 core fields (buyer, voucher, supplier, taxes, currency, etc.)
 * - 39 Free-Use Code fields (CLU1-CLU39)
 */
export const PURCHASE_SUNAT_COLUMNS_MAPPING: readonly PurchaseFieldMapping[] = [
  // Buyer Information (4 fields)
  {
    sunatHeader: 'RUC',
    tsField: 'ruc',
    dbColumn: 'ruc',
    displayLabel: 'RUC',
    dataType: 'string',
    description: 'RUC - Registro Único del Contribuyente (11 digits)'
  },
  {
    sunatHeader: 'Apellidos y Nombres o Razón social',
    tsField: 'businessName',
    dbColumn: 'business_name',
    displayLabel: 'Razón Social',
    dataType: 'string',
    description: 'Legal business name of the buyer'
  },
  {
    sunatHeader: 'Periodo',
    tsField: 'period',
    dbColumn: 'period',
    displayLabel: 'Periodo',
    dataType: 'string',
    description: 'Tax period in YYYYMM format'
  },
  {
    sunatHeader: 'CAR SUNAT',
    tsField: 'sunatCorrelative',
    dbColumn: 'sunat_correlative',
    displayLabel: 'CAR SUNAT',
    dataType: 'string',
    description: 'Sequential correlative number assigned by SUNAT'
  },

  // Voucher Information (7 fields)
  {
    sunatHeader: 'Fecha de emisión',
    tsField: 'issueDate',
    dbColumn: 'issue_date',
    displayLabel: 'Fecha de Emisión',
    dataType: 'date',
    description: 'Date when the voucher was issued'
  },
  {
    sunatHeader: 'Fecha Vcto/Pago',
    tsField: 'dueDate',
    dbColumn: 'due_date',
    displayLabel: 'Fecha Vcto/Pago',
    dataType: 'date',
    description: 'Payment due date'
  },
  {
    sunatHeader: 'Tipo CP/Doc.',
    tsField: 'voucherType',
    dbColumn: 'voucher_type',
    displayLabel: 'Tipo CP/Doc.',
    dataType: 'string',
    description: 'Type code of the payment voucher'
  },
  {
    sunatHeader: 'Serie del CDP',
    tsField: 'voucherSeries',
    dbColumn: 'voucher_series',
    displayLabel: 'Serie del CDP',
    dataType: 'string',
    description: 'Series identifier of the voucher'
  },
  {
    sunatHeader: 'Año',
    tsField: 'customsYear',
    dbColumn: 'customs_year',
    displayLabel: 'Año',
    dataType: 'string',
    description: 'Year of customs declaration (DUA/DSI)'
  },
  {
    sunatHeader: 'Nro CP o Doc. Nro Inicial (Rango)',
    tsField: 'voucherNumberStart',
    dbColumn: 'voucher_number_start',
    displayLabel: 'Nro Inicial',
    dataType: 'string',
    description: 'Starting voucher number'
  },
  {
    sunatHeader: 'Nro Final (Rango)',
    tsField: 'voucherNumberEnd',
    dbColumn: 'voucher_number_end',
    displayLabel: 'Nro Final',
    dataType: 'string',
    description: 'Ending voucher number (for ranges)'
  },

  // Supplier Information (3 fields)
  {
    sunatHeader: 'Tipo Doc Identidad',
    tsField: 'supplierDocType',
    dbColumn: 'supplier_doc_type',
    displayLabel: 'Tipo Doc Identidad',
    dataType: 'string',
    description: 'Type of supplier identification document'
  },
  {
    sunatHeader: 'Nro Doc Identidad',
    tsField: 'supplierDocNumber',
    dbColumn: 'supplier_doc_number',
    displayLabel: 'Nro Doc Identidad',
    dataType: 'string',
    description: 'Supplier identification document number'
  },
  {
    sunatHeader: 'Apellidos Nombres/ Razón  Social',
    tsField: 'supplierName',
    dbColumn: 'supplier_name',
    displayLabel: 'Razón Social del Proveedor',
    dataType: 'string',
    description: 'Supplier full name or business name'
  },

  // Tax Bases - Taxed Operations (6 fields)
  {
    sunatHeader: 'BI Gravado DG',
    tsField: 'taxableBaseTaxed',
    dbColumn: 'taxable_base_taxed',
    displayLabel: 'BI Gravado DG',
    dataType: 'float',
    description: 'Taxable base allocated to taxed operations with right to tax credit'
  },
  {
    sunatHeader: 'IGV / IPM DG',
    tsField: 'vatAmountTaxed',
    dbColumn: 'vat_amount_taxed',
    displayLabel: 'IGV / IPM DG',
    dataType: 'float',
    description: 'VAT amount for taxed operations with right to tax credit'
  },
  {
    sunatHeader: 'BI Gravado DGNG',
    tsField: 'taxableBaseMixed',
    dbColumn: 'taxable_base_mixed',
    displayLabel: 'BI Gravado DGNG',
    dataType: 'float',
    description: 'Taxable base for mixed operations (taxed and untaxed) without full tax credit'
  },
  {
    sunatHeader: 'IGV / IPM DGNG',
    tsField: 'vatAmountMixed',
    dbColumn: 'vat_amount_mixed',
    displayLabel: 'IGV / IPM DGNG',
    dataType: 'float',
    description: 'VAT amount for mixed operations without full tax credit'
  },
  {
    sunatHeader: 'BI Gravado DNG',
    tsField: 'taxableBaseUntaxed',
    dbColumn: 'taxable_base_untaxed',
    displayLabel: 'BI Gravado DNG',
    dataType: 'float',
    description: 'Taxable base for untaxed operations without right to tax credit'
  },
  {
    sunatHeader: 'IGV / IPM DNG',
    tsField: 'vatAmountUntaxed',
    dbColumn: 'vat_amount_untaxed',
    displayLabel: 'IGV / IPM DNG',
    dataType: 'float',
    description: 'VAT amount for untaxed operations without right to tax credit'
  },

  // Additional Tax Amounts (5 fields)
  {
    sunatHeader: 'Valor Adq. NG',
    tsField: 'nonTaxableValue',
    dbColumn: 'non_taxable_value',
    displayLabel: 'Valor Adq. NG',
    dataType: 'float',
    description: 'Value of non-taxable acquisitions'
  },
  {
    sunatHeader: 'ISC',
    tsField: 'selectiveConsumptionTax',
    dbColumn: 'selective_consumption_tax',
    displayLabel: 'ISC',
    dataType: 'float',
    description: 'Selective Consumption Tax (ISC) amount'
  },
  {
    sunatHeader: 'ICBPER',
    tsField: 'plasticBagTax',
    dbColumn: 'plastic_bag_tax',
    displayLabel: 'ICBPER',
    dataType: 'float',
    description: 'Single-use Plastic Bag Consumption Tax'
  },
  {
    sunatHeader: 'Otros Trib/ Cargos',
    tsField: 'otherTaxes',
    dbColumn: 'other_taxes',
    displayLabel: 'Otros Tributos/Cargos',
    dataType: 'float',
    description: 'Sum of other applicable taxes and charges'
  },
  {
    sunatHeader: 'Total CP',
    tsField: 'totalAmount',
    dbColumn: 'total_amount',
    displayLabel: 'Total CP',
    dataType: 'float',
    description: 'Total voucher amount including all taxes'
  },

  // Currency Information (2 fields)
  {
    sunatHeader: 'Moneda',
    tsField: 'currency',
    dbColumn: 'currency',
    displayLabel: 'Moneda',
    dataType: 'string',
    description: 'Currency code (PEN=Peruvian Sol, USD=US Dollar)'
  },
  {
    sunatHeader: 'Tipo de Cambio',
    tsField: 'exchangeRate',
    dbColumn: 'exchange_rate',
    displayLabel: 'Tipo de Cambio',
    dataType: 'float',
    description: 'Exchange rate applied (for foreign currency transactions)',
    exportDecimals: 3
  },

  // Modified Voucher Reference (5 fields)
  {
    sunatHeader: 'Fecha Emisión Doc Modificado',
    tsField: 'modifiedVoucherDate',
    dbColumn: 'modified_voucher_date',
    displayLabel: 'Fecha Emisión Doc Modificado',
    dataType: 'date',
    description: 'Issue date of the voucher being modified'
  },
  {
    sunatHeader: 'Tipo CP Modificado',
    tsField: 'modifiedVoucherType',
    dbColumn: 'modified_voucher_type',
    displayLabel: 'Tipo CP Modificado',
    dataType: 'string',
    description: 'Type of the voucher being modified'
  },
  {
    sunatHeader: 'Serie CP Modificado',
    tsField: 'modifiedVoucherSeries',
    dbColumn: 'modified_voucher_series',
    displayLabel: 'Serie CP Modificado',
    dataType: 'string',
    description: 'Series of the voucher being modified'
  },
  {
    sunatHeader: 'COD. DAM O DSI',
    tsField: 'damCode',
    dbColumn: 'dam_code',
    displayLabel: 'Cód. DAM/DSI',
    dataType: 'string',
    description: 'Customs declaration code (DAM or DSI)'
  },
  {
    sunatHeader: 'Nro CP Modificado',
    tsField: 'modifiedVoucherNumber',
    dbColumn: 'modified_voucher_number',
    displayLabel: 'Nro CP Modificado',
    dataType: 'string',
    description: 'Number of the voucher being modified'
  },

  // Classification (9 fields)
  {
    sunatHeader: 'Clasif de Bss y Sss',
    tsField: 'goodsServicesClass',
    dbColumn: 'goods_services_class',
    displayLabel: 'Clasif. de Bienes y Servicios',
    dataType: 'string',
    description: 'Goods and services classification'
  },
  {
    sunatHeader: 'ID Proyecto Operadores/Participes',
    tsField: 'operatorsProjectId',
    dbColumn: 'operators_project_id',
    displayLabel: 'ID Proyecto Operadores/Participes',
    dataType: 'string',
    description: 'ID del proyecto de operadores/partícipes'
  },
  {
    sunatHeader: 'PorcPart',
    tsField: 'participationPercentage',
    dbColumn: 'participation_percentage',
    displayLabel: 'Porc. Participación',
    dataType: 'float',
    description: 'Participation percentage'
  },
  {
    sunatHeader: 'IMB',
    tsField: 'municipalBingoTax',
    dbColumn: 'municipal_bingo_tax',
    displayLabel: 'IMB',
    dataType: 'string',
    description: 'Municipal bingo tax indicator'
  },
  {
    sunatHeader: 'CAR Orig',
    tsField: 'carExportImportIndicator',
    dbColumn: 'car_export_import_indicator',
    displayLabel: 'CAR Orig',
    dataType: 'string',
    description: 'CAR original (referencia a comprobante original cuando se trata de NC/ND)'
  },
  // SIRE pos 38-41: SUNAT los completa automáticamente con la propuesta. En TXT
  // (sin cabecera) van como celdas vacías. En CSV (uso interno) usamos placeholders
  // descriptivos para evitar que el parser deduplique columnas con header vacío.
  {
    sunatHeader: 'SIRE_AUTO_38',
    tsField: 'detraction',
    dbColumn: 'detraction',
    displayLabel: '(SUNAT pos 38)',
    dataType: 'string',
    description: 'SIRE pos 38 — completado por SUNAT automáticamente',
    sireAutoFilled: true
  },
  {
    sunatHeader: 'SIRE_AUTO_39',
    tsField: 'noteType',
    dbColumn: 'note_type',
    displayLabel: '(SUNAT pos 39)',
    dataType: 'string',
    description: 'SIRE pos 39 — completado por SUNAT automáticamente',
    sireAutoFilled: true
  },
  {
    sunatHeader: 'SIRE_AUTO_40',
    tsField: 'voucherStatus',
    dbColumn: 'voucher_status',
    displayLabel: '(SUNAT pos 40)',
    dataType: 'string',
    description: 'SIRE pos 40 — completado por SUNAT automáticamente',
    sireAutoFilled: true
  },
  {
    sunatHeader: 'SIRE_AUTO_41',
    tsField: 'inconsistencyIndicator',
    dbColumn: 'inconsistency_indicator',
    displayLabel: '(SUNAT pos 41)',
    dataType: 'string',
    description: 'SIRE pos 41 — completado por SUNAT automáticamente',
    sireAutoFilled: true
  },

  // Free-Use Codes (CLU1-CLU39) - 39 fields
  ...Array.from({ length: 39 }, (_, i) => {
    const num = i + 1;
    return {
      sunatHeader: `CLU${num}`,
      tsField: `freeUseField${num}` as keyof PurchaseInvoice,
      dbColumn: `free_use_field${num}`,
      displayLabel: `Campo de Libre Uso ${num}`,
      dataType: 'string' as const,
      description: `Campo de Libre Uso ${num} para datos personalizados`
    } as PurchaseFieldMapping;
  })
] as const;

/**
 * ============================================================================
 * TABLE COLUMN MAPPINGS (for DataTable display)
 * ============================================================================
 * These extend the SUNAT field registries to include calculated fields
 * that should be displayed in tables but are NOT part of import/export
 */

/**
 * SALES TABLE COLUMNS MAPPING (40 SUNAT fields + 1 calculated field)
 * Extends SALES_SUNAT_COLUMNS_MAPPING with calculated fields
 * Used for DataTable display
 */
export const SALES_TABLE_COLUMNS_MAPPING: readonly SalesTableColumnMapping[] = [
  // Include all SUNAT fields (40 fields)
  ...SALES_SUNAT_COLUMNS_MAPPING.map(
    (field) =>
      ({
        sunatHeader: field.sunatHeader,
        tsField: field.tsField,
        dbColumn: field.dbColumn,
        displayLabel: field.displayLabel,
        dataType: field.dataType,
        description: field.description
      }) as SalesTableColumnMapping
  ),

  // Add calculated fields (not in CSV import/export)
  {
    // No sunatHeader - this is a calculated field
    tsField: 'vatPercentage',
    dbColumn: 'vat_percentage',
    displayLabel: '% IGV',
    dataType: 'float',
    description: 'Calculated VAT percentage (IGV/Base Imponible * 100)'
  }
] as const;

/**
 * PURCHASE TABLE COLUMNS MAPPING (80 SUNAT fields + 1 calculated field)
 * Extends PURCHASE_SUNAT_COLUMNS_MAPPING with calculated fields
 * Used for DataTable display
 */
export const PURCHASE_TABLE_COLUMNS_MAPPING: readonly PurchaseTableColumnMapping[] = [
  // Include all SUNAT fields (80 fields)
  ...PURCHASE_SUNAT_COLUMNS_MAPPING.map(
    (field) =>
      ({
        sunatHeader: field.sunatHeader,
        tsField: field.tsField,
        dbColumn: field.dbColumn,
        displayLabel: field.displayLabel,
        dataType: field.dataType,
        description: field.description
      }) as PurchaseTableColumnMapping
  ),

  // Add calculated fields (not in CSV import/export)
  {
    // No sunatHeader - this is a calculated field
    tsField: 'vatPercentage',
    dbColumn: 'vat_percentage',
    displayLabel: '% IGV',
    dataType: 'float',
    description: 'Calculated VAT percentage (IGV/Base Imponible * 100)'
  }
] as const;

/**
 * Creatable Sales Invoice type (for create operations)
 * Composition: SUNAT fields (40) + Calculated fields (1)
 * Excludes system fields: id, createdAt, updatedAt
 */
export type CreatableSalesInvoice = SunatSalesFields & CalculatedFields;

/**
 * Creatable Purchase Invoice type (for create operations)
 * Composition: SUNAT fields (80) + Calculated fields (1)
 * Excludes system fields: id, createdAt, updatedAt
 */
export type CreatablePurchaseInvoice = SunatPurchaseFields & CalculatedFields;

/**
 * Updatable field names for Sales (keys only)
 * Composition: SUNAT fields (40) + Calculated fields (1)
 * Excludes system fields: id, createdAt, updatedAt
 */
export type UpdatableSalesFields = keyof CreatableSalesInvoice;

/**
 * Updatable field names for Purchases (keys only)
 * Composition: SUNAT fields (80) + Calculated fields (1)
 * Excludes system fields: id, createdAt, updatedAt
 */
export type UpdatablePurchaseFields = keyof CreatablePurchaseInvoice;

/**
 * Allowed field names for Sales records (SUNAT fields + calculated fields)
 * Automatically derived from SALES_TABLE_COLUMNS_MAPPING
 * Used for validation in updateField() and updateFields() methods
 *
 * Note: Does NOT include system fields (id, createdAt, updatedAt)
 */
export const SALES_ALLOWED_FIELDS: ReadonlyArray<UpdatableSalesFields> = SALES_TABLE_COLUMNS_MAPPING.map(
  (m) => m.tsField
) as ReadonlyArray<UpdatableSalesFields>;

/**
 * Allowed field names for Purchase records (SUNAT fields + calculated fields)
 * Automatically derived from PURCHASE_TABLE_COLUMNS_MAPPING
 * Used for validation in updateField() and updateFields() methods
 *
 * Note: Does NOT include system fields (id, createdAt, updatedAt)
 */
export const PURCHASE_ALLOWED_FIELDS: ReadonlyArray<UpdatablePurchaseFields> = PURCHASE_TABLE_COLUMNS_MAPPING.map(
  (m) => m.tsField
) as ReadonlyArray<UpdatablePurchaseFields>;
