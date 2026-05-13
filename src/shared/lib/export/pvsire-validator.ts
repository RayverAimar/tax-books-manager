/**
 * Validador SIRE parity-with-PVSIRE.
 *
 * Cada función porta la lógica EXACTA de su contraparte Java en
 * ValidacionParametricoRVIE.java / ValidacionParametricoRCE.java (PVSIRE 1.7.0).
 *
 * Reglas (no cambiar la lógica, solo el lenguaje):
 *  - Mismos códigos de retorno (0=OK, 201=vacío, 202=longitud, etc.)
 *  - Mismas listas de tipos / patterns / módulo 11
 *  - Mismas excepciones por tipo de comprobante / doc identidad
 *
 * Si el comportamiento difiere de PVSIRE: es bug acá, no en PVSIRE.
 */
import {
  PVSIRE_VOUCHER_TYPES_RVIE,
  PVSIRE_VOUCHER_TYPES_INCLUIDOS,
  PVSIRE_VOUCHER_RULES,
  PVSIRE_DOC_IDENT_RULES,
  PVSIRE_DOC_IDENT_TYPES,
  PVSIRE_CURRENCY_CODES,
  PVSIRE_SERIE_PATTERNS,
  PVSIRE_REGEX,
  PVSIRE_ERROR_CODES,
  PVSIRE_AMOUNT_ERROR_CODES,
  PVSIRE_VOUCHER_CODES,
  PVSIRE_TIPO_CP_NOTA_CREDITO,
  PVSIRE_TIPO_CP_NC_BASICA,
  PVSIRE_TIPO_CP_SERVICIO_PUB,
  PVSIRE_RCE_ERROR_CODES,
  PVSIRE_RCE_TIPOS_PROHIBIDOS,
  PVSIRE_RCE_TIPOS_REQUIEREN_DAM,
  PVSIRE_CLASIF_BSS_VALIDOS
} from '@/shared/constants/pvsire-rules';
import {
  PVSIRE_RCE_COMPROBANTES,
  PVSIRE_RCE_TIPOS_CON_ANIO,
  PVSIRE_RCE_TIPOS_NUMCP_NUMERICO,
  PVSIRE_RCE_MONEDAS,
  PVSIRE_RCE_DOC_IDENTIDAD
} from '@/shared/constants/pvsire-rce-rules';
import {
  PVSIRE_RCE_PATER_NEGATIVO,
  PVSIRE_RCE_PATER_POSITIVO,
  PVSIRE_RCE_PATER_MONTO,
  PVSIRE_RCE_TIPO_CP_NEGATIVO,
  PVSIRE_RCE_TIPO_CP_POSNEG,
  PVSIRE_RCE_TIPO_CP_MYPE,
  PVSIRE_RCE_TIPO_CP_NOTAS,
  PVSIRE_RCE_MOD_ERROR_CODES
} from '@/shared/constants/pvsire-rules';
import { CompanyValidation } from '@/core/domain/entities/company.entity';

const E = { ...PVSIRE_ERROR_CODES, ...PVSIRE_AMOUNT_ERROR_CODES };
const ERCE = PVSIRE_RCE_ERROR_CODES;

// ============================================================================
// Utilitarios (port de pe.gob...util.Utilitario)
// ============================================================================

export function isNullOrEmpty(s: string | null | undefined): boolean {
  return s === null || s === undefined || s === '';
}

/** Replica Utilitario.esFechaValida — fecha dd/MM/yyyy válida en calendario */
export function isValidDate(date: string): boolean {
  if (!PVSIRE_REGEX.FECHA_DDMMYYYY.test(date)) return false;
  const parts = date.split(/[- /.]/);
  if (parts.length !== 3) return false;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Replica Utilitario.esDocumentoValido para RUC (módulo 11) */
export function isValidRucMod11(ruc: string): boolean {
  return CompanyValidation.isValidRuc(ruc);
}

/**
 * Replica ValidacionParametricoRVIE.validaExpresion.
 * Mapea clave de pattern a regex y aplica match.
 */
export function validaExpresion(value: string, patternKey: string): boolean {
  const re = PVSIRE_SERIE_PATTERNS[patternKey];
  if (!re) return false;
  return re.test(value);
}

/**
 * Replica ValidacionParametricoRVIE.validarDecimales.
 * Patrones del JAR (líneas 89-93):
 *  - tipo 1 POSNEG_NUMBER: -?\d{1,12}\.\d{1,2}  (1-2 decimales OBLIGATORIO)
 *  - tipo 2 NEG_NUMBER: -\d{1,12}([\.]\d{1,2})?
 *  - tipo 3 POS_NUMBER: \d{1,12}([\.]\d{1,2})?
 *  - tipo 4 NUMBER_TC: \d{1}([\.]\d{1,3})?  (tipo de cambio)
 *  - tipo 5 POSNEG_NUMBER_ENTERO: -?\d{1,12}([\.]\d{1,2})?
 */
export function validarDecimales(numero: string | null, tipoNumerico: number): boolean {
  if (isNullOrEmpty(numero)) return false;
  const patterns: Record<number, RegExp> = {
    1: /^-?\d{1,12}\.\d{1,2}$/,
    2: /^-\d{1,12}(\.\d{1,2})?$/,
    3: /^\d{1,12}(\.\d{1,2})?$/,
    4: /^\d{1}(\.\d{1,3})?$/,
    5: /^-?\d{1,12}(\.\d{1,2})?$/
  };
  const re = patterns[tipoNumerico];
  if (!re) return false;
  return re.test(numero!);
}

/** Replica validarFormatoTipoCambio (línea 1886) — debe ser 1 entero + 3 decimales exactos */
export function validarFormatoTipoCambio(tipoCambio: string): number {
  if (!/^-?\d+(\.\d+)?$/.test(tipoCambio)) return E.REGEX_FALLA;
  const abs = tipoCambio.replace(/^-/, '');
  const parts = abs.split('.');
  if (parts.length !== 2) return E.REGEX_FALLA;
  if (parts[0].length !== 1 || parts[1].length !== 3) return E.REGEX_FALLA;
  return E.OK;
}

/** Replica getCodigoTipoDoc — mapea código alfanumérico a índice numérico */
export function getCodigoTipoDoc(cod: string): number {
  const map: Record<string, number> = {
    '0': 0, '1': 1, '4': 4, '6': 6, '7': 7,
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15
  };
  return map[cod] ?? -1;
}

// ============================================================================
// validaRucDeclarante (línea 383 RVIE)
// ============================================================================
export function validaRucDeclarante(ruc: string | null, NUM_RUC: string): number {
  if (isNullOrEmpty(ruc)) return E.VACIO;
  if (ruc!.length !== 11) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.NUMERICO.test(ruc!)) return E.REGEX_FALLA;
  if (ruc !== NUM_RUC) return E.RUC_NO_COINCIDE_DECLARANTE;
  return E.OK;
}

// ============================================================================
// validaIdRazonSocial (línea 399 RVIE)
// ============================================================================
export function validaIdRazonSocial(nombre: string | null): number {
  if (isNullOrEmpty(nombre)) return E.VACIO;
  if (nombre!.length > 1500) return E.LONGITUD_INCORRECTA;
  // REGEX_NOMBRE_RAZONSOCIAL es "^[\\s\\S]*$" (acepta cualquier char, multilínea)
  return E.OK;
}

// ============================================================================
// validaPeriodo (línea 412 RVIE)
// ============================================================================
export function validaPeriodo(periodo: string | null, PERIODO: string): number {
  if (isNullOrEmpty(periodo)) return E.VACIO;
  if (periodo!.length !== 6) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.PERIODO_YYYYMM.test(periodo!)) return E.REGEX_PERIODO;
  if (periodo !== PERIODO) return E.PERIODO_NO_COINCIDE;
  return E.OK;
}

// ============================================================================
// validaFechaEmision (línea 428 RVIE)
// ============================================================================
export function validaFechaEmision(
  fechaEmision: string | null,
  fechaVencimiento: string | null,
  PER_PERI_TRIBUTA: string,
  codTipoCDP: string
): number {
  if (isNullOrEmpty(fechaEmision)) return E.VACIO;
  if (fechaEmision!.length !== 10) return E.LONGITUD_INCORRECTA;
  if (!isValidDate(fechaEmision!)) return E.FECHA_INVALIDA;

  const parts = fechaEmision!.split('/');
  if (parts.length !== 3) return E.FECHA_INVALIDA;
  if (!parts.every((p) => /^\d+$/.test(p))) return E.FECHA_INVALIDA;

  const [, m, y] = parts;
  const z = `${y}${m}`;
  const periodo = parseInt(PER_PERI_TRIBUTA, 10);
  const fechaEmi = parseInt(z, 10);

  if (codTipoCDP !== PVSIRE_VOUCHER_CODES.RECIBO_SERVICIO_PUBLICO) {
    if (fechaEmi < periodo) return E.FECHA_MENOR_PERIODO;
    if (fechaEmi > periodo) return E.FECHA_MAYOR_PERIODO;
  }

  // Validación especial para tipo 14 (recibo servicio público) con fecha vencimiento
  if (!isNullOrEmpty(fechaVencimiento)) {
    if (fechaVencimiento!.length !== 10) return E.OK;
    if (!isValidDate(fechaVencimiento!)) return E.OK;
    const partsV = fechaVencimiento!.split('/');
    const fechaVen = parseInt(`${partsV[2]}${partsV[1]}`, 10);
    if (
      fechaEmi !== periodo &&
      fechaVen !== periodo &&
      codTipoCDP === PVSIRE_VOUCHER_CODES.RECIBO_SERVICIO_PUBLICO
    ) {
      if (fechaEmi < periodo) return E.FECHA_MENOR_PERIODO;
      if (fechaEmi > periodo) return E.FECHA_MAYOR_PERIODO;
    }
  }
  return E.OK;
}

// ============================================================================
// validaTipoComprobante (línea 528 RVIE)
// ============================================================================
export function validaTipoComprobante(tipoCP: string | null, isIncluido: boolean): number {
  if (isNullOrEmpty(tipoCP)) return E.VACIO;
  if (tipoCP!.length !== 2) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.TIPO_CP.test(tipoCP!)) return E.REGEX_FALLA;
  if (!PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP!)) return E.TIPO_CP_NO_EN_LISTA;
  if (isIncluido && !PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipoCP!)) return E.TIPO_CP_NO_EN_LISTA;
  return E.OK;
}

// ============================================================================
// validaNumSerie (línea 547 RVIE)
// ============================================================================
export function validaNumSerie(numSerie: string | null, tipoCP: string, isIncluido: boolean): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  const esCompro = isIncluido
    ? PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipo)
    : PVSIRE_VOUCHER_TYPES_RVIE.has(tipo);

  if (!esCompro || !tipo.trim()) return E.OK;

  const rules = PVSIRE_VOUCHER_RULES[tipo];
  if (!rules) return E.OK;
  const sr = isIncluido ? rules.serieRules.incluido : rules.serieRules.normal;

  if (sr.required && isNullOrEmpty(numSerie)) return E.VACIO;
  if (isNullOrEmpty(numSerie)) return E.OK;

  const lenOk = sr.exactLength ? numSerie!.length === sr.maxLength : numSerie!.length <= sr.maxLength;
  if (!lenOk) return E.SERIE_LONGITUD;
  if (!validaExpresion(numSerie!, sr.regexKey)) return E.SERIE_REGEX;
  return E.OK;
}

// ============================================================================
// validaNumCP (línea 574 RVIE)
// ============================================================================
export function validaNumCP(
  numCP: string | null,
  numSerie: string,
  tipoCP: string,
  isIncluido: boolean
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  const esCompro = isIncluido
    ? PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipo)
    : PVSIRE_VOUCHER_TYPES_RVIE.has(tipo);
  if (!esCompro) return E.OK;

  const rules = PVSIRE_VOUCHER_RULES[tipo];
  if (!rules) return E.OK;
  const nr = rules.numCpRule;

  if (!nr.required && isNullOrEmpty(numCP)) return E.OK;
  if (nr.required && isNullOrEmpty(numCP)) return E.VACIO;

  const lenOk = nr.exactLength ? numCP!.length === nr.maxLength : numCP!.length <= nr.maxLength;
  if (!lenOk) return E.NUMCP_LONGITUD;

  // Caso especial liquidación de compras (04): el regex depende de la serie
  if (tipo === PVSIRE_VOUCHER_CODES.LIQUIDACION_COMPRAS) {
    const regexKey = numSerie.startsWith('E') ? 'NUMERICO8' : 'NUMERICO7';
    if (!validaExpresion(numCP!, regexKey)) return E.NUMCP_REGEX;
  } else if (!validaExpresion(numCP!, nr.regexKey)) {
    return E.NUMCP_REGEX;
  }
  // Si es número entero debe ser mayor a cero
  if (/^\d+$/.test(numCP!) && parseInt(numCP!, 10) <= 0) return E.NUMCP_REGEX;
  return E.OK;
}

