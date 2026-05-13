/**
 * Orquestador de validación a nivel de fila (RVIE o RCE) usando todas las
 * validaciones individuales del validador PVSIRE-parity.
 *
 * Diseño: cada validador retorna un código de error PVSIRE (201-499, 807, 814, 817).
 * Este módulo:
 *  1. Aplica TODAS las validaciones aplicables al tipo de libro (RVIE o RCE).
 *  2. Devuelve un array de issues con campo, código de error y mensaje legible.
 *
 * Si querés un campo específico (ej. solo RUC), llamá al validator individual
 * importado de pvsire-validator.ts.
 */
import * as V from './pvsire-validator';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';
import type { InvoiceType } from '@/shared/types/invoice.types';

export interface PvsireRowIssue {
  /** Código de error PVSIRE (0 = OK, 201+ = error específico) */
  code: number;
  /** Campo del comprobante donde se detectó el error */
  field: string;
  /** Posición SIRE (1-50 RVIE / 1-80 RCE) */
  position?: number;
  /** Mensaje human-readable */
  message: string;
  /** severity: 'error' bloquea, 'warning' solo informa */
  severity: 'error' | 'warning';
}

export interface PvsireRowValidationResult {
  ok: boolean;
  errors: PvsireRowIssue[];
  warnings: PvsireRowIssue[];
}

// ============================================================================
// Diccionario código de error → mensaje user-friendly
// ============================================================================

const ERROR_MESSAGES: Record<number, string> = {
  201: 'Campo obligatorio vacío',
  202: 'Longitud incorrecta',
  203: 'Formato inválido (no cumple regex)',
  204: 'Período debe ser YYYYMM (mes 01-12)',
  205: 'Período no coincide con el declarado',
  206: 'Fecha calendario inválida',
  207: 'Fecha de emisión es anterior al período',
  208: 'Fecha de emisión es posterior al período',
  209: 'Fecha vencimiento inválida',
  210: 'Fecha vencimiento fuera de rango permitido',
  211: 'Tipo de comprobante no está en lista oficial',
  212: 'Longitud de serie incorrecta para este tipo',
  213: 'Serie no cumple el formato esperado',
  215: 'Longitud de número de CP incorrecta',
  216: 'Número de CP no es válido (debe ser numérico positivo)',
  217: 'Tipo de cambio debe ser 1 entero + 3 decimales',
  220: 'Valor debe ser positivo para este tipo de comprobante',
  221: 'Valor distinto de cero con formato inválido',
  223: 'Tipo de documento de identidad no está en Tabla 1',
  224: 'Campo no debe tener valor cuando no es nota',
  225: 'RUC no coincide con el declarante del libro',
  228: 'Tipo CP modificado no puede ser este (02/07)',
  229: 'Tipo de cambio no debe tener valor (moneda contabilidad)',
  230: 'Nota de crédito con valor pero sin fecha emisión doc modificado',
  231: 'IGV en NC con valor pero sin fecha emisión doc modificado',
  234: 'Fecha doc modificado posterior a fecha emisión',
  238: 'RUC no pasa validación módulo 11',
  // RCE 4xx
  401: 'Campo obligatorio vacío (RCE)',
  402: 'Longitud incorrecta (RCE)',
  403: 'Formato inválido (RCE)',
  404: 'Campo debe ir vacío en reemplazo (RCE)',
  405: 'RUC no coincide con declarante (RCE)',
  407: 'Mes inválido en período',
  408: 'Período no coincide con declarado',
  409: 'Período debe ser numérico',
  410: 'CAR SUNAT debe ir vacío en reemplazo',
  411: 'Fecha no parseable como dd/MM/yyyy',
  412: 'Fecha posterior al período (o electrónica en mismo período)',
  413: 'Fecha calendario inválida',
  414: 'Fecha vencimiento obligatoria para este tipo CP',
  415: 'Fecha vencimiento posterior al período (DAM/DSI)',
  416: 'Fecha vencimiento posterior al período sin operación',
  417: 'Fecha vencimiento del recibo público posterior al período+1',
  418: 'Tipo de comprobante prohibido en RCE',
  419: 'Serie de DAM/DSI debe ser código de aduana válido',
  420: 'Año inválido (<=1981 o > período)',
  421: 'Número Final no permitido para este tipo CP',
  422: 'Tipo/Número doc identidad obligatorio',
  423: 'Documento de identidad inválido',
  424: 'Si hay nro final, valor debe ser 0.00',
  425: 'Signo del valor incorrecto para tipo CP',
  426: 'Moneda no está en lista oficial',
  427: 'Tipo de cambio inválido o cero',
  428: 'Doc modificado obligatorio en NC/ND',
  429: 'Doc modificado no debe tener valor (no es NC/ND)',
  430: 'Fecha doc modificado calendario inválida',
  431: 'Fecha doc modificado posterior al período',
  432: 'Tipo CP modificado prohibido (02/03/12/13)',
  433: 'Código DAM/DSI no está en lista oficial de aduanas',
  439: 'PorcPart requerido cuando idProyecto inicia con 1',
  446: 'Clasificación Bss y Sss fuera de rango (debe ser 1-5)',
  499: 'Tipo de cambio no debería tener valor con esta moneda',
  807: 'Clasificación requerida cuando codBbSS=1',
  814: 'NC tipo 87 con fecha en mes diferente al período',
  817: 'Doc identidad bloqueado por SUNAT (lista negra)'
};

