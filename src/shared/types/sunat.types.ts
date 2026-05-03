/**
 * SUNAT Invoice Type Definitions
 * Modular interfaces for SUNAT official formats
 */

/**
 * Calculated fields (not part of SUNAT format)
 * These fields are computed from SUNAT data for display/analysis
 */
export interface CalculatedFields {
  /** Calculated VAT percentage for display only */
  vatPercentage?: number | null;
}

/**
 * SUNAT Sales Registry Fields (40 columns)
 * Official SUNAT Sales and Income Registry format
 * Based on "Registro de Ventas e Ingresos Electrónico"
 */
export interface SunatSalesFields {
  // Issuer Information (4 fields)
  /** RUC - Registro Único del Contribuyente (11 digits) - CSV Column 1 */
  ruc: string | null;

  /** Legal business name of the issuer - CSV Column 2 */
  businessName: string | null;

  /** Tax period in YYYYMM format - CSV Column 3 */
  period: string | null;

  /** Sequential correlative number assigned by SUNAT - CSV Column 4 */
  sunatCorrelative: string | null;

  // Voucher Information (6 fields)
  /** Date when the voucher was issued - CSV Column 5 */
  issueDate: string | null;

  /** Due date or payment date - CSV Column 6 */
  dueDate: string | null;

  /** Type code of the payment voucher - CSV Column 7 */
  voucherType: string | null;

  /** Series identifier of the voucher - CSV Column 8 */
  voucherSeries: string | null;

  /** Sequential number of the voucher or initial number in range - CSV Column 9 */
  voucherNumber: string | null;

  /** Final number for voucher ranges - CSV Column 10 */
  voucherEndNumber: string | null;

  // Customer Information (3 fields)
  /** Type of customer identification document - CSV Column 11 */
  customerDocType: string | null;

  /** Customer identification document number - CSV Column 12 */
  customerDocNumber: string | null;

  /** Customer full name or business name - CSV Column 13 */
  customerName: string | null;

  // Export Operations (1 field)
  /** Billed export value - CSV Column 14 */
  exportValue: number | null;

  // Tax Amounts (6 fields)
  /** Taxable base amount subject to VAT - CSV Column 15 */
  taxableBase: number | null;

  /** Discount on taxable base - CSV Column 16 */
  taxableBaseDiscount: number | null;

  /** Value Added Tax or Municipal Promotion Tax amount - CSV Column 17 */
  vatAmount: number | null;

  /** Discount on VAT amount - CSV Column 18 */
  vatDiscount: number | null;

  /** Exempt amount (not subject to tax) - CSV Column 19 */
  exemptAmount: number | null;

  /** Unaffected amount (outside tax scope) - CSV Column 20 */
  unaffectedAmount: number | null;

  // Other Taxes (5 fields)
  /** Selective Consumption Tax amount - CSV Column 21 */
  selectiveConsumptionTax: number | null;

  /** Rice VAT taxable base - CSV Column 22 */
  riceVatBase: number | null;

  /** Hulled Rice Sales Tax - CSV Column 23 */
  riceVat: number | null;

  /** Single-use Plastic Bag Consumption Tax - CSV Column 24 */
  plasticBagTax: number | null;

  /** Sum of other applicable taxes - CSV Column 25 */
  otherTaxes: number | null;

  // Totals (1 field)
  /** Total voucher amount including all taxes - CSV Column 26 */
  totalAmount: number | null;

  // Currency Information (2 fields)
  /** Currency code (PEN=Peruvian Sol, USD=US Dollar) - CSV Column 27 */
  currency: string | null;

  /** Exchange rate applied (for foreign currency transactions) - CSV Column 28 */
  exchangeRate: number | null;

  // Modified Voucher Reference (4 fields)
  /** Issue date of the voucher being modified - CSV Column 29 */
  modifiedVoucherDate: string | null;

  /** Type of the voucher being modified - CSV Column 30 */
  modifiedVoucherType: string | null;

  /** Series of the voucher being modified - CSV Column 31 */
  modifiedVoucherSeries: string | null;

  /** Number of the voucher being modified - CSV Column 32 */
  modifiedVoucherNumber: string | null;

  // Additional Classification (7 fields)
  /** Attribution operators project ID - CSV Column 33 */
  attributionProjectId: string | null;

  /** Note type classification - CSV Column 34 */
  noteType: string | null;

  /** Current status of the voucher - CSV Column 35 */
  voucherStatus: string | null;

  /** FOB shipped value for export operations - CSV Column 36 */
  fobShippedValue: number | null;