// ============================================================================
// validaTipoDocIdentidad (línea 638 RVIE)
// ============================================================================
export function validaTipoDocIdentidad(
  tipoDocIdentidad: string | null,
  tipoCP: string,
  tipoCPMod: string,
  valFacExpString: string,
  valTotalCPString: string,
  nroFinal: string,
  isIncluido: boolean
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  const esCompro = isIncluido
    ? PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipo)
    : PVSIRE_VOUCHER_TYPES_RVIE.has(tipo);
  if (!esCompro) return E.OK;

  // Lista de tipos donde el doc identidad es opcional (RVIE línea 651-655)
  const tipoCP_1 = [
    '00', '05', '06', '07', '08', '11', '12', '13', '14', '15', '16', '18',
    '28', '30', '34', '35', '36', '37', '55', '56', '64', '87', '88'
  ];
  const tipoCP_2 = ['07', '08', '87', '88'];
  const tipoCPMod_1 = ['03', '12', '13', '14', '36'];
  const tipoCP_3 = ['03', '12'];

  const valFacExpoOk = validarDecimales(valFacExpString, 1);
  const valFactExpo = valFacExpoOk ? parseFloat(valFacExpString) : 0;
  const isValFacExpoMayorCero = valFactExpo > 0;

  const valTotalCPOk = validarDecimales(valTotalCPString, 1);
  const valTotalCP = valTotalCPOk ? parseFloat(valTotalCPString) : 0;
  const isValTotalCPMenor = valTotalCP < 700;

  const isNroFinalNoEmpty = !!nroFinal.trim();

  const isTipoDocOpcional =
    tipoCP_1.includes(tipo) ||
    (tipoCP_2.includes(tipo) && tipoCPMod_1.includes(tipoCPMod)) ||
    isValFacExpoMayorCero ||
    (isValTotalCPMenor && tipoCP_3.includes(tipo)) ||
    isNroFinalNoEmpty;

  if (isTipoDocOpcional && isNullOrEmpty(tipoDocIdentidad)) return E.OK;
  if (isNullOrEmpty(tipoDocIdentidad)) return E.VACIO;
  if (tipoDocIdentidad!.length !== 1) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.TIPO_DOC_IDENT.test(tipoDocIdentidad!)) return E.REGEX_FALLA;
  if (!PVSIRE_DOC_IDENT_TYPES.has(tipoDocIdentidad!)) return E.TIPO_DOC_NO_EN_LISTA;
  return E.OK;
}

// ============================================================================
// validaNumDocIdentidad (línea 691 RVIE)
// ============================================================================
export function validaNumDocIdentidad(
  numDocIdentidad: string | null,
  tipoDocIdentidad: string,
  tipoCP: string,
  isIncluido: boolean
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  const esCompro = isIncluido
    ? PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipo)
    : PVSIRE_VOUCHER_TYPES_RVIE.has(tipo);
  if (!esCompro) return E.OK;

  if (isNullOrEmpty(tipoDocIdentidad)) {
    // Sin tipo: solo verificar longitud y alfanumérico
    if (numDocIdentidad && numDocIdentidad.length > 15) return E.LONGITUD_INCORRECTA;
    if (numDocIdentidad && !PVSIRE_REGEX.ALFANUMERICO.test(numDocIdentidad)) return E.REGEX_FALLA;
    return E.OK;
  }
  const nTipoDoc = getCodigoTipoDoc(tipoDocIdentidad);
  if (nTipoDoc < 0) return E.OK;
  const rule = PVSIRE_DOC_IDENT_RULES[tipoDocIdentidad];
  if (!rule) return E.OK;

  if (isNullOrEmpty(numDocIdentidad)) return E.VACIO;
  const lenOk = rule.exactLength
    ? numDocIdentidad!.length === rule.maxLength
    : numDocIdentidad!.length <= rule.maxLength;
  if (!lenOk) return E.LONGITUD_INCORRECTA;

  const regexOk = rule.numeric
    ? PVSIRE_REGEX.NUMERICO.test(numDocIdentidad!)
    : PVSIRE_REGEX.ALFANUMERICO.test(numDocIdentidad!);
  if (!regexOk) return E.REGEX_FALLA;

  if (rule.mod11 && !isValidRucMod11(numDocIdentidad!)) return E.RUC_MOD11_INVALIDO;
  return E.OK;
}

// ============================================================================
// validaMoneda (línea 1526 RVIE)
// ============================================================================
export function validaMoneda(moneda: string | null): number {
  if (isNullOrEmpty(moneda)) return E.VACIO;
  if (moneda!.length !== 3) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_CURRENCY_CODES.has(moneda!)) return E.REGEX_FALLA;
  return E.OK;
}

// ============================================================================
// validaTipoCambio (línea 1543 RVIE)
// ============================================================================
export function validaTipoCambio(
  tipoCambio: string | null,
  moneda: string,
  monedaContabilidad: string
): number {
  const monedaVacia = isNullOrEmpty(moneda);
  if (monedaVacia) {
    if (isNullOrEmpty(tipoCambio)) return E.VACIO;
    const isNeg = tipoCambio!.startsWith('-');
    if ((!isNeg && tipoCambio!.length !== 5) || (isNeg && tipoCambio!.length !== 6)) {
      return E.LONGITUD_INCORRECTA;
    }
    const v = validarFormatoTipoCambio(tipoCambio!);
    if (v > 0) return v;
    if (!validarDecimales(tipoCambio, 4)) return E.TC_FORMATO_DECIMAL;
    return E.OK;
  }
  if (PVSIRE_CURRENCY_CODES.has(moneda)) {
    if (moneda === monedaContabilidad) {
      if (!isNullOrEmpty(tipoCambio)) return E.TC_NO_DEBE_TENER_VALOR;
      return E.OK;
    }
    if (isNullOrEmpty(tipoCambio)) return E.VACIO;
    const isNeg = tipoCambio!.startsWith('-');
    if ((!isNeg && tipoCambio!.length !== 5) || (isNeg && tipoCambio!.length !== 6)) {
      return E.LONGITUD_INCORRECTA;
    }
    const v = validarFormatoTipoCambio(tipoCambio!);
    if (v > 0) return v;
    if (!validarDecimales(tipoCambio, 4)) return E.TC_FORMATO_DECIMAL;
  }
  return E.OK;
}

// ============================================================================
// Helpers para validación de importes
// ============================================================================

/**
 * Replica Utilitario.isZeroDecimal — verifica si valor es "0", "0.00", etc.
 *
 * @example
 *   isZeroDecimal("0")     // true
 *   isZeroDecimal("0.00")  // true
 *   isZeroDecimal("0.50")  // false
 *   isZeroDecimal("-0.00") // true
 */
export function isZeroDecimal(valor: string): boolean {
  const n = parseFloat(valor);
  return !isNaN(n) && n === 0;
}

/**
 * Replica validarFormatoMonto (línea 1869 RVIE).
 *
 * Valida que el valor cumpla:
 *  - Sea un decimal válido
 *  - Hasta 12 dígitos enteros + hasta 2 decimales (`\d{1,12}.\d{0,2}`)
 *
 * Retorna 0 (OK) o:
 *  - 202: longitud excedida (>12 enteros o >2 decimales)
 *  - 203: no es decimal válido
 *
 * @example
 *   validarFormatoMonto("100.50")           // 0
 *   validarFormatoMonto("1234567890123.45") // 202 (13 enteros)
 *   validarFormatoMonto("100.456")          // 202 (3 decimales)
 *   validarFormatoMonto("abc")              // 203
 *   validarFormatoMonto("-100.50")          // 0 (acepta negativos)
 */
export function validarFormatoMonto(valor: string): number {
  if (!/^-?\d+(\.\d+)?$/.test(valor)) return E.REGEX_FALLA;
  const abs = valor.replace(/^-/, '');
  const parts = abs.split('.');
  const entero = parts[0].length;
  const decimal = parts.length > 1 ? parts[1].length : 0;
  if (entero > 12 || decimal > 2) return E.LONGITUD_INCORRECTA;
  return E.OK;
}

/**
 * Categoría de validación de monto. Determina el régimen aplicable según tipo CP:
 *  - NC (07, 87): Nota de Crédito/Débito — acepta solo negativos o cero
 *  - NC_BASICA (07): Solo NC — usado por validaValorOtrosTributos
 *  - SERVICIO_PUB (14, 36): Recibos servicio público — acepta posneg
 *  - POSITIVO: Resto — solo positivos
 *
 * Helper interno: aplica la lógica de longitud `>15 chars` (`>16` si negativo).
 * PVSIRE permite hasta 15 chars en monto positivo, 16 si negativo (1 char extra para el signo).
 */
function checkLongitudMonto(valor: string): boolean {
  const isNeg = valor.startsWith('-');
  return (!isNeg && valor.length > 15) || (isNeg && valor.length > 16);
}

/**
 * Patrón estándar de validación de importes (replicado de 9 funciones idénticas en PVSIRE).
 *
 * Lógica:
 *  1. Si tipo CP en lista (LISTA_COMPROBANTES) y no vacío:
 *     - Valor vacío → 201
 *     - Si NC (07/87) o NC_BASICA (07): admite negativos; cero → OK; no-cero inválido → 221
 *     - Si servicio público (14/36): admite posneg con/sin decimales (tipo 5)
 *     - Resto: solo positivos (tipo 3) — si no → 220
 *  2. Si tipo CP NO en lista:
 *     - Valor vacío → 201
 *     - validarFormatoMonto → si OK, retorna 0
 *
 * @param valor   String del monto a validar (ej. "100.50", "-50.00", "0", "")
 * @param tipoCP  Código del tipo de comprobante (ej. "01" factura, "07" NC)
 * @param ncFlags  Flags para personalizar (algunos validators usan NC_BASICA en vez de NC, etc.)
 *
 * @example
 *   // BI Gravada en una factura (01) con valor positivo → OK
 *   validarMontoEstandar("100.00", "01")     // 0
 *
 *   // BI Gravada en una factura (01) con valor negativo → 220 (debe ser positivo)
 *   validarMontoEstandar("-100.00", "01")    // 220
 *
 *   // BI Gravada en una NC (07) con valor negativo → OK
 *   validarMontoEstandar("-100.00", "07")    // 0
 *
 *   // BI Gravada en recibo servicio público (14) con valor negativo → OK (admite posneg)
 *   validarMontoEstandar("-100.00", "14")    // 0
 */
function validarMontoEstandar(
  valor: string | null,
  tipoCP: string,
  ncFlags: { nc: Set<string>; servicioPub: boolean } = {
    nc: PVSIRE_TIPO_CP_NOTA_CREDITO,
    servicioPub: true
  }
): number {
  const enLista = PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP) && !isNullOrEmpty(tipoCP);
  if (!enLista) {
    if (isNullOrEmpty(valor)) return E.VACIO;
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    return E.OK;
  }

  if (isNullOrEmpty(valor)) return E.VACIO;

  // NC: admite negativos (decimal tipo 2); cero permitido
  if (ncFlags.nc.has(tipoCP)) {
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    if (validarDecimales(valor, 2)) return E.OK;
    if (!isZeroDecimal(valor!)) return E.VALOR_NO_ES_CERO_NI_VALIDO;
    return E.OK;
  }

  // Servicio público (14/36): admite posneg con/sin decimales (tipo 5)
  if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
  const v = validarFormatoMonto(valor!);
  if (v > 0) return v;
  if (ncFlags.servicioPub && PVSIRE_TIPO_CP_SERVICIO_PUB.has(tipoCP)) {
    if (validarDecimales(valor, 5)) return E.OK;
    return E.REGEX_FALLA;
  }
  // Resto: solo positivos (tipo 3)
  if (validarDecimales(valor, 3)) return E.OK;
  return E.VALOR_DEBE_SER_POSITIVO;
}