function msg(code: number): string {
  return ERROR_MESSAGES[code] ?? `Error desconocido (código ${code})`;
}

function err(field: string, code: number, position?: number): PvsireRowIssue {
  return { code, field, position, message: msg(code), severity: 'error' };
}

// ============================================================================
// Validación de fila RVIE (50 campos)
// ============================================================================

/**
 * Valida una fila RVIE completa.
 *
 * @param inv     SalesInvoice (datos de la factura)
 * @param period  Período declarado del libro (YYYYMM)
 *
 * @example
 *   const result = validateRvieRow(invoice, '202501');
 *   if (!result.ok) {
 *     for (const e of result.errors) {
 *       console.log(`${e.field}: ${e.message}`);
 *     }
 *   }
 */
export function validateRvieRow(inv: SalesInvoice, period: string): PvsireRowValidationResult {
  const errors: PvsireRowIssue[] = [];
  const warnings: PvsireRowIssue[] = [];

  // ---------------------------------------------------------------------------
  // Identificación (pos 1-3)
  // ---------------------------------------------------------------------------
  const rRuc = V.validaRucDeclarante(inv.ruc, inv.ruc ?? '');
  if (rRuc !== 0) errors.push(err('ruc', rRuc, 1));

  const rId = V.validaIdRazonSocial(inv.businessName);
  if (rId !== 0) errors.push(err('businessName', rId, 2));

  const rPer = V.validaPeriodo(inv.period, period);
  if (rPer !== 0) errors.push(err('period', rPer, 3));

  // ---------------------------------------------------------------------------
  // Comprobante (pos 5, 7, 8, 9)
  // ---------------------------------------------------------------------------
  const tipoCP = inv.voucherType ?? '';
  const rTipo = V.validaTipoComprobante(tipoCP, false);
  if (rTipo !== 0) errors.push(err('voucherType', rTipo, 7));

  const issueDateDDMM = toDDMMYYYY(inv.issueDate);
  const rFech = V.validaFechaEmision(issueDateDDMM, toDDMMYYYY(inv.dueDate), period, tipoCP);
  if (rFech !== 0) errors.push(err('issueDate', rFech, 5));

  const rSerie = V.validaNumSerie(inv.voucherSeries, tipoCP, false);
  if (rSerie !== 0) errors.push(err('voucherSeries', rSerie, 8));

  const rNum = V.validaNumCP(inv.voucherNumber, inv.voucherSeries ?? '', tipoCP, false);
  if (rNum !== 0) errors.push(err('voucherNumber', rNum, 9));

  // ---------------------------------------------------------------------------
  // Cliente (pos 11-13)
  // ---------------------------------------------------------------------------
  const rTipoDoc = V.validaTipoDocIdentidad(
    inv.customerDocType,
    tipoCP,
    inv.modifiedVoucherType ?? '',
    amt(inv.exportValue),
    amt(inv.totalAmount),
    inv.voucherEndNumber ?? '',
    false
  );
  if (rTipoDoc !== 0) errors.push(err('customerDocType', rTipoDoc, 11));

  const rNumDoc = V.validaNumDocIdentidad(inv.customerDocNumber, inv.customerDocType ?? '', tipoCP, false);
  if (rNumDoc !== 0) errors.push(err('customerDocNumber', rNumDoc, 12));

  // ---------------------------------------------------------------------------
  // Importes (pos 14-26). Para NC los validators de BI/IGV exigen que la fecha
  // de doc modificado caiga dentro del período declarado — pasamos la lista
  // (solo una fecha en nuestro modelo, vacía si no aplica).
  // ---------------------------------------------------------------------------
  const modDateDDMM = toDDMMYYYY(inv.modifiedVoucherDate);
  const fechaModList = modDateDDMM ? [modDateDDMM] : [];

  const rExport = V.validaValorFacturadoExportacion(amt(inv.exportValue), tipoCP);
  if (rExport !== 0) errors.push(err('exportValue', rExport, 14));

  const rBI = V.validaValorBIGravada(amt(inv.taxableBase), tipoCP, fechaModList, period);
  if (rBI !== 0) errors.push(err('taxableBase', rBI, 15));

  const rDsctoBI = V.validaValorDsctoBI(amt(inv.taxableBaseDiscount), tipoCP, fechaModList, period);
  if (rDsctoBI !== 0) errors.push(err('taxableBaseDiscount', rDsctoBI, 16));

  const rIGV = V.validaValorIGVIPM(amt(inv.vatAmount), tipoCP, fechaModList, period);
  if (rIGV !== 0) errors.push(err('vatAmount', rIGV, 17));

  const rDsctoIGV = V.validaValorDsctoIGVIPM(amt(inv.vatDiscount), tipoCP, fechaModList, period);
  if (rDsctoIGV !== 0) errors.push(err('vatDiscount', rDsctoIGV, 18));

  const rExo = V.validaValorMtoExonerado(amt(inv.exemptAmount), tipoCP);
  if (rExo !== 0) errors.push(err('exemptAmount', rExo, 19));

  const rIna = V.validaValorMtoInafecto(amt(inv.unaffectedAmount), tipoCP);
  if (rIna !== 0) errors.push(err('unaffectedAmount', rIna, 20));

  const rISC = V.validaValorISC(amt(inv.selectiveConsumptionTax), tipoCP);
  if (rISC !== 0) errors.push(err('selectiveConsumptionTax', rISC, 21));

  const rRiceBI = V.validaValorBIGravIVAP(amt(inv.riceVatBase), tipoCP);
  if (rRiceBI !== 0) errors.push(err('riceVatBase', rRiceBI, 22));

  const rRiceVat = V.validaValorIVAP(amt(inv.riceVat), tipoCP);
  if (rRiceVat !== 0) errors.push(err('riceVat', rRiceVat, 23));

  const rICB = V.validaValorICBPER(amt(inv.plasticBagTax), tipoCP);
  if (rICB !== 0) errors.push(err('plasticBagTax', rICB, 24));

  const rOtros = V.validaValorOtrosTributos(amt(inv.otherTaxes), tipoCP);
  if (rOtros !== 0) errors.push(err('otherTaxes', rOtros, 25));

  const rTotal = V.validaValorTotalCP(amt(inv.totalAmount), tipoCP);
  if (rTotal !== 0) errors.push(err('totalAmount', rTotal, 26));

  // ---------------------------------------------------------------------------
  // Moneda y tipo de cambio (pos 27-28)
  // ---------------------------------------------------------------------------
  const rMon = V.validaMoneda(inv.currency);
  if (rMon !== 0) errors.push(err('currency', rMon, 27));

  const rTC = V.validaTipoCambio(
    inv.exchangeRate != null ? String(inv.exchangeRate) : '',
    inv.currency ?? '',
    'PEN'
  );
  if (rTC !== 0) errors.push(err('exchangeRate', rTC, 28));

  // ---------------------------------------------------------------------------
  // Doc modificado para NC/ND (pos 29-32). Para CP que no son notas exige vacío.
  // ---------------------------------------------------------------------------
  const modType = inv.modifiedVoucherType ?? '';
  const modSeries = inv.modifiedVoucherSeries ?? '';
  const modNumber = inv.modifiedVoucherNumber ?? '';

  const rFEmMod = V.validaFechaEmisionMod(modDateDDMM, issueDateDDMM, tipoCP, period);
  if (rFEmMod !== 0) errors.push(err('modifiedVoucherDate', rFEmMod, 29));

  const rTCpMod = V.validaTipoCpMod(modType, tipoCP, modDateDDMM);
  if (rTCpMod !== 0) errors.push(err('modifiedVoucherType', rTCpMod, 30));

  const rNSerMod = V.validaNumSerieMod(modSeries, tipoCP, modType, false);
  if (rNSerMod !== 0) errors.push(err('modifiedVoucherSeries', rNSerMod, 31));

  const rNCpMod = V.validaNumCPMod(modNumber, tipoCP, modType, modSeries);
  if (rNCpMod !== 0) errors.push(err('modifiedVoucherNumber', rNCpMod, 32));

  // ---------------------------------------------------------------------------
  // ID Proyecto de atribución (pos 33)
  // ---------------------------------------------------------------------------
  const rIdProy = V.validaIdProyecto(inv.attributionProjectId);
  if (rIdProy !== 0) errors.push(err('attributionProjectId', rIdProy, 33));

  // ---------------------------------------------------------------------------
  // CLU (libre uso). RVIE solo define un campo libre vs los 39 de RCE.
  // ---------------------------------------------------------------------------
  const rCLU = V.validaCLU(inv.freeUseField);
  if (rCLU !== 0) errors.push(err('freeUseField', rCLU, 40));

  return { ok: errors.length === 0, errors, warnings };
}