  /** Value of free operations (no charge) - CSV Column 37 */
  freeOperationsValue: number | null;

  /** Operation type classification - CSV Column 38 */
  operationType: string | null;

  /** DAM / CP reference - CSV Column 39 */
  damCp: string | null;

  /** Free-use field for custom data - CSV Column 40 */
  freeUseField: string | null;
}

/**
 * SUNAT Purchase Registry Fields (80 columns)
 * Official SUNAT Purchase Registry format
 * Based on "Registro de Compras Electrónico"
 */
export interface SunatPurchaseFields {
  // Buyer Information (4 fields)
  /** RUC - Registro Único del Contribuyente (11 digits) - CSV Column 1 */
  ruc: string | null;

  /** Legal business name of the buyer - CSV Column 2 */
  businessName: string | null;

  /** Tax period in YYYYMM format - CSV Column 3 */
  period: string | null;

  /** Sequential correlative number assigned by SUNAT - CSV Column 4 */
  sunatCorrelative: string | null;

  // Voucher Information (7 fields)
  /** Date when the voucher was issued - CSV Column 5 */
  issueDate: string | null;

  /** Payment due date - CSV Column 6 */
  dueDate: string | null;

  /** Type code of the payment voucher - CSV Column 7 */
  voucherType: string | null;

  /** Series identifier of the voucher - CSV Column 8 */
  voucherSeries: string | null;

  /** Year of customs declaration (DUA/DSI) - CSV Column 9 */
  customsYear: string | null;

  /** Starting voucher number - CSV Column 10 */
  voucherNumberStart: string | null;

  /** Ending voucher number (for ranges) - CSV Column 11 */
  voucherNumberEnd: string | null;

  // Supplier Information (3 fields)
  /** Type of supplier identification document - CSV Column 12 */
  supplierDocType: string | null;

  /** Supplier identification document number - CSV Column 13 */
  supplierDocNumber: string | null;

  /** Supplier full name or business name - CSV Column 14 */
  supplierName: string | null;

  // Tax Bases - Taxed Operations (6 fields)
  /** Taxable base allocated to taxed operations with right to tax credit - CSV Column 15 */
  taxableBaseTaxed: number | null;

  /** VAT amount for taxed operations with right to tax credit - CSV Column 16 */
  vatAmountTaxed: number | null;

  /** Taxable base for mixed operations (taxed and untaxed) without full tax credit - CSV Column 17 */
  taxableBaseMixed: number | null;

  /** VAT amount for mixed operations without full tax credit - CSV Column 18 */
  vatAmountMixed: number | null;

  /** Taxable base for untaxed operations without right to tax credit - CSV Column 19 */
  taxableBaseUntaxed: number | null;

  /** VAT amount for untaxed operations without right to tax credit - CSV Column 20 */
  vatAmountUntaxed: number | null;

  // Additional Tax Amounts (5 fields)
  /** Value of non-taxable acquisitions - CSV Column 21 */
  nonTaxableValue: number | null;

  /** Selective Consumption Tax (ISC) amount - CSV Column 22 */
  selectiveConsumptionTax: number | null;

  /** Single-use Plastic Bag Consumption Tax - CSV Column 23 */
  plasticBagTax: number | null;

  /** Sum of other applicable taxes and charges - CSV Column 24 */
  otherTaxes: number | null;

  /** Total voucher amount including all taxes - CSV Column 25 */
  totalAmount: number | null;

  // Currency Information (2 fields)
  /** Currency code (PEN=Peruvian Sol, USD=US Dollar) - CSV Column 26 */
  currency: string | null;

  /** Exchange rate applied (for foreign currency transactions) - CSV Column 27 */
  exchangeRate: number | null;

  // Modified Voucher Reference (5 fields)
  /** Issue date of the voucher being modified - CSV Column 28 */
  modifiedVoucherDate: string | null;

  /** Type of the voucher being modified - CSV Column 29 */
  modifiedVoucherType: string | null;

  /** Series of the voucher being modified - CSV Column 30 */
  modifiedVoucherSeries: string | null;

  /** Customs declaration code (DAM or DSI) - CSV Column 31 */
  damCode: string | null;

  /** Number of the voucher being modified - CSV Column 32 */
  modifiedVoucherNumber: string | null;

  // Classification (9 fields)
  /** Goods and services classification - CSV Column 33 */
  goodsServicesClass: string | null;

  /** Irregular societies operators project ID - CSV Column 34 */
  operatorsProjectId: string | null;