// ============================================================================
// validaValorMtoExonerado (línea 1135 RVIE)
// Monto Exonerado del IGV. Patrón estándar.
// ============================================================================
export function validaValorMtoExonerado(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorMtoInafecto (línea 1185 RVIE)
// Monto Inafecto al IGV. Patrón estándar.
// ============================================================================
export function validaValorMtoInafecto(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorISC (línea 1235 RVIE)
// Impuesto Selectivo al Consumo. Patrón estándar.
// ============================================================================
export function validaValorISC(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorBIGravIVAP (línea 1285 RVIE)
// Base Imponible gravada con IVAP. Patrón estándar.
// ============================================================================
export function validaValorBIGravIVAP(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorIVAP (línea 1335 RVIE)
// Impuesto a la Venta de Arroz Pilado. Patrón estándar.
// ============================================================================
export function validaValorIVAP(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorICBPER (línea 1385 RVIE)
// Impuesto al Consumo de Bolsas de Plástico. Patrón estándar.
// ============================================================================
export function validaValorICBPER(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorOtrosTributos (línea 1435 RVIE)
// Otros Tributos. VARIANTE: NC sin 87 (NC_BASICA), siempre acepta posneg si no es NC.
// ============================================================================
export function validaValorOtrosTributos(valor: string | null, tipoCP: string): number {
  // Variante: usa NC_BASICA (solo 07), y resto siempre acepta posneg (tipo 5).
  // Inline implementation porque la lógica final difiere del helper estándar.
  const enLista = PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP) && !isNullOrEmpty(tipoCP);
  if (!enLista) {
    if (isNullOrEmpty(valor)) return E.VACIO;
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    return E.OK;
  }
  if (isNullOrEmpty(valor)) return E.VACIO;
  if (PVSIRE_TIPO_CP_NC_BASICA.has(tipoCP)) {
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    if (validarDecimales(valor, 2)) return E.OK;
    if (!isZeroDecimal(valor!)) return E.VALOR_NO_ES_CERO_NI_VALIDO;
    return E.OK;
  }
  if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
  const v = validarFormatoMonto(valor!);
  if (v > 0) return v;
  if (validarDecimales(valor, 5)) return E.OK;
  return E.REGEX_FALLA;
}

// ============================================================================
// validaValorTotalCP (línea 1480 RVIE)
// Total del Comprobante de Pago. Patrón estándar.
// ============================================================================
export function validaValorTotalCP(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorFacturadoExportacion (línea 777 RVIE)
// Valor Facturado de Exportación. Patrón estándar.
// ============================================================================
export function validaValorFacturadoExportacion(valor: string | null, tipoCP: string): number {
  return validarMontoEstandar(valor, tipoCP);
}

// ============================================================================
// validaValorBIGravada (línea 826 RVIE)
// Base Imponible Gravada. VARIANTE: si NC y valor no-cero → exige fechaEmisionMod (230)
// ============================================================================
export function validaValorBIGravada(
  valor: string | null,
  tipoCP: string,
  fechaEmisionMod: string[],
  PER_PERI_TRIBUTA: string
): number {
  const enLista = PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP) && !isNullOrEmpty(tipoCP);
  if (!enLista) {
    if (isNullOrEmpty(valor)) return E.VACIO;
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    return E.OK;
  }

  // Si vacío y NO en NC → retorna 0 (BI puede ir vacía en NC; en factura retorna 201 antes)
  if (isNullOrEmpty(valor)) {
    return E.OK; // Para BI Gravada el vacío es permitido si no en NC (caso especial del flow)
  }

  if (PVSIRE_TIPO_CP_NOTA_CREDITO.has(tipoCP)) {
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    if (!validarDecimales(valor, 2)) {
      if (!isZeroDecimal(valor!)) return E.VALOR_NO_ES_CERO_NI_VALIDO;
      return E.OK;
    }
    // Tiene valor no-cero → exige al menos una fecha de emisión de doc modificado
    if (!fechaEmisionMod || fechaEmisionMod.length === 0) return E.NC_SIN_FECHA_EMISION_MOD_BI;
    // Validar que las fechas modificadas estén dentro del período
    return validarFechasEmisionMod(fechaEmisionMod, PER_PERI_TRIBUTA, E.NC_SIN_FECHA_EMISION_MOD_BI);
  }
  if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
  const v = validarFormatoMonto(valor!);
  if (v > 0) return v;
  if (PVSIRE_TIPO_CP_SERVICIO_PUB.has(tipoCP)) {
    if (validarDecimales(valor, 5)) return E.OK;
    return E.REGEX_FALLA;
  }
  if (validarDecimales(valor, 3)) return E.OK;
  return E.VALOR_DEBE_SER_POSITIVO;
}

// ============================================================================
// validaValorIGVIPM (línea 981 RVIE)
// IGV / Impuesto Promoción Municipal. VARIANTE: si NC y no-cero → fechaEmisionMod (231)
// ============================================================================
export function validaValorIGVIPM(
  valor: string | null,
  tipoCP: string,
  fechaEmisionMod: string[],
  PER_PERI_TRIBUTA: string
): number {
  const enLista = PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP) && !isNullOrEmpty(tipoCP);
  if (!enLista) {
    if (isNullOrEmpty(valor)) return E.VACIO;
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    return E.OK;
  }
  if (isNullOrEmpty(valor)) return E.VACIO;

  if (PVSIRE_TIPO_CP_NOTA_CREDITO.has(tipoCP)) {
    if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
    const v = validarFormatoMonto(valor!);
    if (v > 0) return v;
    if (!validarDecimales(valor, 2)) {
      if (!isZeroDecimal(valor!)) return E.VALOR_NO_ES_CERO_NI_VALIDO;
      return E.OK;
    }
    if (!fechaEmisionMod || fechaEmisionMod.length === 0) return E.NC_SIN_FECHA_EMISION_MOD_IGV;
    return validarFechasEmisionMod(fechaEmisionMod, PER_PERI_TRIBUTA, E.NC_SIN_FECHA_EMISION_MOD_IGV);
  }
  if (checkLongitudMonto(valor!)) return E.LONGITUD_INCORRECTA;
  const v = validarFormatoMonto(valor!);
  if (v > 0) return v;
  if (PVSIRE_TIPO_CP_SERVICIO_PUB.has(tipoCP)) {
    if (validarDecimales(valor, 5)) return E.OK;
    return E.REGEX_FALLA;
  }
  if (validarDecimales(valor, 3)) return E.OK;
  return E.VALOR_DEBE_SER_POSITIVO;
}

/** validaValorDsctoBI (línea 908) — idéntico a BIGravada */
export function validaValorDsctoBI(
  valor: string | null,
  tipoCP: string,
  fechaEmisionMod: string[],
  PER_PERI_TRIBUTA: string
): number {
  return validaValorBIGravada(valor, tipoCP, fechaEmisionMod, PER_PERI_TRIBUTA);
}

/** validaValorDsctoIGVIPM (línea 1061) — idéntico a IGVIPM */
export function validaValorDsctoIGVIPM(
  valor: string | null,
  tipoCP: string,
  fechaEmisionMod: string[],
  PER_PERI_TRIBUTA: string
): number {
  return validaValorIGVIPM(valor, tipoCP, fechaEmisionMod, PER_PERI_TRIBUTA);
}

/**
 * Helper: valida que las fechas de emisión del doc modificado estén dentro del período.
 * Retorna 0 (OK) si todas las fechas son válidas y caen en el período, sino errorCode.
 */
function validarFechasEmisionMod(
  fechas: string[],
  PER_PERI_TRIBUTA: string,
  errorCode: number
): number {
  const periodo = parseInt(PER_PERI_TRIBUTA, 10);
  for (const fecha of fechas) {
    if (isNullOrEmpty(fecha)) return errorCode;
    if (fecha.length !== 10) return errorCode;
    if (!isValidDate(fecha)) return errorCode;
    const parts = fecha.split('/');
    const fechaEmi = parseInt(`${parts[2]}${parts[1]}`, 10);
    if (fechaEmi !== periodo) return errorCode;
  }
  return E.OK;
}

// ============================================================================
// validaCLU (línea 1856 RVIE)
// Campos de Libre Uso (CLU1..CLU39).
// ============================================================================
/**
 * Valida un campo CLU (libre uso). Acepta hasta 200 chars sin "|" ni "/".
 *
 * @example
 *   validaCLU("")             // 0 (opcional)
 *   validaCLU("nota interna") // 0
 *   validaCLU("a".repeat(201))// 202 (longitud excedida)
 *   validaCLU("con/slash")    // 203 (carácter prohibido)
 */
export function validaCLU(clu: string | null): number {
  if (isNullOrEmpty(clu)) return E.OK;
  if (clu!.length > 200) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.TEXTO_HASTA_200.test(clu!)) return E.REGEX_FALLA;
  return E.OK;
}

// ============================================================================
// validaIdProyecto (línea 1843 RVIE)
// ID de Proyecto Operadores/Atribución. Formato: "1-XXXXX" o "2-XXXXX"
// ============================================================================
/**
 * Valida el ID Proyecto de Operadores/Atribución.
 * Formato: `^[1|2]{1}-[a-zA-Z0-9]{1,48}?$` — un dígito 1 o 2, guión, hasta 48 chars alfanum.
 *
 * @example
 *   validaIdProyecto("")              // 0 (opcional)
 *   validaIdProyecto("1-PROY123")     // 0
 *   validaIdProyecto("2-OP000001")    // 0
 *   validaIdProyecto("3-NOPROYECT")   // 203 (debe iniciar con 1 o 2)
 *   validaIdProyecto("1PROY")         // 203 (falta guión)
 */
export function validaIdProyecto(idProyecto: string | null): number {
  if (isNullOrEmpty(idProyecto)) return E.OK;
  if (!PVSIRE_REGEX.ID_PROYECTO.test(idProyecto!)) return E.REGEX_FALLA;
  return E.OK;
}

// ============================================================================
// VALIDADORES DE DOCUMENTO MODIFICADO (Notas de Crédito/Débito)
// ============================================================================
// Las notas de crédito (07/87) y débito (08/88) referencian un comprobante
// original. Los campos `modifiedVoucher*` deben listar — separados por coma —
// los datos del doc original al que aplican.
//
// PVSIRE valida que listas paralelas (tipoCPMod, fechaEmisionMod, numSerieMod,
// numCPMod) tengan el mismo length y que cada elemento sea válido.

/** Códigos de tipo CP que son notas (07, 08, 87, 88) — usados en validadores de doc mod */
const PVSIRE_TIPO_CP_NOTAS = new Set(['07', '08', '87', '88']);

// ============================================================================
// validaFechaEmisionModUni (línea 1616 RVIE)
// Valida UNA fecha emisión doc modificado (validador de un elemento individual).
// ============================================================================
/**
 * Valida una fecha individual de doc modificado.
 *
 * Reglas:
 *  - Longitud 10 (dd/MM/yyyy) → si no, 202
 *  - Fecha calendario válida → si no, 206
 *  - Si hay fecha emisión, modif. NO puede ser posterior → si lo es, 234
 *  - El mes/año de la fecha modif. NO puede ser posterior al período → si lo es, 208
 *
 * @example
 *   validaFechaEmisionModUni('05/01/2025', '15/01/2025', '202501') // 0
 *   validaFechaEmisionModUni('20/01/2025', '15/01/2025', '202501') // 234 (modif > emisión)
 *   validaFechaEmisionModUni('15/02/2025', '15/01/2025', '202501') // 208 (después del período)
 */
export function validaFechaEmisionModUni(
  fechaEmisionMod: string,
  fechaEmision: string,
  PER_PERI_TRIBUTA: string
): number {
  if (fechaEmisionMod.length !== 10) return E.LONGITUD_INCORRECTA;
  if (!isValidDate(fechaEmisionMod)) return E.FECHA_INVALIDA;

  // Si fecha emisión válida, doc modificado debe ser <= a ella
  if (fechaEmision.length === 10 && isValidDate(fechaEmision)) {
    const [d1, m1, y1] = fechaEmision.split('/').map((p) => parseInt(p, 10));
    const [d2, m2, y2] = fechaEmisionMod.split('/').map((p) => parseInt(p, 10));
    const ts1 = y1 * 10000 + m1 * 100 + d1;
    const ts2 = y2 * 10000 + m2 * 100 + d2;
    if (ts2 > ts1) return 234;
  }

  const [, m, y] = fechaEmisionMod.split('/').map((p) => parseInt(p, 10));
  const periodo = parseInt(PER_PERI_TRIBUTA, 10);
  const fechaEmi = y * 100 + m;
  if (fechaEmi > periodo) return E.FECHA_MAYOR_PERIODO;
  return E.OK;
}

// ============================================================================
// validaFechaEmisionMod (línea 1590 RVIE)
// Valida la LISTA de fechas (separadas por coma) en NC/ND.
// ============================================================================
/**
 * Valida fechas de emisión de docs modificados.
 *
 * Solo aplica si tipoCP es nota (07, 08, 87, 88):
 *  - Vacío → 201 (obligatorio en notas)
 *  - Si fechaEmisionMod tiene valor en CP que NO es nota → 224 (no debería tener)
 *  - Itera cada fecha de la lista y aplica validaFechaEmisionModUni
 *
 * @example
 *   validaFechaEmisionMod('05/01/2025', '15/01/2025', '07', '202501') // 0 (NC con fecha)
 *   validaFechaEmisionMod('', '15/01/2025', '07', '202501')           // 201 (NC requiere fecha)
 *   validaFechaEmisionMod('05/01/2025', '15/01/2025', '01', '202501') // 224 (factura no debe)
 *   validaFechaEmisionMod('05/01/2025,10/01/2025', '15/01/2025', '07', '202501') // 0 (varias)
 */
export function validaFechaEmisionMod(
  fechaEmisionMod: string,
  fechaEmision: string,
  tipoCP: string,
  PER_PERI_TRIBUTA: string
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  if (fechaEmisionMod.length > 1500) return E.LONGITUD_INCORRECTA;

  if (PVSIRE_VOUCHER_TYPES_RVIE.has(tipo) && !isNullOrEmpty(fechaEmision)) {
    if (PVSIRE_TIPO_CP_NOTAS.has(tipo)) {
      if (isNullOrEmpty(fechaEmisionMod)) return E.VACIO;
      const fechas = fechaEmisionMod.split(',');
      for (const f of fechas) {
        const v = validaFechaEmisionModUni(f, fechaEmision, PER_PERI_TRIBUTA);
        if (v > 0) return v;
      }
    } else if (!isNullOrEmpty(fechaEmisionMod)) {
      // CP que no es nota NO debe tener fechaEmisionMod
      return 224;
    }
  }
  return E.OK;
}

// ============================================================================
// validaTipoCpModUni (línea 1678 RVIE)
// Valida UN tipo CP modificado (validador individual).
// ============================================================================
/**
 * Valida un tipo CP modificado individual.
 *
 * Reglas:
 *  - Si está en LISTA_COMPROBANTES o es recibo honorarios (02):
 *    - Vacío → 201
 *    - Longitud != 2 → 202
 *    - No numérico → 203
 *    - Si es 02 (recibo honorarios) o 07 (NC) → 228 (no puede ser nota referenciar otra)
 *    - Si no está en LISTA_PARA_INCLUIDO → 211
 *  - Si NO en lista:
 *    - Longitud != 2 → 202
 *    - No numérico → 203
 *    - No en LISTA_PARA_INCLUIDO → 211
 */
export function validaTipoCpModUni(tipoCpMod: string): number {
  const tipo = tipoCpMod === '' ? '-' : tipoCpMod;
  if (PVSIRE_VOUCHER_TYPES_RVIE.has(tipo) || tipo === PVSIRE_VOUCHER_CODES.RECIBO_HONORARIOS) {
    if (isNullOrEmpty(tipoCpMod)) return E.VACIO;
    if (tipoCpMod.length !== 2) return E.LONGITUD_INCORRECTA;
    if (!PVSIRE_REGEX.TIPO_CP.test(tipoCpMod)) return E.REGEX_FALLA;
    if (tipoCpMod === PVSIRE_VOUCHER_CODES.RECIBO_HONORARIOS || tipoCpMod === PVSIRE_VOUCHER_CODES.NOTA_CREDITO) {
      return 228; // tipo CP modif. no puede ser 02 o 07
    }
    if (!PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipoCpMod)) return E.TIPO_CP_NO_EN_LISTA;
    return E.OK;
  }
  if (tipoCpMod.length !== 2) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.TIPO_CP.test(tipoCpMod)) return E.REGEX_FALLA;
  if (!PVSIRE_VOUCHER_TYPES_INCLUIDOS.has(tipoCpMod)) return E.TIPO_CP_NO_EN_LISTA;
  return E.OK;
}

// ============================================================================
// validaTipoCpMod (línea 1648 RVIE)
// Valida lista de tipos CP modificados, sincronizado con fechaEmisionMod.
// ============================================================================
/**
 * Valida una lista de tipos CP modificados (separados por coma).
 *
 * Para NC/ND: itera la lista y valida cada elemento. Además exige misma longitud
 * que la lista de fechas. Si el CP no es nota y tiene valor → 224.
 *
 * @example
 *   validaTipoCpMod('01', '05/01/2025', '07') // 0 (NC referencia una factura)
 *   validaTipoCpMod('01,03', '05/01/2025,10/01/2025', '07') // 0 (2 docs)
 *   validaTipoCpMod('01,03', '05/01/2025', '07') // 202 (longitudes distintas)
 */
export function validaTipoCpMod(tipoCpMod: string, tipoCp: string, fechaEmisionMod: string): number {
  const tipo = tipoCp === '' ? '-' : tipoCp;
  if (tipoCpMod.length > 1500) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_VOUCHER_TYPES_RVIE.has(tipo)) return E.OK;

  if (PVSIRE_TIPO_CP_NOTAS.has(tipo)) {
    if (isNullOrEmpty(tipoCpMod)) return E.VACIO;
    const listaTipo = tipoCpMod.split(',');
    const listaFecha = fechaEmisionMod.split(',');
    if (listaTipo.length !== listaFecha.length) return E.LONGITUD_INCORRECTA;
    for (const t of listaTipo) {
      const v = validaTipoCpModUni(t);
      if (v > 0) return v;
    }
    return E.OK;
  }
  if (!isNullOrEmpty(tipoCpMod)) return 224;
  return E.OK;
}