// ============================================================================
// Validación de fila RCE (80 campos)
// ============================================================================

/**
 * Valida una fila RCE completa.
 *
 * @param inv     PurchaseInvoice (datos de la compra)
 * @param period  Período declarado del libro (YYYYMM)
 */
export function validateRceRow(inv: PurchaseInvoice, period: string): PvsireRowValidationResult {
  const errors: PvsireRowIssue[] = [];
  const warnings: PvsireRowIssue[] = [];

  // RUC contribuyente
  const rRuc = V.validaRucDeclaranteRCE(inv.ruc, inv.ruc ?? '');
  if (rRuc !== 0) errors.push(err('ruc', rRuc, 1));

  // Razón social
  const rId = V.validaIdRazonSocialRCE(inv.businessName);
  if (rId !== 0) errors.push(err('businessName', rId, 2));

  // Período
  const issueDateDDMM = toDDMMYYYY(inv.issueDate);
  const rPer = V.validaPeriodoRCE(inv.period, period, issueDateDDMM, inv.voucherType ?? '');
  if (rPer !== 0) errors.push(err('period', rPer, 3));

  // CAR SUNAT — debe ir vacío en reemplazo
  const rCar = V.validaCAR(inv.sunatCorrelative);
  if (rCar !== 0) errors.push(err('sunatCorrelative', rCar, 4));

  // Tipo CP
  const tipoCP = inv.voucherType ?? '';
  const rTipo = V.validaTipoComprobanteRCE(tipoCP);
  if (rTipo !== 0) errors.push(err('voucherType', rTipo, 7));

  // Fecha emisión
  const rFech = V.validaFechaEmisionRCE(issueDateDDMM, tipoCP, inv.voucherSeries ?? '', period, '3');
  if (rFech !== 0) errors.push(err('issueDate', rFech, 5));

  // Fecha vencimiento (importes para coherencia)
  const rVto = V.validaFechaVencimientoRCE(
    toDDMMYYYY(inv.dueDate),
    tipoCP,
    amt(inv.taxableBaseTaxed),
    amt(inv.vatAmountTaxed),
    amt(inv.taxableBaseMixed),
    amt(inv.vatAmountMixed),
    amt(inv.taxableBaseUntaxed),
    amt(inv.vatAmountUntaxed),
    period
  );
  if (rVto !== 0) errors.push(err('dueDate', rVto, 6));

  // Año (para DAM/DSI)
  const rAnio = V.validaAnioEmisionRCE(inv.customsYear, tipoCP, period);
  if (rAnio !== 0) errors.push(err('customsYear', rAnio, 9));

  // Serie
  const rSerie = V.validaNumSerieRCE(inv.voucherSeries, tipoCP);
  if (rSerie !== 0) errors.push(err('voucherSeries', rSerie, 8));

  // Nro CP
  const rNum = V.validaNumCPRCE(inv.voucherNumberStart, tipoCP, inv.voucherSeries ?? '');
  if (rNum !== 0) errors.push(err('voucherNumberStart', rNum, 10));

  // Nro Final (rango)
  const rNumFin = V.validaNroFinalRCE(
    inv.voucherNumberEnd,
    tipoCP,
    inv.voucherNumberStart ?? '',
    amt(inv.taxableBaseTaxed),
    amt(inv.vatAmountTaxed),
    amt(inv.taxableBaseMixed),
    amt(inv.vatAmountMixed),
    amt(inv.taxableBaseUntaxed),
    amt(inv.vatAmountUntaxed),
    amt(inv.totalAmount)
  );
  if (rNumFin !== 0) errors.push(err('voucherNumberEnd', rNumFin, 11));

  // Doc identidad proveedor
  const rTipoDoc = V.validaTipoDocIdentidadRCE(inv.supplierDocType, tipoCP, inv.voucherNumberEnd ?? '');
  if (rTipoDoc !== 0) errors.push(err('supplierDocType', rTipoDoc, 12));

  const rNumDoc = V.validaNumDocIdentidadRCE(
    inv.supplierDocNumber,
    tipoCP,
    inv.voucherNumberEnd ?? '',
    inv.supplierDocType ?? ''
  );
  if (rNumDoc !== 0) errors.push(err('supplierDocNumber', rNumDoc, 13));

  // Razón social proveedor
  const rRazSoc = V.validaRazonSocialClienteRCE(
    inv.supplierName,
    inv.supplierDocType ?? '',
    inv.voucherNumberEnd ?? '',
    tipoCP
  );
  if (rRazSoc !== 0) errors.push(err('supplierName', rRazSoc, 14));

  // Importes
  const idProy = inv.operatorsProjectId ?? '';
  const nroFin = inv.voucherNumberEnd ?? '';

  const rBI_DG = V.validaValorBIGravadaRCE(amt(inv.taxableBaseTaxed), tipoCP, idProy, nroFin);
  if (rBI_DG !== 0) errors.push(err('taxableBaseTaxed', rBI_DG, 15));

  const rIGV_DG = V.validaValorIGVIPMDG(
    amt(inv.vatAmountTaxed),
    tipoCP,
    idProy,
    nroFin,
    amt(inv.taxableBaseTaxed)
  );
  if (rIGV_DG !== 0) errors.push(err('vatAmountTaxed', rIGV_DG, 16));

  const rBI_DGNG = V.validaValorBIGravadaDGNG(amt(inv.taxableBaseMixed), tipoCP, idProy, nroFin);
  if (rBI_DGNG !== 0) errors.push(err('taxableBaseMixed', rBI_DGNG, 17));

  const rIGV_DGNG = V.validaValorIGVIPMDGNG(
    amt(inv.vatAmountMixed),
    tipoCP,
    idProy,
    nroFin,
    amt(inv.taxableBaseMixed)
  );
  if (rIGV_DGNG !== 0) errors.push(err('vatAmountMixed', rIGV_DGNG, 18));

  const rBI_DNG = V.validaValorBIGravadaDNG(amt(inv.taxableBaseUntaxed), tipoCP, idProy, nroFin);
  if (rBI_DNG !== 0) errors.push(err('taxableBaseUntaxed', rBI_DNG, 19));

  const rIGV_DNG = V.validaValorIGVIPMDNG(
    amt(inv.vatAmountUntaxed),
    tipoCP,
    idProy,
    nroFin,
    amt(inv.taxableBaseUntaxed)
  );
  if (rIGV_DNG !== 0) errors.push(err('vatAmountUntaxed', rIGV_DNG, 20));

  const rAdq = V.validaValorAdqNG(amt(inv.nonTaxableValue), tipoCP, idProy);
  if (rAdq !== 0) errors.push(err('nonTaxableValue', rAdq, 21));

  const rISC = V.validaValorISCRCE(amt(inv.selectiveConsumptionTax), tipoCP, idProy);
  if (rISC !== 0) errors.push(err('selectiveConsumptionTax', rISC, 22));

  const rICB = V.validaValorICBPERRCE(amt(inv.plasticBagTax), tipoCP);
  if (rICB !== 0) errors.push(err('plasticBagTax', rICB, 23));

  const rOtros = V.validaValorOtrosTribRCE(amt(inv.otherTaxes), tipoCP, idProy);
  if (rOtros !== 0) errors.push(err('otherTaxes', rOtros, 24));

  const rTotal = V.validaValorTotalCPRCE(amt(inv.totalAmount), tipoCP, idProy);
  if (rTotal !== 0) errors.push(err('totalAmount', rTotal, 25));

  // Moneda y TC
  const rMon = V.validaMonedaRCE(inv.currency);
  if (rMon !== 0) errors.push(err('currency', rMon, 26));

  const rTC = V.validaTipoCambioRCE(
    inv.exchangeRate ? String(inv.exchangeRate) : '',
    inv.currency ?? '',
    'PEN'
  );
  if (rTC !== 0) errors.push(err('exchangeRate', rTC, 27));

  // Doc modificado (NC/ND)
  const rFEmMod = V.validaFechaEmisionModRCE(toDDMMYYYY(inv.modifiedVoucherDate), tipoCP, period);
  if (rFEmMod !== 0) errors.push(err('modifiedVoucherDate', rFEmMod, 28));

  const rTCpMod = V.validaTipoCPModRCE(inv.modifiedVoucherType, tipoCP);
  if (rTCpMod !== 0) errors.push(err('modifiedVoucherType', rTCpMod, 29));

  const rNSerMod = V.validaNumSerieCPModRCE(inv.modifiedVoucherSeries, tipoCP, inv.modifiedVoucherType ?? '');
  if (rNSerMod !== 0) errors.push(err('modifiedVoucherSeries', rNSerMod, 30));

  const rDam = V.validaCodDam(inv.damCode, inv.modifiedVoucherType ?? '');
  if (rDam !== 0) errors.push(err('damCode', rDam, 31));

  const rNCpMod = V.validaNumCPModRCE(inv.modifiedVoucherNumber, tipoCP);
  if (rNCpMod !== 0) errors.push(err('modifiedVoucherNumber', rNCpMod, 32));

  // Clasificación
  const rClasif = V.validaClasifBssSss(inv.goodsServicesClass, '0');
  if (rClasif !== 0) errors.push(err('goodsServicesClass', rClasif, 33));

  // PorcPart, IMB, etc.
  const rPorc = V.validaPorcPart(
    inv.participationPercentage ? String(inv.participationPercentage) : '',
    idProy,
    tipoCP
  );
  if (rPorc !== 0) errors.push(err('participationPercentage', rPorc, 35));

  const rImb = V.validaIMB(inv.municipalBingoTax, tipoCP);
  if (rImb !== 0) errors.push(err('municipalBingoTax', rImb, 36));

  // Campos que deben ir VACÍOS en reemplazo
  const rCarOrig = V.validaCAROrig(inv.carExportImportIndicator);
  if (rCarOrig !== 0) errors.push(err('carExportImportIndicator', rCarOrig, 37));

  const rDetr = V.validaDetraccion(inv.detraction);
  if (rDetr !== 0) errors.push(err('detraction', rDetr, 38));

  const rNota = V.validaCodTipoNota(inv.noteType);
  if (rNota !== 0) errors.push(err('noteType', rNota, 39));

  const rEst = V.validaCodEstCDP(inv.voucherStatus);
  if (rEst !== 0) errors.push(err('voucherStatus', rEst, 40));

  const rInc = V.validaInconsistencia(inv.inconsistencyIndicator);
  if (rInc !== 0) errors.push(err('inconsistencyIndicator', rInc, 41));

  return { ok: errors.length === 0, errors, warnings };
}

