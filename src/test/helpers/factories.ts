/**
 * Test data factories — deterministic, overridable.
 *
 * Use these instead of inlining 80-field objects in tests.
 */

import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { Company } from '@/core/domain/entities/company.entity';
import type { Period } from '@/core/domain/entities/period.entity';

/**
 * Builds a SalesInvoice with sensible defaults. Pass `overrides` to vary fields.
 */
export function aSalesInvoice(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 1,
    ruc: '20131312955',
    businessName: 'EMPRESA EJEMPLO SAC',
    period: '202401',
    sunatCorrelative: 'M0001',
    issueDate: '2024-01-15',
    dueDate: null,
    voucherType: '01',
    voucherSeries: 'F001',
    voucherNumber: '00000001',
    voucherEndNumber: null,
    customerDocType: '6',
    customerDocNumber: '20100070970',
    customerName: 'CLIENTE EJEMPLO',
    exportValue: null,
    taxableBase: 100,
    taxableBaseDiscount: null,
    vatAmount: 18,
    vatDiscount: null,
    exemptAmount: null,
    unaffectedAmount: null,
    selectiveConsumptionTax: null,
    riceVatBase: null,
    riceVat: null,
    plasticBagTax: null,
    otherTaxes: null,
    totalAmount: 118,
    currency: 'PEN',
    exchangeRate: null,
    modifiedVoucherDate: null,
    modifiedVoucherType: null,
    modifiedVoucherSeries: null,
    modifiedVoucherNumber: null,
    attributionProjectId: null,
    noteType: null,
    voucherStatus: '1',
    fobShippedValue: null,
    freeOperationsValue: null,
    operationType: null,
    damCp: null,
    freeUseField: null,
    vatPercentage: 18,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    ...overrides
  } as SalesInvoice;
}

/**
 * Builds a PurchaseInvoice with defaults. Includes all 39 freeUseFieldN as null.
 */
export function aPurchaseInvoice(overrides: Partial<PurchaseInvoice> = {}): PurchaseInvoice {
  const freeUseFields: Record<string, string | null> = {};
  for (let i = 1; i <= 39; i++) {
    freeUseFields[`freeUseField${i}`] = null;
  }

  return {
    id: 1,
    ruc: '20131312955',
    businessName: 'EMPRESA EJEMPLO SAC',
    period: '202401',
    // SIRE: CAR debe ir vacío en reemplazo de propuesta
    sunatCorrelative: null,
    issueDate: '2024-01-15',
    dueDate: null,
    voucherType: '01',
    voucherSeries: 'F001',
    customsYear: null,
    voucherNumberStart: '00000001',
    voucherNumberEnd: null,
    supplierDocType: '6',
    supplierDocNumber: '20100070970',
    supplierName: 'PROVEEDOR EJEMPLO',
    taxableBaseTaxed: 100,
    vatAmountTaxed: 18,
    taxableBaseMixed: null,
    vatAmountMixed: null,
    taxableBaseUntaxed: null,
    vatAmountUntaxed: null,
    nonTaxableValue: null,
    selectiveConsumptionTax: null,
    plasticBagTax: null,
    otherTaxes: null,
    totalAmount: 118,
    currency: 'PEN',
    exchangeRate: null,
    modifiedVoucherDate: null,
    modifiedVoucherType: null,
    modifiedVoucherSeries: null,
    damCode: null,
    modifiedVoucherNumber: null,
    goodsServicesClass: null,
    operatorsProjectId: null,
    participationPercentage: null,
    municipalBingoTax: null,
    carExportImportIndicator: null,
    // SIRE: pos 38-41 deben ir vacíos (SUNAT los autocompleta)
    detraction: null,
    noteType: null,
    voucherStatus: null,
    inconsistencyIndicator: null,
    vatPercentage: 18,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    ...freeUseFields,
    ...overrides
  } as unknown as PurchaseInvoice;
}

/**
 * Builds a Company entity with defaults.
 */
export function aCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 1,
    ruc: '20100070970',
    businessName: 'EMPRESA SAC',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides
  };
}

/**
 * Builds a Period entity with defaults.
 */
export function aPeriod(overrides: Partial<Period> = {}): Period {
  return {
    id: 1,
    companyId: 1,
    code: '202401',
    type: 'sales',
    hasData: false,
    recordCount: 0,
    totalAmount: 0,
    lastModified: null,
    declared: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides
  };
}