// ============================================================================
// validaNumSerieModUni (línea 1742 RVIE)
// Valida UNA serie modificada (individual).
// ============================================================================
export function validaNumSerieModUni(numSerie: string, tipoCPMod: string, isIncluido: boolean): number {
  const tipo = tipoCPMod === '' ? '-' : tipoCPMod;
  if (PVSIRE_VOUCHER_TYPES_RVIE.has(tipo)) {
    if (!tipo.trim()) return E.OK;
    const rules = PVSIRE_VOUCHER_RULES[tipo];
    if (!rules) return E.OK;
    const sr = isIncluido ? rules.serieRules.incluido : rules.serieRules.normal;

    if (sr.required && isNullOrEmpty(numSerie)) return E.VACIO;
    if (isNullOrEmpty(numSerie)) return E.OK;
    const lenOk = sr.exactLength ? numSerie.length === sr.maxLength : numSerie.length <= sr.maxLength;
    if (!lenOk) return E.LONGITUD_INCORRECTA;
    if (!validaExpresion(numSerie, sr.regexKey)) return E.REGEX_FALLA;
    return E.OK;
  }
  if (numSerie.length > 20) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.ALFANUMERICO.test(numSerie)) return E.REGEX_FALLA;
  return E.OK;
}

// ============================================================================
// validaNumSerieMod (línea 1712 RVIE)
// Valida lista de series modificadas, sincronizado con tipoCPMod.
// ============================================================================
export function validaNumSerieMod(
  numSerie: string,
  tipoCP: string,
  tipoCPMod: string,
  isIncluido: boolean
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  if (numSerie.length > 1500) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_VOUCHER_TYPES_RVIE.has(tipo)) return E.OK;

  if (PVSIRE_TIPO_CP_NOTAS.has(tipo)) {
    if (isNullOrEmpty(numSerie)) return E.VACIO;
    const listaTipo = tipoCPMod.split(',');
    const listaSerie = numSerie.split(',');
    if (listaTipo.length !== listaSerie.length) return E.LONGITUD_INCORRECTA;
    for (let i = 0; i < listaTipo.length; i++) {
      const v = validaNumSerieModUni(listaSerie[i], listaTipo[i], isIncluido);
      if (v > 0) return v;
    }
    return E.OK;
  }
  if (!isNullOrEmpty(numSerie)) return 224;
  return E.OK;
}

// ============================================================================
// validaNumCPModUni (línea 1807 RVIE)
// Valida UN numCP modificado.
// ============================================================================
export function validaNumCPModUni(numCP: string, tipoCPMod: string, numSerieMod: string): number {
  const tipo = tipoCPMod === '' ? '-' : tipoCPMod;
  if (PVSIRE_VOUCHER_TYPES_RVIE.has(tipo)) {
    const rules = PVSIRE_VOUCHER_RULES[tipo];
    if (!rules) return E.OK;
    const nr = rules.numCpRule;
    if (!nr.required && isNullOrEmpty(numCP)) return E.OK;
    if (nr.required && isNullOrEmpty(numCP)) return E.VACIO;
    const lenOk = nr.exactLength ? numCP.length === nr.maxLength : numCP.length <= nr.maxLength;
    if (!lenOk) return E.LONGITUD_INCORRECTA;
    if (tipoCPMod === PVSIRE_VOUCHER_CODES.LIQUIDACION_COMPRAS) {
      const regexKey = numSerieMod.startsWith('E') ? 'NUMERICO8' : 'NUMERICO7';
      if (!validaExpresion(numCP, regexKey)) return E.REGEX_FALLA;
    } else if (!PVSIRE_REGEX.NUMERICO.test(numCP)) {
      return E.REGEX_FALLA;
    }
    return E.OK;
  }
  if (numCP.length > 20) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_REGEX.ALFANUMERICO.test(numCP)) return E.REGEX_FALLA;
  return E.OK;
}

// ============================================================================
// validaNumCPMod (línea 1778 RVIE)
// Valida lista de números CP modificados.
// ============================================================================
export function validaNumCPMod(
  numCP: string,
  tipoCP: string,
  tipoCPMod: string,
  numSerieMod: string
): number {
  const tipo = tipoCP === '' ? '-' : tipoCP;
  if (numCP.length > 1500) return E.LONGITUD_INCORRECTA;
  if (!PVSIRE_VOUCHER_TYPES_RVIE.has(tipo)) return E.OK;

  if (PVSIRE_TIPO_CP_NOTAS.has(tipo)) {
    if (isNullOrEmpty(numCP)) return E.VACIO;
    const listaTipo = tipoCPMod.split(',');
    const listaNum = numCP.split(',');
    const listaSerie = numSerieMod.split(',');
    if (listaNum.length !== listaSerie.length || listaNum.length !== listaTipo.length) {
      return E.LONGITUD_INCORRECTA;
    }
    for (let i = 0; i < listaTipo.length; i++) {
      const v = validaNumCPModUni(listaNum[i], listaTipo[i], listaSerie[i]);
      if (v > 0) return v;
    }
    return E.OK;
  }
  if (isNullOrEmpty(numCP)) return E.OK;
  return 224;
}

// ============================================================================
// VALIDADORES RCE (Registro de Compras Electrónico) específicos
// Source: ValidacionParametricoRCE.java
//
// Los campos RCE únicos respecto a RVIE:
//  - CAR SUNAT (pos 4): debe ir vacío en reemplazo de propuesta
//  - Año (pos 9 — para DAM/DSI)
//  - BI Gravado DG / DGNG / DNG (3 categorías de IGV crédito fiscal)
//  - Valor Adq NG (no gravado)
//  - COD DAM o DSI (pos 31): lista oficial de códigos de aduana
//  - Clasif Bss y Sss (pos 33): 1-5 según tipo
//  - ID Proyecto Operadores/Partícipes (pos 34)
//  - PorcPart (pos 35)
//  - IMB (pos 36)
//  - CAR Orig (pos 37): debe ir vacío en reemplazo
//  - Pos 38-41: Detracción, Tipo Nota, Estado CDP, Inconsistencia → SUNAT-autoFilled
// ============================================================================

// ============================================================================
// validaCAR (RCE línea 159)
// El CAR SUNAT del contribuyente debe ir VACÍO en reemplazo de propuesta.
// SUNAT lo asigna automáticamente.
// ============================================================================
/**
 * Valida CAR SUNAT del contribuyente. Debe ir vacío en reemplazo.
 *
 * @example
 *   validaCAR('')           // 0 (correcto en reemplazo)
 *   validaCAR('M0001')      // 410 (no debe tener valor en reemplazo)
 */
export function validaCAR(car: string | null): number {
  if (!isNullOrEmpty(car)) return ERCE.CAR_DEBE_IR_VACIO;
  return E.OK;
}

// ============================================================================
// validaTipoComprobante (RCE línea 317)
// Variante de RVIE: códigos 91, 97, 98 prohibidos en compras.
// ============================================================================
/**
 * Valida tipo de comprobante para RCE (compras).
 *
 * Reglas:
 *  - Vacío → 401
 *  - Longitud != 2 → 402
 *  - No alfanumérico → 403
 *  - No en lista oficial RVIE/RCE → 418
 *  - 91/97/98 (no permitidos en RCE) → 418
 *
 * @example
 *   validaTipoComprobanteRCE('01')  // 0 (factura)
 *   validaTipoComprobanteRCE('91')  // 418 (prohibido en RCE)
 *   validaTipoComprobanteRCE('AA')  // 403 (no alfanumérico)
 */
export function validaTipoComprobanteRCE(tipoCP: string | null): number {
  if (isNullOrEmpty(tipoCP)) return ERCE.VACIO_RCE;
  if (tipoCP!.length !== 2) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.ALFANUMERICO.test(tipoCP!)) return ERCE.REGEX_RCE;
  if (!PVSIRE_VOUCHER_TYPES_RVIE.has(tipoCP!)) return ERCE.TIPO_CP_PROHIBIDO_RCE;
  if (PVSIRE_RCE_TIPOS_PROHIBIDOS.has(tipoCP!)) return ERCE.TIPO_CP_PROHIBIDO_RCE;
  return E.OK;
}

// ============================================================================
// validaCodDam (RCE línea 1527)
// Código DAM/DSI: 3 chars alfanuméricos, contra lista oficial de aduanas.
// ============================================================================
/**
 * Valida COD DAM/DSI (código de aduana).
 *
 * Reglas:
 *  - Si tipoCPMod es 50 (DAM) o 52 (DSI) y vacío → 401 (obligatorio)
 *  - Si vacío y NO es 50/52 → 0 (opcional)
 *  - Longitud != 3 → 402
 *  - No alfanumérico → 403
 *  - No en lista oficial de aduanas → 433
 *
 * @example
 *   validaCodDam('', '01')      // 0 (opcional para factura)
 *   validaCodDam('', '50')      // 401 (obligatorio para DAM)
 *   validaCodDam('118', '50')   // 0 (cód válido)
 *   validaCodDam('XYZ', '50')   // 433 (no en lista de aduanas)
 */
export function validaCodDam(codDam: string | null, codTipoCPMod: string): number {
  const requerido = PVSIRE_RCE_TIPOS_REQUIEREN_DAM.has(codTipoCPMod);
  if (isNullOrEmpty(codDam)) {
    return requerido ? ERCE.VACIO_RCE : E.OK;
  }
  if (codDam!.length !== 3) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.ALFANUMERICO.test(codDam!)) return ERCE.REGEX_RCE;
  if (!PVSIRE_REGEX.CODIGOS_ADUANA.test(codDam!)) return ERCE.COD_DAM_NO_EN_LISTA;
  return E.OK;
}