  /** Participation percentage - CSV Column 35 */
  participationPercentage: number | null;

  /** Municipal bingo tax indicator - CSV Column 36 */
  municipalBingoTax: string | null;

  /** Original CAR / Export or import status indicator - CSV Column 37 */
  carExportImportIndicator: string | null;

  /** Detraction indicator - CSV Column 38 */
  detraction: string | null;

  /** Type of note (credit/debit) - CSV Column 39 */
  noteType: string | null;

  /** Current status of the voucher - CSV Column 40 */
  voucherStatus: string | null;

  /** Inconsistencies or qualification indicator - CSV Column 41 */
  inconsistencyIndicator: string | null;

  // Free-Use Fields (CLU1-CLU39) - 39 fields
  /** Free-use field 1 for custom data - CSV Column 42 */
  freeUseField1: string | null;

  /** Free-use field 2 for custom data - CSV Column 43 */
  freeUseField2: string | null;

  /** Free-use field 3 for custom data - CSV Column 44 */
  freeUseField3: string | null;

  /** Free-use field 4 for custom data - CSV Column 45 */
  freeUseField4: string | null;

  /** Free-use field 5 for custom data - CSV Column 46 */
  freeUseField5: string | null;

  /** Free-use field 6 for custom data - CSV Column 47 */
  freeUseField6: string | null;

  /** Free-use field 7 for custom data - CSV Column 48 */
  freeUseField7: string | null;

  /** Free-use field 8 for custom data - CSV Column 49 */
  freeUseField8: string | null;

  /** Free-use field 9 for custom data - CSV Column 50 */
  freeUseField9: string | null;

  /** Free-use field 10 for custom data - CSV Column 51 */
  freeUseField10: string | null;

  /** Free-use field 11 for custom data - CSV Column 52 */
  freeUseField11: string | null;

  /** Free-use field 12 for custom data - CSV Column 53 */
  freeUseField12: string | null;

  /** Free-use field 13 for custom data - CSV Column 54 */
  freeUseField13: string | null;

  /** Free-use field 14 for custom data - CSV Column 55 */
  freeUseField14: string | null;

  /** Free-use field 15 for custom data - CSV Column 56 */
  freeUseField15: string | null;

  /** Free-use field 16 for custom data - CSV Column 57 */
  freeUseField16: string | null;

  /** Free-use field 17 for custom data - CSV Column 58 */
  freeUseField17: string | null;

  /** Free-use field 18 for custom data - CSV Column 59 */
  freeUseField18: string | null;

  /** Free-use field 19 for custom data - CSV Column 60 */
  freeUseField19: string | null;

  /** Free-use field 20 for custom data - CSV Column 61 */
  freeUseField20: string | null;

  /** Free-use field 21 for custom data - CSV Column 62 */
  freeUseField21: string | null;

  /** Free-use field 22 for custom data - CSV Column 63 */
  freeUseField22: string | null;

  /** Free-use field 23 for custom data - CSV Column 64 */
  freeUseField23: string | null;

  /** Free-use field 24 for custom data - CSV Column 65 */
  freeUseField24: string | null;

  /** Free-use field 25 for custom data - CSV Column 66 */
  freeUseField25: string | null;

  /** Free-use field 26 for custom data - CSV Column 67 */
  freeUseField26: string | null;

  /** Free-use field 27 for custom data - CSV Column 68 */
  freeUseField27: string | null;

  /** Free-use field 28 for custom data - CSV Column 69 */
  freeUseField28: string | null;

  /** Free-use field 29 for custom data - CSV Column 70 */
  freeUseField29: string | null;

  /** Free-use field 30 for custom data - CSV Column 71 */
  freeUseField30: string | null;

  /** Free-use field 31 for custom data - CSV Column 72 */
  freeUseField31: string | null;

  /** Free-use field 32 for custom data - CSV Column 73 */
  freeUseField32: string | null;

  /** Free-use field 33 for custom data - CSV Column 74 */
  freeUseField33: string | null;

  /** Free-use field 34 for custom data - CSV Column 75 */
  freeUseField34: string | null;

  /** Free-use field 35 for custom data - CSV Column 76 */
  freeUseField35: string | null;

  /** Free-use field 36 for custom data - CSV Column 77 */
  freeUseField36: string | null;

  /** Free-use field 37 for custom data - CSV Column 78 */
  freeUseField37: string | null;

  /** Free-use field 38 for custom data - CSV Column 79 */
  freeUseField38: string | null;

  /** Free-use field 39 for custom data - CSV Column 80 */
  freeUseField39: string | null;
}