// ============================================================================
// API pública: validar lote
// ============================================================================

export interface PvsireBatchResult {
  ok: boolean;
  rowResults: Array<{ row: number; result: PvsireRowValidationResult }>;
  totalErrors: number;
  totalWarnings: number;
}

/**
 * Valida una lista de comprobantes contra las reglas PVSIRE-parity.
 *
 * @example
 *   const result = validateForPvsire(invoices, 'purchases', '202501');
 *   if (!result.ok) {
 *     for (const { row, result: r } of result.rowResults) {
 *       if (!r.ok) {
 *         console.log(`Fila ${row}: ${r.errors.length} errores`);
 *         r.errors.forEach((e) => console.log(`  ${e.field}: ${e.message}`));
 *       }
 *     }
 *   }
 */
export function validateForPvsire(
  invoices: (SalesInvoice | PurchaseInvoice)[],
  type: InvoiceType,
  period: string
): PvsireBatchResult {
  const rowResults: PvsireBatchResult['rowResults'] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  invoices.forEach((inv, idx) => {
    const result =
      type === 'sales'
        ? validateRvieRow(inv as SalesInvoice, period)
        : validateRceRow(inv as PurchaseInvoice, period);
    if (!result.ok) {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }
    rowResults.push({ row: idx + 1, result });
  });

  return {
    ok: totalErrors === 0,
    rowResults,
    totalErrors,
    totalWarnings
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Convierte fecha ISO (yyyy-mm-dd) a dd/MM/yyyy. Si ya está en ese formato, devuelve igual. */
function toDDMMYYYY(date: string | null | undefined): string {
  if (!date) return '';
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return date;
}

/**
 * Convierte importe a string. null/undefined → "0.00" (SIRE espera "0.00", no vacío).
 *
 * @example
 *   amt(100)     // "100.00"
 *   amt(null)    // "0.00"
 *   amt(0)       // "0.00"
 *   amt('5.50')  // "5.50"
 */
function amt(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '0.00';
  if (typeof v === 'number') return v.toFixed(2);
  // Si es string, intentar parsear y formatear
  const n = parseFloat(v);
  if (!isNaN(n)) return n.toFixed(2);
  return v;
}