// ============================================================================
// validaClasifBssSss (RCE línea 1577)
// Clasificación de Bienes y Servicios: 1-5.
// ============================================================================
/**
 * Valida Clasificación de Bienes y Servicios (RCE).
 *
 * Reglas:
 *  - Vacío + codBbSS != "1" → 0 (opcional)
 *  - Vacío + codBbSS == "1" → 807 (obligatorio)
 *  - Longitud != 1 → 402
 *  - No numérico → 403
 *  - No en [1,2,3,4,5] → 446
 *
 * @example
 *   validaClasifBssSss('', '0')   // 0 (opcional)
 *   validaClasifBssSss('', '1')   // 807 (requerido cuando codBbSS=1)
 *   validaClasifBssSss('3', '0')  // 0 válido
 *   validaClasifBssSss('9', '0')  // 446 (fuera de rango)
 */
export function validaClasifBssSss(clasifBssSss: string | null, codBbSS: string): number {
  if (isNullOrEmpty(clasifBssSss)) {
    if (codBbSS === '1') return ERCE.CLASIF_REQUERIDO;
    return E.OK;
  }
  if (clasifBssSss!.length !== 1) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.NUMERICO.test(clasifBssSss!)) return ERCE.REGEX_RCE;
  if (!PVSIRE_CLASIF_BSS_VALIDOS.has(clasifBssSss!)) return ERCE.CLASIF_NO_EN_LISTA;
  return E.OK;
}

// ============================================================================
// validaPorcPart (RCE línea 1616)
// Porcentaje de Participación. Obligatorio si idProyecto inicia con "1" y tipoCP != 25.
// ============================================================================
/**
 * Valida Porcentaje de Participación (operadores/partícipes).
 *
 * Reglas:
 *  - Si valor presente: decimal hasta 2 enteros + 2 decimales (positivo)
 *  - Si idProyecto inicia con "1" y tipoCP != "25" y vacío → 439
 *
 * @example
 *   validaPorcPart('50.00', '1-PROY', '01')  // 0
 *   validaPorcPart('', '1-PROY', '01')       // 439 (requerido)
 *   validaPorcPart('', '2-PROY', '01')       // 0 (no requerido para tipo 2)
 *   validaPorcPart('50.000', '1-PROY', '01') // 403 (3 decimales no permitidos)
 */
export function validaPorcPart(porcPart: string | null, idProyecto: string, tipoCP: string): number {
  // Si tiene valor, validar formato: hasta 2 enteros + 2 decimales positivo
  if (!isNullOrEmpty(porcPart) && !/^\d{1,2}(\.\d{1,2})?$/.test(porcPart!)) {
    return ERCE.REGEX_RCE;
  }
  const condicion1 = !isNullOrEmpty(idProyecto) && idProyecto.charAt(0) === '1';
  if (condicion1 && tipoCP !== '25' && isNullOrEmpty(porcPart)) {
    return ERCE.PORC_PART_REQUERIDO;
  }
  return E.OK;
}

// ============================================================================
// validaIMB (RCE línea 1628)
// Indicador de Modificación de Base (IMB). Lógica compleja según signo y tipo CP.
// ============================================================================
/**
 * Valida IMB (Indicador / Monto de Modificación de Base).
 *
 * Reglas:
 *  - Vacío → 0 (opcional)
 *  - Negativo:
 *    - Longitud > 16 → 402
 *    - No es decimal negativo válido (12.2) → 403
 *    - Si NO es NC (07/87) y valor != 0 → 425
 *  - Positivo:
 *    - Longitud > 15 → 402
 *    - No es decimal positivo válido → 403
 *    - Si es NC (07/87) y valor != 0 → 425
 */
export function validaIMB(valor: string | null, tipoCP: string): number {
  if (isNullOrEmpty(valor)) return E.OK;
  const isNeg = valor!.startsWith('-');
  const isNC = PVSIRE_TIPO_CP_NOTA_CREDITO.has(tipoCP);
  if (isNeg) {
    if (valor!.length > 16) return ERCE.LONGITUD_RCE;
    if (!validarDecimales(valor, 2)) return ERCE.REGEX_RCE;
    if (!isNC) {
      const mto = parseFloat(valor!);
      if (mto === 0) return E.OK;
      return ERCE.IMB_VALOR_INVALIDO;
    }
  } else {
    if (valor!.length > 15) return ERCE.LONGITUD_RCE;
    if (!validarDecimales(valor, 3)) return ERCE.REGEX_RCE;
    if (isNC) {
      const mto = parseFloat(valor!);
      if (mto === 0) return E.OK;
      return ERCE.IMB_VALOR_INVALIDO;
    }
  }
  return E.OK;
}

// ============================================================================
// Campos que DEBEN ir VACÍOS en reemplazo de propuesta (SUNAT autoFilled)
// CAR Orig (pos 37) — pos 38-41 ya están en sireAutoFilled en field-registry
// ============================================================================

/**
 * Valida CAR Orig (RCE pos 37 en reemplazo). Debe ir VACÍO.
 *
 * @example
 *   validaCAROrig('')           // 0
 *   validaCAROrig('M0001')      // 404 (debe ir vacío)
 */
export function validaCAROrig(valor: string | null): number {
  return isNullOrEmpty(valor) ? E.OK : ERCE.DEBE_IR_VACIO;
}

/**
 * Valida Detracción (RCE pos 38). Debe ir VACÍO en reemplazo.
 */
export function validaDetraccion(valor: string | null): number {
  return isNullOrEmpty(valor) ? E.OK : ERCE.DEBE_IR_VACIO;
}

/**
 * Valida Cód Tipo Nota (RCE pos 39). Debe ir VACÍO en reemplazo.
 */
export function validaCodTipoNota(valor: string | null): number {
  return isNullOrEmpty(valor) ? E.OK : ERCE.DEBE_IR_VACIO;
}

/**
 * Valida Cód Estado CDP (RCE pos 40). Debe ir VACÍO en reemplazo.
 */
export function validaCodEstCDP(valor: string | null): number {
  return isNullOrEmpty(valor) ? E.OK : ERCE.DEBE_IR_VACIO;
}

// ============================================================================
// VALIDADORES RCE BASADOS EN JSON OFICIAL (validacionesRCE.json)
// ============================================================================
// Estos validadores cargan las reglas dinámicamente del JSON extraído de PVSIRE,
// con 54 tipos de comprobante, sus reglas de serie y numCP por tipo, longitudes,
// exactitudes y regex para validación electrónica/física.

/**
 * Valida Año de Emisión (RCE línea 387).
 *
 * Solo aplica si tipoCP es DAM/DSI (50, 51, 52, 53, 54):
 *  - Vacío + tipoCP requiere → 401
 *  - Vacío + tipoCP no requiere → 0
 *  - Longitud != 4 → 402
 *  - No numérico → 403
 *  - Año <= 1981 o > año del período → 420
 *
 * @example
 *   validaAnioEmisionRCE('', '01', '202501')      // 0 (factura no requiere)
 *   validaAnioEmisionRCE('', '50', '202501')      // 401 (DAM requiere)
 *   validaAnioEmisionRCE('2024', '50', '202501')  // 0
 *   validaAnioEmisionRCE('1980', '50', '202501')  // 420 (año <= 1981)
 *   validaAnioEmisionRCE('2026', '50', '202501')  // 420 (año > período)
 */
export function validaAnioEmisionRCE(anio: string | null, tipoCP: string, PERIODO: string): number {
  const requerido = PVSIRE_RCE_TIPOS_CON_ANIO.has(tipoCP);
  if (isNullOrEmpty(anio)) return requerido ? ERCE.VACIO_RCE : E.OK;
  if (anio!.length !== 4) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.NUMERICO.test(anio!)) return ERCE.REGEX_RCE;
  if (requerido) {
    const a = parseInt(anio!, 10);
    const p = parseInt(PERIODO.substring(0, 4), 10);
    if (a <= 1981 || a > p) return 420;
  }
  return E.OK;
}

/**
 * Valida Número de Serie usando el JSON oficial RCE.
 *
 * Carga la regla del comprobante y valida:
 *  - Si serie obligatoria y vacía → 401
 *  - Longitud vs reglas (exactitud o máximo) → 402
 *  - Tipos DAM/DSI (50-54): la serie debe ser código de aduana → 419
 *  - Serie no matchea regex electrónico NI físico → 403
 *
 * @example
 *   validaNumSerieRCE('F001', '01')   // 0 (factura electrónica)
 *   validaNumSerieRCE('0001', '01')   // 0 (factura física)
 *   validaNumSerieRCE('B001', '01')   // 403 (no matchea factura)
 *   validaNumSerieRCE('118', '50')    // 0 (DAM con código de aduana válido)
 *   validaNumSerieRCE('XYZ', '50')    // 419 (DAM con código no de aduana)
 */
export function validaNumSerieRCE(numSerie: string | null, tipoCP: string): number {
  const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
  if (!cp) return E.OK;
  const serie = cp.numSerie;
  if (isNullOrEmpty(numSerie)) {
    return serie.obligatorio ? ERCE.VACIO_RCE : E.OK;
  }
  const lenOk = serie.exactitud ? numSerie!.length === serie.longitud : numSerie!.length <= serie.longitud;
  if (!lenOk) return ERCE.LONGITUD_RCE;
  // Si es DAM/DSI: la serie debe estar en la lista de códigos de aduana
  if (PVSIRE_RCE_TIPOS_CON_ANIO.has(tipoCP) && !PVSIRE_REGEX.CODIGOS_ADUANA.test(numSerie!)) {
    return 419;
  }
  // Debe matchear regex electrónico O físico
  const reElec = new RegExp(serie.validacionElectronico);
  const reFis = new RegExp(serie.validacionFisico);
  if (!reElec.test(numSerie!) && !reFis.test(numSerie!)) {
    return ERCE.REGEX_RCE;
  }
  return E.OK;
}

/**
 * Valida Número CP usando el JSON oficial RCE.
 *
 * Reglas (RCE línea 411):
 *  - Si tipoCP es "00" (Otros) → solo valida que esté en lista, no aplica regex
 *  - Si vacío + obligatorio → 401
 *  - Longitud vs reglas → 402
 *  - Liquidación de compras (04): regex depende de serie (E* o no)
 *  - Tipo numérico positivo (en lista admitidos): debe ser numérico positivo → 403 si falla
 *  - Resto: alfanumérico con guión → 403 si falla
 *
 * @example
 *   validaNumCPRCE('00000001', '01', 'F001')  // 0
 *   validaNumCPRCE('', '01', 'F001')          // 401 (obligatorio en factura)
 *   validaNumCPRCE('00000000', '01', 'F001')  // 403 (todo ceros prohibido)
 */
export function validaNumCPRCE(numCP: string | null, tipoCP: string, numSerie: string): number {
  const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
  if (!cp) return E.OK;
  const numero = cp.numCp;
  if (tipoCP === '00') return E.OK; // Otros: no aplica
  if (numero.obligatorio && isNullOrEmpty(numCP)) return ERCE.VACIO_RCE;
  if (isNullOrEmpty(numCP)) return E.OK;
  const lenOk = numero.exactitud ? numCP!.length === numero.longitud : numCP!.length <= numero.longitud;
  if (!lenOk) return ERCE.LONGITUD_RCE;
  // Liquidación de compras (04): regex depende de serie
  if (tipoCP === PVSIRE_VOUCHER_CODES.LIQUIDACION_COMPRAS) {
    const maximo = numSerie.startsWith('E') ? '8' : '7';
    const regex = new RegExp(numero.validacion.replace('[MAXIMO]', maximo));
    if (!regex.test(numCP!)) return ERCE.REGEX_RCE;
    return E.OK;
  }
  // Tipos numéricos positivos
  if (PVSIRE_RCE_TIPOS_NUMCP_NUMERICO.has(tipoCP)) {
    if (!/^0*([1-9][0-9]*)$/.test(numCP!)) return ERCE.REGEX_RCE;
  } else {
    if (!/^[\w-]+$/.test(numCP!)) return ERCE.REGEX_RCE;
  }
  return E.OK;
}

// ============================================================================
// VALIDACIÓN DE IMPORTES RCE (BI Gravada, IGV, etc.)
// Source: ValidacionParametricoRCE.java líneas 573-1352
// ============================================================================

/**
 * Patrón estándar de validación de importes RCE.
 *
 * RCE difiere de RVIE en que usa patterns más estrictos:
 *  - PATER_NEGATIVO: `^-?(0|[1-9]\d{0,11})(\.\d{1,2})?$` (acepta posneg, no leading zeros)
 *  - PATER_POSITIVO: `^(0|[1-9]\d{0,11})(\.\d{1,2})?$` (solo positivo)
 *  - PATER_MONTO: igual a NEGATIVO (acepta posneg)
 *
 * Reglas:
 *  - Vacío → 401
 *  - Si nroFinal no vacío Y valor != "0.00" → 424
 *  - Validar parte entera (12 chars normal, 13 con signo) → 402
 *  - Validar parte decimal (max 2 chars, solo dígitos) → 403
 *  - Si tipoCP en [07,87,97] O (25 con idProyecto inicia 1):
 *    - valor > 0 → 425 (debe ser negativo)
 *    - no matchea PATER_NEGATIVO → 403
 *  - Si tipoCP en [14, 36]:
 *    - no matchea PATER_MONTO → 403 (acepta posneg)
 *  - Resto: solo positivos
 *    - valor < 0 → 425
 *    - no matchea PATER_POSITIVO → 403
 *
 * @example
 *   validarMontoRCE('100.00', '01', '', '')  // 0 (factura positivo)
 *   validarMontoRCE('-100.00', '07', '', '') // 0 (NC negativo)
 *   validarMontoRCE('-100.00', '01', '', '') // 425 (factura no admite negativo)
 *   validarMontoRCE('100.00', '07', '', '')  // 425 (NC no admite positivo)
 *   validarMontoRCE('', '01', '', '')        // 401 (vacío)
 *   validarMontoRCE('50.00', '01', 'F1', '') // 424 (nroFinal no permite valor != 0)
 */
function validarMontoRCE(valor: string | null, tipoCP: string, idProyecto: string, nroFinal: string): number {
  if (isNullOrEmpty(valor)) return ERCE.VACIO_RCE;
  if (!isNullOrEmpty(nroFinal) && valor !== '0.00') return 424;

  const isNeg = valor!.startsWith('-');
  const parts = valor!.split('.');
  if (parts.length === 2) {
    const entero = parts[0].replace('-', '');
    if (entero.length > 0) {
      if (isNeg && parts[0].length > 13) return ERCE.LONGITUD_RCE; // 12+1 signo
      if (!isNeg && entero.length > 12) return ERCE.LONGITUD_RCE;
    }
    if (parts[1].length > 0) {
      if (parts[1].length > 2) return ERCE.REGEX_RCE;
      if (!/^[0-9]*$/.test(parts[1])) return ERCE.REGEX_RCE;
    }
  } else {
    if (isNeg && valor!.length > 13) return ERCE.LONGITUD_RCE;
    if (!isNeg && valor!.length > 12) return ERCE.LONGITUD_RCE;
  }

  // Solo aplica validación de signo si el tipo CP existe en lista oficial
  if (!PVSIRE_RCE_COMPROBANTES.has(tipoCP)) return E.OK;

  const num = parseFloat(valor!);
  const isMype1 = tipoCP === PVSIRE_RCE_TIPO_CP_MYPE && idProyecto.startsWith('1');
  if (PVSIRE_RCE_TIPO_CP_NEGATIVO.has(tipoCP) || isMype1) {
    if (num > 0) return 425;
    if (!PVSIRE_RCE_PATER_NEGATIVO.test(valor!)) return ERCE.REGEX_RCE;
  } else if (PVSIRE_RCE_TIPO_CP_POSNEG.has(tipoCP)) {
    if (!PVSIRE_RCE_PATER_MONTO.test(valor!)) return ERCE.REGEX_RCE;
  } else {
    if (num < 0) return 425;
    if (!PVSIRE_RCE_PATER_POSITIVO.test(valor!)) return ERCE.REGEX_RCE;
  }
  return E.OK;
}

/**
 * BI Gravada DG (Destinada a operaciones Gravadas) — RCE pos 15.
 * Patrón estándar de importes RCE.
 */
export function validaValorBIGravadaRCE(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
}

/**
 * IGV/IPM DG (Destinado a operaciones Gravadas) — RCE pos 16.
 *
 * Patrón estándar de importes RCE + **coherencia con BIGravada**:
 *  - Si BIGravada < 0 Y IGV > 0 → 425 (incoherencia)
 *
 * @example
 *   validaValorIGVIPMDG('18.00', '01', '', '', '100.00')   // 0 (BI+ IGV+ coherente)
 *   validaValorIGVIPMDG('18.00', '01', '', '', '-100.00')  // 425 (BI- pero IGV+)
 */
export function validaValorIGVIPMDG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string,
  BIGravada: string = ''
): number {
  const result = validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
  if (result !== E.OK) return result;
  // Validación cruzada: si BI < 0 y IGV > 0 → 425
  if (BIGravada && valor && PVSIRE_RCE_COMPROBANTES.has(tipoCP)) {
    const bi = parseFloat(BIGravada);
    const igv = parseFloat(valor);
    if (!isNaN(bi) && !isNaN(igv) && bi < 0 && igv > 0) return 425;
  }
  return E.OK;
}

/**
 * BI Gravada DGNG (Destinada a Gravadas y No Gravadas) — RCE pos 17.
 * Patrón estándar de importes RCE.
 */
export function validaValorBIGravadaDGNG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
}

/**
 * IGV/IPM DGNG (mixto) — RCE pos 18.
 * Patrón estándar + coherencia con BIGravadaDGNG.
 */
export function validaValorIGVIPMDGNG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string,
  BIGravadaDGNG: string = ''
): number {
  const result = validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
  if (result !== E.OK) return result;
  if (BIGravadaDGNG && valor && PVSIRE_RCE_COMPROBANTES.has(tipoCP)) {
    const bi = parseFloat(BIGravadaDGNG);
    const igv = parseFloat(valor);
    if (!isNaN(bi) && !isNaN(igv) && bi < 0 && igv > 0) return 425;
  }
  return E.OK;
}

/**
 * BI Gravada DNG (Destinada a operaciones No Gravadas) — RCE pos 19.
 * Patrón estándar de importes RCE.
 */
export function validaValorBIGravadaDNG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
}

/**
 * IGV/IPM DNG — RCE pos 20.
 * Patrón estándar + coherencia con BIGravadaDNG.
 */
export function validaValorIGVIPMDNG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string,
  nroFinal: string,
  BIGravadaDNG: string = ''
): number {
  const result = validarMontoRCE(valor, tipoCP, idProyecto, nroFinal);
  if (result !== E.OK) return result;
  if (BIGravadaDNG && valor && PVSIRE_RCE_COMPROBANTES.has(tipoCP)) {
    const bi = parseFloat(BIGravadaDNG);
    const igv = parseFloat(valor);
    if (!isNaN(bi) && !isNaN(igv) && bi < 0 && igv > 0) return 425;
  }
  return E.OK;
}

/**
 * Valor Adq. NG (No Gravado) — RCE pos 21. Patrón estándar.
 */
export function validaValorAdqNG(
  valor: string | null,
  tipoCP: string,
  idProyecto: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, '');
}

/**
 * ISC — RCE pos 22. Patrón estándar.
 */
export function validaValorISCRCE(
  valor: string | null,
  tipoCP: string,
  idProyecto: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, '');
}

/**
 * ICBPER — RCE pos 23. Patrón estándar.
 */
export function validaValorICBPERRCE(valor: string | null, tipoCP: string): number {
  return validarMontoRCE(valor, tipoCP, '', '');
}

/**
 * Otros Trib/Cargos — RCE pos 24. Patrón estándar.
 */
export function validaValorOtrosTribRCE(
  valor: string | null,
  tipoCP: string,
  idProyecto: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, '');
}

/**
 * Total CP — RCE pos 25. Patrón estándar.
 */
export function validaValorTotalCPRCE(
  valor: string | null,
  tipoCP: string,
  idProyecto: string
): number {
  return validarMontoRCE(valor, tipoCP, idProyecto, '');
}

// ============================================================================
// VALIDADORES RCE FUNDAMENTALES (Período, Fecha, Inconsistencia)
// Source: ValidacionParametricoRCE.java líneas 122-198, 1717
// ============================================================================

const LISTA_MES_PERIODO = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);

/**
 * Replica validaPeriodo RCE (línea 122).
 *
 * Reglas:
 *  - Vacío → 401
 *  - Longitud != 6 → 402
 *  - No es numérico → 409
 *  - Mes no en [01-12] → 407
 *  - No coincide con PERIODO declarado → 408
 *  - Si tipoCP "87" (NC especial) y fecha emisión presente:
 *    - El YYYYMM de la fecha debe coincidir con el período → si no, 814
 *
 * @example
 *   validaPeriodoRCE('202501', '202501', '15/01/2025', '01')  // 0
 *   validaPeriodoRCE('', '202501', '', '01')                  // 401
 *   validaPeriodoRCE('20250', '202501', '', '01')             // 402
 *   validaPeriodoRCE('202513', '202513', '', '01')            // 407 (mes 13)
 *   validaPeriodoRCE('202502', '202501', '', '01')            // 408 (no coincide)
 *   validaPeriodoRCE('202501', '202501', '15/02/2025', '87')  // 814 (87 con fecha en otro mes)
 */
export function validaPeriodoRCE(
  periodo: string | null,
  PERIODO: string,
  fechaEmision: string,
  tipoCP: string
): number {
  if (isNullOrEmpty(periodo)) return ERCE.VACIO_RCE;
  if (periodo!.length !== 6) return ERCE.LONGITUD_RCE;
  if (!/^[0-9]*$/.test(periodo!.substring(0, 6))) return 409;
  if (!LISTA_MES_PERIODO.has(periodo!.substring(4, 6))) return 407;
  if (periodo !== PERIODO) return 408;
  // Caso especial: NC tipo 87 con fecha emisión válida
  if (tipoCP === '87' && isValidFechaEmisionRCE(fechaEmision)) {
    const fechaYYYY = fechaEmision.substring(6, 10);
    const fechaMM = fechaEmision.substring(3, 5);
    const fechaYYYYMM = fechaYYYY + fechaMM;
    if (periodo !== fechaYYYYMM) return 814;
  }
  return E.OK;
}

/** Helper: verifica formato dd/MM/yyyy estricto */
function isValidFechaEmisionRCE(fecha: string): boolean {
  if (!fecha || fecha.length !== 10) return false;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(fecha);
}

/**
 * Replica validaFechaEmision RCE (línea 166).
 *
 * Reglas:
 *  - Vacío → 401
 *  - Longitud != 10 → 402
 *  - No parseable como dd/MM/yyyy → 411
 *  - YYYYMM > PERIODO → 412
 *  - Si origen != "3" Y tipoCP en [01,08,23,30,34,42,50,52,53,54]
 *    Y serie matchea validacionElectronico Y fecha >= período → 412
 *
 * @example
 *   validaFechaEmisionRCE('15/01/2025', '01', 'F001', '202501', '1') // 0
 *   validaFechaEmisionRCE('', '01', 'F001', '202501', '1')           // 401
 *   validaFechaEmisionRCE('15/02/2025', '01', 'F001', '202501', '1') // 412 (mes posterior)
 *   validaFechaEmisionRCE('32/01/2025', '01', 'F001', '202501', '1') // 411 (día inválido)
 */
export function validaFechaEmisionRCE(
  fechaEmision: string | null,
  tipoCP: string,
  numSerie: string,
  PERIODO: string,
  origen: string
): number {
  if (isNullOrEmpty(fechaEmision)) return ERCE.VACIO_RCE;
  if (fechaEmision!.length !== 10) return ERCE.LONGITUD_RCE;
  if (!isValidDate(fechaEmision!)) return 411;

  const parts = fechaEmision!.split('/');
  const fechaYYYYMM = parseInt(parts[2] + parts[1], 10);
  const periodoYYYYMM = parseInt(PERIODO, 10);
  if (fechaYYYYMM > periodoYYYYMM) return 412;

  // Caso especial: comprobante electrónico no puede ser >= período si origen != "3"
  const tiposElectro = new Set(['01', '08', '23', '30', '34', '42', '50', '52', '53', '54']);
  if (origen !== '3' && tiposElectro.has(tipoCP)) {
    const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
    if (cp) {
      const reElec = new RegExp(cp.numSerie.validacionElectronico);
      if (reElec.test(numSerie) && fechaYYYYMM >= periodoYYYYMM) return 412;
    }
  }
  return E.OK;
}

/**
 * Replica validaInconsistencia RCE (línea 1717).
 * El campo "Inconsistencia" (Incal) debe ir VACÍO en reemplazo de propuesta.
 *
 * @example
 *   validaInconsistencia('')   // 0
 *   validaInconsistencia('1')  // 404
 */
export function validaInconsistencia(valor: string | null): number {
  return isNullOrEmpty(valor) ? E.OK : ERCE.DEBE_IR_VACIO;
}

// ============================================================================
// VALIDADORES RCE COMUNES (RUC, Razón Social, Moneda, Tipo Cambio)
// Source: ValidacionParametricoRCE.java líneas 93-121, 1361-1430
// ============================================================================
// Estos validadores tienen códigos de error específicos del RCE (4xx)
// que difieren de los del RVIE (2xx).

/**
 * Replica validaRucDeclarante RCE (línea 93).
 *
 * Reglas (idénticas a RVIE pero con códigos 4xx):
 *  - Vacío → 401
 *  - Longitud != 11 → 402
 *  - No numérico → 403
 *  - No coincide con NUM_RUC → 405
 *
 * @example
 *   validaRucDeclaranteRCE('20131312955', '20131312955') // 0
 *   validaRucDeclaranteRCE('', '20131312955')            // 401
 *   validaRucDeclaranteRCE('123', '20131312955')         // 402
 *   validaRucDeclaranteRCE('20131312955', '10719887304') // 405
 */
export function validaRucDeclaranteRCE(ruc: string | null, NUM_RUC: string): number {
  if (isNullOrEmpty(ruc)) return ERCE.VACIO_RCE;
  if (ruc!.length !== 11) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.NUMERICO.test(ruc!)) return ERCE.REGEX_RCE;
  if (ruc !== NUM_RUC) return 405;
  return E.OK;
}

/**
 * Replica validaIdRazonSocial RCE (línea 109).
 *
 * Reglas:
 *  - Vacío → 401
 *  - Longitud > 1500 → 402
 *  - FORMATO_NOMBRE_RAZONSOCIAL = ^[\s\S]*$ (cualquier char, multilínea)
 *
 * @example
 *   validaIdRazonSocialRCE('EMPRESA SAC')      // 0
 *   validaIdRazonSocialRCE('')                  // 401
 *   validaIdRazonSocialRCE('X'.repeat(1501))    // 402
 */
export function validaIdRazonSocialRCE(nombre: string | null): number {
  if (isNullOrEmpty(nombre)) return ERCE.VACIO_RCE;
  if (nombre!.length > 1500) return ERCE.LONGITUD_RCE;
  // El regex acepta cualquier carácter — no se valida más allá
  return E.OK;
}

/**
 * Replica validaMoneda RCE (línea 1361).
 *
 * Reglas:
 *  - Vacío → 401
 *  - Longitud != 3 → 402
 *  - No alfanumérico → 403
 *  - No en lista oficial de monedas (JSON) → 426
 *
 * @example
 *   validaMonedaRCE('PEN')  // 0
 *   validaMonedaRCE('')     // 401
 *   validaMonedaRCE('PE')   // 402
 *   validaMonedaRCE('XYZ')  // 426 (no en lista)
 */
export function validaMonedaRCE(moneda: string | null): number {
  if (isNullOrEmpty(moneda)) return ERCE.VACIO_RCE;
  if (moneda!.length !== 3) return ERCE.LONGITUD_RCE;
  if (!PVSIRE_REGEX.ALFANUMERICO.test(moneda!)) return ERCE.REGEX_RCE;
  if (!PVSIRE_RCE_MONEDAS.has(moneda!)) return 426;
  return E.OK;
}

/**
 * Replica validaTipoCambio RCE (línea 1383).
 *
 * Reglas (más complejas que RVIE):
 *  - Si moneda vacía + tipoCambio vacío + CONTABILIDAD != moneda → 401
 *  - Si moneda no está en lista oficial → 0 (skip)
 *  - Si moneda == CONTABILIDAD (PEN o USD):
 *    - Y tipoCambio tiene valor → 499 (no debe tener TC)
 *  - Si moneda != CONTABILIDAD:
 *    - tipoCambio vacío → 401
 *    - TC <= 0 → 425
 *    - Validar formato 1 entero + 3 decimales → 402/403
 *    - PATER_TIPO_CAMBIO: `^(?!0\.000)(\d\.\d{3})$` → 427 si falla
 *    - TC == 0 → 427
 *  - Si CONTABILIDAD=PEN y moneda=PEN con TC → 499
 *  - Si CONTABILIDAD=USD y moneda=USD con TC → 499
 *
 * @example
 *   validaTipoCambioRCE('', 'PEN', 'PEN')      // 0 (moneda contabilidad sin TC)
 *   validaTipoCambioRCE('1.000', 'PEN', 'PEN') // 499 (no debe tener TC)
 *   validaTipoCambioRCE('3.800', 'USD', 'PEN') // 0
 *   validaTipoCambioRCE('', 'USD', 'PEN')      // 401 (TC obligatorio)
 *   validaTipoCambioRCE('0.000', 'USD', 'PEN') // 427 (no puede ser cero)
 */
export function validaTipoCambioRCE(
  tipoCambio: string | null,
  moneda: string,
  CONTABILIDAD: string
): number {
  const monedaVacia = isNullOrEmpty(moneda);
  const tcVacio = isNullOrEmpty(tipoCambio);

  if (CONTABILIDAD !== moneda && monedaVacia && tcVacio) return ERCE.VACIO_RCE;
  if (monedaVacia) return E.OK;
  if (!PVSIRE_RCE_MONEDAS.has(moneda)) return E.OK;

  if (moneda === CONTABILIDAD) {
    // Moneda contabilidad: no debe haber TC
    if (
      (CONTABILIDAD.toUpperCase() === 'PEN' && moneda.toUpperCase() === 'PEN' && !isNullOrEmpty(tipoCambio)) ||
      (CONTABILIDAD.toUpperCase() === 'USD' && moneda.toUpperCase() === 'USD' && !isNullOrEmpty(tipoCambio))
    ) {
      return 499;
    }
  } else {
    if (isNullOrEmpty(tipoCambio)) return ERCE.VACIO_RCE;
    const tc = parseFloat(tipoCambio!);
    if (isNaN(tc) || tc < 0) return 425;
    const parts = tipoCambio!.split('.');
    if (parts.length !== 2) return ERCE.LONGITUD_RCE;
    if (parts[0].trim() !== '' && !/^[0-9]*$/.test(parts[0].trim())) return ERCE.REGEX_RCE;
    if (parts[1].trim() !== '' && parts[1].length !== 3) return ERCE.LONGITUD_RCE;
    if (!PVSIRE_RCE_PATER_TIPO_CAMBIO_REGEX.test(tipoCambio!)) return 427;
    if (tc === 0) return 427;
  }
  // Validación final cruzada
  if (CONTABILIDAD.toUpperCase() === 'PEN' && moneda.toUpperCase() === 'PEN' && !isNullOrEmpty(tipoCambio)) {
    return 499;
  }
  if (CONTABILIDAD.toUpperCase() === 'USD' && moneda.toUpperCase() === 'USD' && !isNullOrEmpty(tipoCambio)) {
    return 499;
  }
  return E.OK;
}

/** Cached regex local (evita require de constants en cada call) */
const PVSIRE_RCE_PATER_TIPO_CAMBIO_REGEX = /^(?!0\.000)(\d\.\d{3})$/;

// ============================================================================
// VALIDADORES RCE — FECHA VENCIMIENTO, NRO FINAL, IDENTIDAD CON JSON
// Source: ValidacionParametricoRCE.java líneas 199-547
// ============================================================================

/** Tipos CP que requieren fecha vencimiento OBLIGATORIA en RCE */
const PVSIRE_RCE_TIPOS_CON_VTO = new Set(['14', '46', '50', '51', '52', '53', '54']);
/** Subset sin 14 (servicio público) */
const PVSIRE_RCE_TIPOS_VTO_SIN_14 = new Set(['46', '50', '51', '52', '53', '54']);

/**
 * Replica validaFechaVencimiento RCE (línea 199).
 *
 * Reglas:
 *  - Si tipoCP en [14, 46, 50-54] y vacía → 414
 *  - Si vacía y no requerido → 0
 *  - Longitud != 10 → 402
 *  - Fecha calendario inválida → 413
 *  - Formato no dd/MM/yyyy → 411
 *  - Para tipos sin 14 (46, 50-54): fechaVto > período → 415
 *  - Para tipo 14: fechaVto > período+1 → 417
 *  - Si sumaImportes == 0: fechaVto > período → 416 (o 417 para tipo 14)
 *
 * @example
 *   validaFechaVencimientoRCE('15/01/2025', '01', '100', '18', '0', '0', '0', '0', '202501')  // 0
 *   validaFechaVencimientoRCE('', '14', '100', '18', '0', '0', '0', '0', '202501')            // 414
 *   validaFechaVencimientoRCE('15/02/2025', '50', ...'202501')                                 // 415
 *   validaFechaVencimientoRCE('15/03/2025', '14', '100', '18', '0', '0', '0', '0', '202501')  // 417
 */
export function validaFechaVencimientoRCE(
  fechaVencimiento: string | null,
  tipoCP: string,
  mtoBIGravadoDG: string,
  igvDG: string,
  mtoBIGravadoDGNG: string,
  igvDGNG: string,
  mtoBIGravadoDNG: string,
  igvDNG: string,
  PERIODO: string
): number {
  if (isNullOrEmpty(fechaVencimiento)) {
    if (PVSIRE_RCE_TIPOS_CON_VTO.has(tipoCP)) return 414;
    return E.OK;
  }
  if (fechaVencimiento!.length !== 10) return ERCE.LONGITUD_RCE;
  if (!isValidDate(fechaVencimiento!)) return 413;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaVencimiento!)) return 411;

  const parts = fechaVencimiento!.split('/');
  const fechaYM = parseInt(parts[2] + parts[1], 10);
  const periodoYM = parseInt(PERIODO, 10);
  // Período + 1 mes (para tipo 14)
  const y = parseInt(PERIODO.substring(0, 4), 10);
  const m = parseInt(PERIODO.substring(4, 6), 10);
  const next = m === 12 ? (y + 1) * 100 + 1 : y * 100 + m + 1;

  if (PVSIRE_RCE_TIPOS_VTO_SIN_14.has(tipoCP) && fechaYM > periodoYM) return 415;
  if (PVSIRE_RCE_TIPOS_CON_VTO.has(tipoCP) && tipoCP === '14' && fechaYM > next) return 417;

  // Si suma importes == 0 (sin operación gravada): reglas extra
  const sum =
    toNum(mtoBIGravadoDG) + toNum(igvDG) +
    toNum(mtoBIGravadoDGNG) + toNum(igvDGNG) +
    toNum(mtoBIGravadoDNG) + toNum(igvDNG);
  if (sum === 0) {
    if (tipoCP === '14') {
      if (fechaYM > next) return 417;
    } else if (fechaYM > periodoYM) {
      return 416;
    }
  } else if (tipoCP === '14') {
    if (fechaYM > next) return 417;
  }
  return E.OK;
}

function toNum(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Replica validaNroFinal RCE (línea 431).
 *
 * Reglas:
 *  - Solo aplica si nroFinal no vacío y != "0":
 *    - Permitido solo si tipoCP en lista_1 AND numCP no vacío AND sumImportes == 0
 *    - Si no permitido → 421
 *    - Longitud > 20 → 402
 *    - Si tipoCP en tipoCP_Admitidos: numérico ([0-9]*); si no: alfanumérico → 403
 *
 * @example
 *   validaNroFinalRCE('', '01', '00000001', '0','0','0','0','0','0','118.00')  // 0 (vacío OK)
 *   validaNroFinalRCE('00000010', '03', '00000001', '0','0','0','0','0','0','100') // 0
 *   validaNroFinalRCE('10', '01', '', '0','0','0','0','0','0','0')             // 421 (no permitido)
 *   validaNroFinalRCE('1'.repeat(21), '03', '1', '0','0','0','0','0','0','0')  // 402
 */
export function validaNroFinalRCE(
  nroFinal: string | null,
  tipoCP: string,
  numCP: string,
  BIGravadoDG: string,
  IGVIPMDG: string,
  BIGravadoDGNG: string,
  IGVIPMDGNG: string,
  BIGravadoDNG: string,
  IGVIPMDNG: string,
  mtoTotalCpTxt: string
): number {
  void mtoTotalCpTxt; // unused (RCE original lo recibe pero no lo usa)
  if (isNullOrEmpty(nroFinal) || nroFinal === '0') return E.OK;

  const tipoCP_1 = new Set([
    '00', '03', '05', '06', '07', '08', '11', '12', '13', '14', '15', '16',
    '18', '19', '23', '28', '30', '34', '35', '36', '37', '55', '56', '87', '88'
  ]);
  const tipoCP_Admitidos = new Set([
    '01', '02', '03', '05', '06', '07', '08', '10', '12', '16', '17', '18', '19',
    '22', '23', '25', '27', '28', '29', '30', '32', '34', '35', '36', '37',
    '42', '43', '44', '45', '46', '48', '50', '51', '52', '53', '54',
    '55', '56', '64', '87', '88', '89'
  ]);

  const sum =
    toNum(BIGravadoDG) + toNum(IGVIPMDG) +
    toNum(BIGravadoDGNG) + toNum(IGVIPMDGNG) +
    toNum(BIGravadoDNG) + toNum(IGVIPMDNG);

  const permitido = tipoCP_1.has(tipoCP) && !isNullOrEmpty(numCP) && sum === 0;
  if (!permitido) return 421;
  if (nroFinal!.length > 20) return ERCE.LONGITUD_RCE;
  if (tipoCP_Admitidos.has(tipoCP)) {
    if (!/^[0-9]*$/.test(nroFinal!)) return ERCE.REGEX_RCE;
  } else {
    if (!/^[a-zA-Z0-9_(),.-]*$/.test(nroFinal!)) return ERCE.REGEX_RCE;
  }
  return E.OK;
}

/**
 * Replica validaTipoDocIdentidad RCE (línea 463).
 *
 * Reglas:
 *  - Si tipoCP en LISTA oficial:
 *    - Si tipoCP == "00" o (tipoCP en lista_1 AND nroFinal no vacío) → doc identidad opcional
 *    - Sino vacío → 422
 *    - Longitud != 1 → 402
 *    - No alfanumérico → 403
 *    - No en JSON oficial docIdentidad → 423
 *
 * @example
 *   validaTipoDocIdentidadRCE('6', '01', '')  // 0 (RUC factura)
 *   validaTipoDocIdentidadRCE('', '01', '')   // 422 (obligatorio)
 *   validaTipoDocIdentidadRCE('', '00', '')   // 0 (opcional para "Otros")
 *   validaTipoDocIdentidadRCE('Z', '01', '')  // 423 (no en lista)
 */
export function validaTipoDocIdentidadRCE(
  tipoDocIdentidad: string | null,
  tipoCP: string,
  nroFinal: string
): number {
  const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
  if (!cp) return E.OK;
  const tipoCP_1 = new Set([
    '03', '05', '06', '07', '08', '11', '12', '13', '14', '15', '16',
    '18', '19', '23', '28', '30', '34', '35', '36', '37', '55', '56', '87', '88'
  ]);
  const condA = tipoCP === '00';
  const condB = tipoCP_1.has(tipoCP) && !!nroFinal && nroFinal.length > 0;
  if (isNullOrEmpty(tipoDocIdentidad)) {
    if (condA || condB) return E.OK;
    return 422;
  }
  if (tipoDocIdentidad!.length !== 1) return ERCE.LONGITUD_RCE;
  if (!/^[a-zA-Z0-9]*$/.test(tipoDocIdentidad!)) return ERCE.REGEX_RCE;
  if (!PVSIRE_RCE_DOC_IDENTIDAD.has(tipoDocIdentidad!)) return 423;
  return E.OK;
}

/**
 * Replica validaNumDocIdentidad RCE (línea 494).
 *
 * Reglas:
 *  - Si tipoCP en LISTA oficial:
 *    - Si tipoCP == 00 o (tipoCP en lista_1 AND nroFinal no vacío): vacío OK
 *    - Sino vacío → 422
 *    - Si tipoDocIdent no está en JSON → 423
 *    - Longitud vs JSON regla → 402
 *    - Numérico/alfanumérico vs JSON → 403
 *    - RUC (tipo 6) y NO matchea módulo 11 → 423
 *
 * @example
 *   validaNumDocIdentidadRCE('20131312955', '01', '', '6', '20131312955') // 0
 *   validaNumDocIdentidadRCE('12345', '01', '', '6', '20131312955')        // 402
 *   validaNumDocIdentidadRCE('20000000000', '01', '', '6', '20131312955')  // 423 (mod11 falla)
 */
export function validaNumDocIdentidadRCE(
  numDocIdentidad: string | null,
  tipoCP: string,
  nroFinal: string,
  tipoDocIdentidad: string
): number {
  const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
  if (cp) {
    const tipoCP_1 = new Set([
      '03', '05', '06', '07', '08', '11', '12', '13', '14', '15', '16',
      '18', '19', '23', '28', '30', '34', '35', '36', '37', '55', '56', '87', '88'
    ]);
    const condA = tipoCP === '00';
    const condB = tipoCP_1.has(tipoCP) && !!nroFinal && nroFinal.length > 0;
    if (isNullOrEmpty(numDocIdentidad)) {
      if (!condA && !condB) return 422;
      return E.OK;
    }
    const doc = PVSIRE_RCE_DOC_IDENTIDAD.get(tipoDocIdentidad);
    if (!doc) return 423;
    const lenOk = doc.exactitud ? numDocIdentidad!.length === doc.longitud : numDocIdentidad!.length <= doc.longitud;
    if (!lenOk) return ERCE.LONGITUD_RCE;
    const regexOk = doc.numerico
      ? /^[0-9]*$/.test(numDocIdentidad!)
      : /^[a-zA-Z0-9]*$/.test(numDocIdentidad!);
    if (!regexOk) return ERCE.REGEX_RCE;
    // RUC con módulo 11
    if ((tipoDocIdentidad === '6' || tipoDocIdentidad === '06') && !isValidRucMod11(numDocIdentidad!)) {
      return 423;
    }
    return E.OK;
  }
  // Si tipoCP no en lista oficial: solo validar contra docIdentidad
  const doc = PVSIRE_RCE_DOC_IDENTIDAD.get(tipoDocIdentidad);
  if (!doc) return E.OK;
  const lenOk = doc.exactitud ? numDocIdentidad!.length === doc.longitud : numDocIdentidad!.length <= doc.longitud;
  if (!lenOk) return ERCE.LONGITUD_RCE;
  const regexOk = doc.numerico
    ? /^[0-9]*$/.test(numDocIdentidad!)
    : /^[a-zA-Z0-9]*$/.test(numDocIdentidad!);
  if (!regexOk) return ERCE.REGEX_RCE;
  return E.OK;
}

/**
 * Replica validaRazonSocialCliente RCE (línea 548).
 *
 * Reglas:
 *  - Si tipoCP en LISTA y razón social vacía:
 *    - Si tipoDocIdent vacío AND nroFinal vacío → 422
 *  - Longitud > 1500 → 402
 *
 * @example
 *   validaRazonSocialClienteRCE('EMPRESA SAC', '6', '', '01')  // 0
 *   validaRazonSocialClienteRCE('', '', '', '01')              // 422
 *   validaRazonSocialClienteRCE('X'.repeat(1501), '6', '', '01') // 402
 */
export function validaRazonSocialClienteRCE(
  razonSocial: string | null,
  tipoDocIdentidad: string,
  nroFinal: string,
  tipoCP: string
): number {
  const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
  if (!cp) return E.OK;
  if (isNullOrEmpty(razonSocial)) {
    if (isNullOrEmpty(tipoDocIdentidad) && isNullOrEmpty(nroFinal)) return 422;
    return E.OK;
  }
  if (razonSocial!.length > 1500) return ERCE.LONGITUD_RCE;
  return E.OK;
}

// ============================================================================
// VALIDADORES RCE DOC MODIFICADO (NC/ND con referencia)
// Source: ValidacionParametricoRCE.java líneas 1431-1576
// ============================================================================
// En RCE, los campos de doc modificado (FechaEmisionMod, TipoCPMod, NumSerieMod,
// NumCPMod) solo aplican cuando tipoCP es NC/ND: 07, 08, 87, 88.
// Si no es NC/ND y tiene valor → 429 (no debe tener)
// Si es NC/ND y está vacío → 428 (obligatorio)

const EMOD = PVSIRE_RCE_MOD_ERROR_CODES;

/**
 * Replica validaFechaEmisionMod RCE (línea 1431).
 *
 * Reglas:
 *  - Si tipoCDP en [07,08,87,88] (NC/ND):
 *    - Vacío → 428
 *    - Longitud != 10 → 402
 *    - Calendario inválido → 430
 *    - Fecha modif > período → 431
 *  - Si NO en NC/ND y fechaEmision no vacía → 429
 *
 * @example
 *   validaFechaEmisionModRCE('15/12/2024', '07', '202501')  // 0 (NC con fecha < período)
 *   validaFechaEmisionModRCE('', '07', '202501')             // 428 (obligatorio)
 *   validaFechaEmisionModRCE('15/02/2025', '07', '202501')   // 431 (después del período)
 *   validaFechaEmisionModRCE('15/12/2024', '01', '202501')   // 429 (factura no debe tener)
 *   validaFechaEmisionModRCE('', '01', '202501')             // 0 (factura sin fechaEmisionMod OK)
 */
export function validaFechaEmisionModRCE(
  fechaEmision: string | null,
  codTipoCDP: string,
  PERIODO: string
): number {
  const esNotaCD = PVSIRE_RCE_TIPO_CP_NOTAS.has(codTipoCDP);
  if (esNotaCD) {
    if (isNullOrEmpty(fechaEmision)) return EMOD.MOD_VACIO_OBLIGATORIO;
    if (fechaEmision!.length !== 10) return ERCE.LONGITUD_RCE;
    if (!isValidDate(fechaEmision!)) return EMOD.MOD_FECHA_INVALIDA;
    const parts = fechaEmision!.split('/');
    const fechaYM = parseInt(parts[2] + parts[1], 10);
    const periodoYM = parseInt(PERIODO, 10);
    if (fechaYM > periodoYM) return EMOD.MOD_FECHA_POSTERIOR_PERIODO;
    return E.OK;
  }
  if (!isNullOrEmpty(fechaEmision)) return EMOD.MOD_NO_DEBE_TENER_VALOR;
  return E.OK;
}

/**
 * Replica validaTipoCPMod RCE (línea 1456).
 *
 * Reglas:
 *  - Si tipoCP en NC/ND:
 *    - Vacío → 428
 *    - Longitud != 2 → 402
 *    - No alfanumérico → 403
 *    - Si valor es 02/03/12/13 → 432 (no puede ser de esos tipos)
 *  - Si NO NC/ND y valor presente → 429
 *
 * @example
 *   validaTipoCPModRCE('01', '07')  // 0 (NC referencia factura)
 *   validaTipoCPModRCE('02', '07')  // 432 (recibo honorarios prohibido como mod)
 *   validaTipoCPModRCE('03', '07')  // 432 (boleta prohibida como mod)
 *   validaTipoCPModRCE('', '07')    // 428
 *   validaTipoCPModRCE('01', '01')  // 429 (factura no debe tener tipoCPMod)
 */
export function validaTipoCPModRCE(valor: string | null, tipoCP: string): number {
  const esNotaCD = PVSIRE_RCE_TIPO_CP_NOTAS.has(tipoCP);
  if (esNotaCD) {
    if (isNullOrEmpty(valor)) return EMOD.MOD_VACIO_OBLIGATORIO;
    if (valor!.length !== 2) return ERCE.LONGITUD_RCE;
    if (!/^[a-zA-Z0-9]*$/.test(valor!)) return ERCE.REGEX_RCE;
    if (['02', '03', '12', '13'].includes(valor!)) return EMOD.MOD_TIPO_CP_PROHIBIDO;
    return E.OK;
  }
  if (!isNullOrEmpty(valor)) return EMOD.MOD_NO_DEBE_TENER_VALOR;
  return E.OK;
}

/**
 * Replica validaNumSerieCPMod RCE (línea 1501).
 *
 * Reglas:
 *  - Si tipoCP en NC/ND:
 *    - Vacío → 428
 *    - Validar serie contra el JSON oficial del tipoCPMod
 *  - Si NO NC/ND y valor → 429
 *
 * @example
 *   validaNumSerieCPModRCE('F001', '07', '01')  // 0 (NC ref factura F001)
 *   validaNumSerieCPModRCE('', '07', '01')      // 428
 *   validaNumSerieCPModRCE('F001', '01', '')    // 429 (factura no debe)
 */
export function validaNumSerieCPModRCE(numSerie: string | null, tipoCP: string, tipoCPMod: string): number {
  const esNotaCD = PVSIRE_RCE_TIPO_CP_NOTAS.has(tipoCP);
  if (esNotaCD) {
    if (isNullOrEmpty(numSerie)) return EMOD.MOD_VACIO_OBLIGATORIO;
    const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCPMod);
    if (!cp) return E.OK;
    const serie = cp.numSerie;
    if (serie.obligatorio && numSerie === '') return ERCE.VACIO_RCE;
    const lenOk = serie.exactitud ? numSerie!.length === serie.longitud : numSerie!.length <= serie.longitud;
    if (!lenOk) return ERCE.LONGITUD_RCE;
    const reElec = new RegExp(serie.validacionElectronico);
    const reFis = new RegExp(serie.validacionFisico);
    if (!reElec.test(numSerie!) && !reFis.test(numSerie!)) return ERCE.REGEX_RCE;
    return E.OK;
  }
  if (!isNullOrEmpty(numSerie)) return EMOD.MOD_NO_DEBE_TENER_VALOR;
  return E.OK;
}

/**
 * Replica validaNumCPMod RCE (línea 1551).
 *
 * Reglas:
 *  - Si tipoCP en NC/ND:
 *    - Vacío → 428
 *    - Validar numCP contra el JSON oficial del tipoCP (no del tipoCPMod — verificar)
 *  - Si NO NC/ND y valor → 429
 *
 * NOTA: la línea 1551 del JAR consulta `validaciones.getComprobantes().filter(cp.getCodigo().equals(tipoCP))`
 * (no tipoCPMod). Esto puede ser un bug del JAR original o intencional. Se replica tal cual.
 */
export function validaNumCPModRCE(numCPMod: string | null, tipoCP: string): number {
  const esNotaCD = PVSIRE_RCE_TIPO_CP_NOTAS.has(tipoCP);
  if (esNotaCD) {
    if (isNullOrEmpty(numCPMod)) return EMOD.MOD_VACIO_OBLIGATORIO;
    const cp = PVSIRE_RCE_COMPROBANTES.get(tipoCP);
    if (!cp) return E.OK;
    const numCP = cp.numCp;
    if (numCP.obligatorio && numCPMod === '') return ERCE.VACIO_RCE;
    const lenOk = numCP.exactitud ? numCPMod!.length === numCP.longitud : numCPMod!.length <= numCP.longitud;
    if (!lenOk) return ERCE.LONGITUD_RCE;
    if (!/^[a-zA-Z0-9]*$/.test(numCPMod!)) return ERCE.REGEX_RCE;
    return E.OK;
  }
  if (!isNullOrEmpty(numCPMod)) return EMOD.MOD_NO_DEBE_TENER_VALOR;
  return E.OK;
}
