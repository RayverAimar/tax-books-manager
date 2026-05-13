/**
 * Reglas de validación extraídas directamente de PVSIRE 1.7.0 (Programa Validador SIRE de SUNAT).
 *
 * Fuente: decompilación del JAR oficial PVSire-1.7.0 (Marzo 2026).
 * Clases de origen:
 *  - pe.gob.sunat.contribuyente3.migeigv.libros.integrador.pvsire.util.Constantes
 *  - pe.gob.sunat.contribuyente3.registro.migeigv.libros.validador.parametrico.util.validaciones.ConstantesValidaciones
 *  - pe.gob.sunat.contribuyente3.registro.migeigv.libros.validador.parametrico.rvie.validador.ValidacionParametricoRVIE
 *  - pe.gob.sunat.contribuyente3.registro.migeigv.libros.validador.parametrico.rce.validador.ValidacionParametricoRCE
 *
 * Cualquier discrepancia entre estas reglas y la documentación legal (RS 112-2021/Anexos):
 * **PVSIRE manda** — es el validador operacional. La doc legal puede estar desactualizada.
 */

// ============================================================================
// Códigos de libro (Tabla 6 — pos 22-27 del nombre de archivo)
// ============================================================================

export const PVSIRE_BOOK_CODES = {
  /** Registro de Ventas e Ingresos Electrónico — Comprobantes de Pago */
  RVIE_CP: '140000',
  /** Registro de Compras Electrónico — Comprobantes de Pago */
  RCE_CP: '080400',
  /** Registro de Compras Electrónico — No Domiciliados */
  RCE_ND: '080500'
} as const;

// ============================================================================
// Tipos de Comprobante de Pago o Documento (Tabla 3)
// ============================================================================

/** Lista oficial RVIE de tipos de comprobante aceptados */
export const PVSIRE_VOUCHER_TYPES_RVIE = new Set([
  '00',
  '01',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '23',
  '24',
  '27',
  '28',
  '29',
  '30',
  '32',
  '34',
  '35',
  '36',
  '37',
  '42',
  '43',
  '44',
  '45',
  '48',
  '49',
  '55',
  '56',
  '64',
  '87',
  '88',
  '89'
]);

/** Códigos especiales */
export const PVSIRE_VOUCHER_CODES = {
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  RECIBO_HONORARIOS: '02',
  LIQUIDACION_COMPRAS: '04',
  RECIBO_SERVICIO_PUBLICO: '14',
  NOTA_CREDITO_ESPECIAL: '87',
  NOTA_DEBITO_ESPECIAL: '88'
} as const;

/** Tipos CP electrónicos con fecha emisión que puede ser MENOR al período */
export const PVSIRE_CP_FEC_MENOR_PERIODO = new Set(['01', '08', '23', '30', '34', '42', '50', '52', '53', '54']);

// ============================================================================
// Tipos de Documento de Identidad (Tabla 1)
// ============================================================================

/** Códigos aceptados por PVSIRE */
export const PVSIRE_DOC_IDENT_TYPES = new Set([
  '0', // Doc trib no domiciliado sin RUC
  '1', // DNI
  '4', // Carnet extranjería
  '6', // RUC
  '7', // Pasaporte
  'A', // Cédula diplomática
  'B', // Doc identidad país residencia no dom
  'C', // TIN
  'D', // IN
  'E', // TAM
  'F' // PTP
]);

// ============================================================================
// Monedas (Tabla 2) — ISO 4217 codes aceptados por PVSIRE
// ============================================================================

/** Lista completa de monedas aceptadas — extraída de LISTA_COD_MONEDAS */
export const PVSIRE_CURRENCY_CODES = new Set([
  'AFN',
  'EUR',
  'ALL',
  'DZD',
  'USD',
  'AOA',
  'XCD',
  'ARS',
  'AMD',
  'AWG',
  'AUD',
  'AZN',
  'BSD',
  'BHD',
  'BDT',
  'BBD',
  'BYN',
  'BZD',
  'XOF',
  'BMD',
  'INR',
  'BTN',
  'BOB',
  'BOV',
  'BAM',
  'BWP',
  'NOK',
  'BRL',
  'BND',
  'BGN',
  'BIF',
  'CVE',
  'KHR',
  'XAF',
  'CAD',
  'KYD',
  'CLP',
  'CLF',
  'CNY',
  'COP',
  'COU',
  'KMF',
  'CDF',
  'NZD',
  'CRC',
  'HRK',
  'CUP',
  'CUC',
  'ANG',
  'CZK',
  'DKK',
  'DJF',
  'DOP',
  'EGP',
  'SVC',
  'ERN',
  'SZL',
  'ETB',
  'FKP',
  'FJD',
  'XPF',
  'GMD',
  'GEL',
  'GHS',
  'GIP',
  'GTQ',
  'GBP',
  'GNF',
  'GYD',
  'HTG',
  'HNL',
  'HKD',
  'HUF',
  'ISK',
  'IDR',
  'XDR',
  'IRR',
  'IQD',
  'ILS',
  'JMD',
  'JPY',
  'JOD',
  'KZT',
  'KES',
  'KPW',
  'KRW',
  'KWD',
  'KGS',
  'LAK',
  'LBP',
  'LSL',
  'ZAR',
  'LRD',
  'LYD',
  'CHF',
  'MOP',
  'MKD',
  'MGA',
  'MWK',
  'MYR',
  'MVR',
  'MRU',
  'MUR',
  'XUA',
  'MXN',
  'MXV',
  'MDL',
  'MNT',
  'MAD',
  'MZN',
  'MMK',
  'NAD',
  'NPR',
  'NIO',
  'NGN',
  'OMR',
  'PKR',
  'PAB',
  'PGK',
  'PYG',
  'PEN',
  'PHP',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'RWF',
  'SHP',
  'WST',
  'STN',
  'SAR',
  'RSD',
  'SCR',
  'SLL',
  'SGD',
  'XSU',
  'SBD',
  'SOS',
  'SSP',
  'LKR',
  'SDG',
  'SRD',
  'SEK',
  'CHE',
  'CHW',
  'SYP',
  'TWD',
  'TJS',
  'TZS',
  'THB',
  'TOP',
  'TTD',
  'TND',
  'TRY',
  'TMT',
  'UGX',
  'UAH',
  'AED',
  'USN',
  'UYU',
  'UYI',
  'UYW',
  'UZS',
  'VUV',
  'VES',
  'VND',
  'YER',
  'ZMW',
  'ZWL',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XTS',
  'XXX',
  'XAU',
  'XPD',
  'XPT',
  'XAG'
]);

/** Monedas más usadas en Perú */
export const PVSIRE_COMMON_CURRENCIES = new Set(['PEN', 'USD', 'EUR']);

// ============================================================================
// Regex oficiales de PVSIRE
// ============================================================================

export const PVSIRE_REGEX = {
  /** Período YYYYMM válido (mes 01-12) */
  PERIODO_YYYYMM: /^\d{4}(0?[1-9]|1[012])$/,
  /** Tipo de comprobante: 2 dígitos */
  TIPO_CP: /^\d{2}$/,
  /** Solo numérico */
  NUMERICO: /^[0-9]*$/,
  /** Alfanumérico ASCII */
  ALFANUMERICO: /^[a-zA-Z0-9]*$/,
  /** ID de proyecto operadores/atribución */
  ID_PROYECTO: /^[1|2]{1}-[a-zA-Z0-9]{1,48}?$/,
  /** Fecha dd/MM/yyyy (acepta también - . /) */
  FECHA_DDMMYYYY: /^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/,
  /** Texto SIN caracteres prohibidos | / \ */
  TEXTO_LIBRE_SIN_PROHIBIDOS: /^[^\\/|]*$/,
  /** Tipo Doc Identidad (sin / ni \) */
  TIPO_DOC_IDENT: /^[^/\\]*$/,
  /** Texto general hasta 200 chars sin | ni / */
  TEXTO_HASTA_200: /^[^|/]{0,200}$/,
  /** Códigos de aduana DAM/DSI válidos */
  CODIGOS_ADUANA:
    /^(000|019|028|037|046|055|064|073|082|091|109|118|127|136|145|154|163|172|181|190|217|226|235|244|253|262|271|280|370|299|884|893|901|910|929|938|947|956|965|974)$/,
  /** Correlativo ajuste posterior anterior: A|M|C + hasta 9 alfanum */
  CORR_AJUSPOST_ANT: /^[AMC][A-Z0-9]{1,9}$/
} as const;

// ============================================================================
// Caracteres prohibidos en texto libre
// ============================================================================

export const PVSIRE_PROHIBITED_CHARS = ['|', '/', '\\'] as const;

// ============================================================================
// Códigos de oportunidad (Tabla 6 — pos 28-29 del nombre)
// ============================================================================

export const PVSIRE_OPPORTUNITY_CODES = {
  IMPORTACION_CP: '01',
  REEMPLAZO_PROPUESTA: '02',
  AJUSTES_POSTERIORES: '03',
  AJUSTES_ANT_GENERAL: '04',
  AJUSTES_ANT_SIMPLIFICADO: '05'
} as const;

// ============================================================================
// Indicadores fijos del nombre de archivo
// ============================================================================

export const PVSIRE_FILENAME_INDICATORS = {
  /** Día (siempre "00" para libros mensuales) */
  DD: '00',
  /** Indicador de sistema (siempre "2": generado por MIGE IGV) */
  SISTEMA: '2',
  /** Identificador fijo del archivo */
  PREFIJO: 'LE'
} as const;

// ============================================================================
// Constantes de tasa
// ============================================================================

export const PVSIRE_TAX_RATES = {
  /** Tasa IGV vigente (Constantes.TASA_MONTO_IGV) */
  IGV: 0.18
} as const;

// ============================================================================
// Mensajes de error oficiales (para reportes user-friendly)
// ============================================================================

export const PVSIRE_ERROR_MESSAGES = {
  POSICION_NOMBRE: 'Error en la posición <<MSG>> del nombre del archivo .txt, favor de corregir',
  ESTRUCTURA_NOMBRE:
    'Error en la estructura del nombre del archivo, verifíquela en https://cpe.sunat.gob.pe/estructura-de-archivos',
  EXTENSION_INVALIDA: 'El archivo debe tener extensión .txt o formato .zip conteniendo un archivo .txt',
  LONGITUD_NOMBRE: 'Error en la longitud del nombre del archivo .txt, favor de corregir',
  TAMANO_MAX_6GB: 'El tamaño del archivo comprimido en formato .zip debe ser menor o igual a 6GB'
} as const;

// ============================================================================
// Códigos de proceso (para CC=oportunidad)
// ============================================================================

export const PVSIRE_PROCESS_CODES = {
  // Compras
  IMPORTAR_CP_COMPRAS: 1,
  REEMPLAZO_PROPUESTA_COMPRAS: 2,
  REEMPLAZO_AJUSTES_POSTERIORES_COMPRAS: 8,
  REEMPLAZO_AJUSTES_POSTERIORES_NO_DOM_COMPRAS: 9,
  REEMPLAZO_AJUSTES_POSTERIORES_ANT_COMPRAS: 10,
  REEMPLAZO_AJUSTES_POSTERIORES_ANT_SIMPLIFICADO_COMPRAS: 11,
  // Ventas
  IMPORTAR_CP_VENTAS: 1,
  REEMPLAZO_PROPUESTA_VENTAS: 2,
  GENERAR_LIBRO_RVIE: 5,
  REEMPLAZO_AJUSTES_POSTERIORES_VENTAS: 8,
  REEMPLAZO_AJUSTES_POSTERIORES_ANT_VENTAS: 10
} as const;

// ============================================================================
// Códigos de error PVSIRE (los que retornan las funciones de validación)
// ============================================================================

export const PVSIRE_ERROR_CODES = {
  OK: 0,
  VACIO: 201,
  LONGITUD_INCORRECTA: 202,
  REGEX_FALLA: 203,
  REGEX_PERIODO: 204,
  PERIODO_NO_COINCIDE: 205,
  FECHA_INVALIDA: 206,
  FECHA_MENOR_PERIODO: 207,
  FECHA_MAYOR_PERIODO: 208,
  FECHA_VTO_INVALIDA: 209,
  FECHA_VTO_FUERA_RANGO: 210,
  TIPO_CP_NO_EN_LISTA: 211,
  SERIE_LONGITUD: 212,
  SERIE_REGEX: 213,
  NUMCP_LONGITUD: 215,
  NUMCP_REGEX: 216,
  TC_FORMATO_DECIMAL: 217,
  TIPO_DOC_NO_EN_LISTA: 223,
  RUC_NO_COINCIDE_DECLARANTE: 225,
  TC_NO_DEBE_TENER_VALOR: 229,
  RUC_MOD11_INVALIDO: 238
} as const;

// ============================================================================
// Patterns regex usados internamente por PVSIRE para series/números CP
// ============================================================================
// Source: ValidacionParametricoRVIE.java líneas 64-88

export const PVSIRE_SERIE_PATTERNS: Record<string, RegExp> = {
  ALFANUMERICO20: /^[A-Z0-9]{1,20}$/,
  NUMERICO4: /^[0-9]{4}$/,
  NUMERICO7: /^\d{1,7}$/,
  NUMERICO8: /^\d{1,8}$/,
  NUMERICO11: /^\d{1,11}$/,
  NUMERICO13: /^\d{1,13}$/,
  NUMERICO15: /^\d{1,15}$/,
  NUMERICO20: /^\d{1,20}$/,
  NUMERICO20ALFA: /^\d{1,20}$|^[a-zA-Z0-9]{1,20}$/,
  /** Factura: numérico4 (contingencia) o E001 o FXXX (electrónico) */
  FACT1: /^[0-9]{4}$|E001|^F[A-Z0-9]{3}$/,
  /** Boleta: numérico4 o EB01 o BXXX */
  FACT2: /^[0-9]{4}$|EB01|^B[A-Z0-9]{3}$/,
  /** Liquidación de Compras: numérico4 o E001 o LXXX */
  FACT3: /^[0-9]{4}$|E001|^L[A-Z0-9]{3}$/,
  /** BTA / Tipo de boleto: 1-5 */
  FACT5: /^[1-5]{1}$/,
  /** Numérico4 no todo ceros */
  FACT7: /^(?!0{4})[0-9]{4}$/,
  /** Nota de crédito: factura o boleta o serie S */
  FACT8: /^[0-9]{4}$|E001|EB01|^F[A-Z0-9]{3}$|^B[A-Z0-9]{3}$|^S[A-Z0-9]{3}$/,
  FACT9: /^(?!0{15})[0-9]{15}$/,
  FACT10: /^(?!F{1,20})[A-Z0-9]{1,20}$/,
  FACT11: /^(?!S{1,20})[A-Z0-9]{1,20}$/,
  FACT12: /^(?!B{1,20})[A-Z0-9]{1,20}$/,
  FACT13: /^E[A-Z0-9]{1,3}$/,
  FACT14: /^(?!0{1,7})[0-9]{1,7}$/,
  FACT15: /^[0-9]{4}$|^F[A-Z0-9]{3}$/,
  FACT16: /^[0-9]{4}$|^S[A-Z0-9]{3}$/,
  FACT17: /^1|2|5$/,
  FACT18: /^(?!F{1,20})(?!B{1,20})(?!S{1,20})[A-Z0-9]{1,20}$/
};

// ============================================================================
// Reglas por Tipo de Comprobante (LISTA_COMPROBANTES_SERIE / NUMCP)
// Formato del valor:
//   serie: "obligatorio;longMax;exacta;regexIncluido;regexNormal"
//   numCp: "obligatorio;longMax;exacta;regex"
// Source: ValidacionParametricoRVIE.asignarParametros() líneas 287-385
// ============================================================================

export interface VoucherRule {
  /** ¿campo es obligatorio? */
  required: boolean;
  /** Longitud máxima permitida */
  maxLength: number;
  /** Si true: longitud debe ser exactamente maxLength; si false: hasta maxLength */
  exactLength: boolean;
  /** Clave del regex (ver PVSIRE_SERIE_PATTERNS) */
  regexKey: string;
}

export interface VoucherTypeRules {
  serieRules: { incluido: VoucherRule; normal: VoucherRule };
  numCpRule: VoucherRule;
}

function parseRule(rule: string, regexCol = 3): VoucherRule {
  const parts = rule.split(';');
  return {
    required: parts[0] === 'true',
    maxLength: parseInt(parts[1], 10),
    exactLength: parts[2] === 'true',
    regexKey: parts[regexCol]
  };
}

function buildSerie(rule: string): { incluido: VoucherRule; normal: VoucherRule } {
  const parts = rule.split(';');
  const base = {
    required: parts[0] === 'true',
    maxLength: parseInt(parts[1], 10),
    exactLength: parts[2] === 'true'
  };
  return {
    incluido: { ...base, regexKey: parts[3] },
    normal: { ...base, regexKey: parts[4] }
  };
}

const SERIE_RAW: Record<string, string> = {
  '00': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '01': 'true;4;true;NUMERICO4;FACT1',
  '03': 'true;4;true;NUMERICO4;FACT2',
  '04': 'true;4;true;FACT3;FACT3',
  '05': 'true;1;true;FACT5;FACT5',
  '06': 'true;4;true;FACT7;FACT7',
  '07': 'true;4;true;NUMERICO4;FACT8',
  '08': 'true;4;true;NUMERICO4;FACT8',
  '11': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '12': 'true;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '13': 'false;20;false;FACT10;ALFANUMERICO20',
  '14': 'false;20;false;FACT11;ALFANUMERICO20',
  '15': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '16': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '17': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '18': 'false;20;false;FACT12;ALFANUMERICO20',
  '19': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '21': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '23': 'true;4;false;FACT13;FACT13',
  '24': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '27': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '28': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '29': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '30': 'false;20;false;FACT10;ALFANUMERICO20',
  '32': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '34': 'true;4;true;NUMERICO4;FACT15',
  '35': 'true;4;true;NUMERICO4;FACT15',
  '36': 'true;4;true;NUMERICO4;FACT16',
  '37': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '42': 'false;20;false;FACT10;ALFANUMERICO20',
  '43': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '44': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '45': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '48': 'true;4;true;FACT7;FACT7',
  '49': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '55': 'true;1;true;FACT17;FACT17',
  '56': 'true;4;true;FACT7;FACT7',
  '64': 'false;20;false;ALFANUMERICO20;ALFANUMERICO20',
  '87': 'false;20;false;FACT18;ALFANUMERICO20',
  '88': 'false;20;false;FACT18;ALFANUMERICO20',
  '89': 'true;4;true;FACT7;FACT7'
};

const NUMCP_RAW: Record<string, string> = {
  '00': 'true;20;false;ALFANUMERICO20',
  '01': 'true;8;false;NUMERICO8',
  '03': 'true;8;false;NUMERICO8',
  '04': 'true;8;false;-',
  '05': 'true;13;false;NUMERICO13',
  '06': 'true;8;false;NUMERICO8',
  '07': 'true;8;false;NUMERICO8',
  '08': 'true;8;false;NUMERICO8',
  '11': 'true;15;true;NUMERICO15',
  '12': 'true;20;false;NUMERICO8',
  '13': 'true;20;false;NUMERICO20ALFA',
  '14': 'true;20;false;NUMERICO20ALFA',
  '15': 'true;20;false;NUMERICO20ALFA',
  '16': 'true;20;false;NUMERICO20',
  '17': 'true;20;false;NUMERICO20',
  '18': 'true;20;false;NUMERICO20',
  '19': 'true;20;false;NUMERICO20',
  '21': 'true;20;false;NUMERICO20ALFA',
  '23': 'true;7;false;NUMERICO7',
  '24': 'true;20;false;NUMERICO20ALFA',
  '27': 'true;20;false;NUMERICO20',
  '28': 'true;20;false;NUMERICO20',
  '29': 'true;20;false;NUMERICO20',
  '30': 'true;20;false;NUMERICO20',
  '32': 'true;20;false;NUMERICO20',
  '34': 'true;8;false;NUMERICO8',
  '35': 'true;8;false;NUMERICO8',
  '36': 'true;8;false;NUMERICO8',
  '37': 'true;20;false;NUMERICO20',
  '42': 'true;20;false;NUMERICO20',
  '43': 'true;20;false;NUMERICO20',
  '44': 'true;20;false;NUMERICO20',
  '45': 'true;20;false;NUMERICO20',
  '48': 'true;7;false;NUMERICO7',
  '49': 'true;20;false;NUMERICO20',
  '55': 'true;11;false;NUMERICO11',
  '56': 'true;11;false;NUMERICO11',
  '64': 'true;20;false;NUMERICO20',
  '87': 'true;20;false;NUMERICO20',
  '88': 'true;20;false;NUMERICO20',
  '89': 'true;7;false;NUMERICO7'
};

export const PVSIRE_VOUCHER_RULES: Record<string, VoucherTypeRules> = Object.fromEntries(
  Object.keys(SERIE_RAW).map((k) => [
    k,
    {
      serieRules: buildSerie(SERIE_RAW[k]),
      numCpRule: parseRule(NUMCP_RAW[k])
    }
  ])
);

// ============================================================================
// Reglas por Tipo de Documento de Identidad (LISTA_DOC_IDENTIDAD)
// Formato del valor: "longMax;isNumerico;isExacta;aplicaMod11"
// Source: ValidacionParametricoRVIE.asignarParametros() líneas 376-385
// ============================================================================

export interface DocIdentityRule {
  /** Longitud máxima del número de documento */
  maxLength: number;
  /** Si true: el número debe ser numérico; si false: alfanumérico */
  numeric: boolean;
  /** Si true: longitud exacta; si false: hasta maxLength */
  exactLength: boolean;
  /** Si true: aplica validación módulo 11 (solo RUC) */
  mod11: boolean;
}

const DOC_IDENT_RAW: Record<string, string> = {
  '0': '15;false;false;false',
  '1': '8;true;true;false',
  '4': '12;false;false;false',
  '6': '11;true;true;true',
  '7': '12;false;false;false',
  A: '15;true;true;false',
  B: '15;false;false;false',
  C: '15;false;false;false',
  D: '15;false;false;false',
  E: '15;false;false;false',
  F: '15;false;false;false'
};

export const PVSIRE_DOC_IDENT_RULES: Record<string, DocIdentityRule> = Object.fromEntries(
  Object.entries(DOC_IDENT_RAW).map(([k, v]) => {
    const parts = v.split(';');
    return [
      k,
      {
        maxLength: parseInt(parts[0], 10),
        numeric: parts[1] === 'true',
        exactLength: parts[2] === 'true',
        mod11: parts[3] === 'true'
      }
    ];
  })
);

/**
 * Tipos de CP "incluidos" (complementan propuesta) — subset de los aceptados.
 * Source: ValidacionParametricoRVIE.LISTA_PARA_INCLUIDO línea 50
 */
export const PVSIRE_VOUCHER_TYPES_INCLUIDOS = new Set([
  '00',
  '01',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '21',
  '24',
  '27',
  '28',
  '30',
  '32',
  '34',
  '35',
  '36',
  '37',
  '42',
  '43',
  '44',
  '45',
  '48',
  '49',
  '55',
  '56',
  '87',
  '88',
  '89'
]);

// ============================================================================
// Códigos de error PVSIRE adicionales (validación de importes)
// ============================================================================

export const PVSIRE_AMOUNT_ERROR_CODES = {
  /** Valor debe ser positivo pero llegó negativo (220) */
  VALOR_DEBE_SER_POSITIVO: 220,
  /** Si valor no es cero, formato inválido (221) */
  VALOR_NO_ES_CERO_NI_VALIDO: 221,
  /** NC con valor pero sin fecha emisión doc modificado (230 = BI, 231 = IGV) */
  NC_SIN_FECHA_EMISION_MOD_BI: 230,
  NC_SIN_FECHA_EMISION_MOD_IGV: 231
} as const;

// ============================================================================
// Categorías de Tipo CP para validación de importes
// Source: ValidacionParametricoRVIE.java (líneas 783-825, 909-1525)
// ============================================================================

/**
 * Tipos CP que son Notas de Crédito/Débito "ampliadas"
 * (admiten valores negativos en importes).
 *  - 07: Nota de Crédito
 *  - 87: Nota de Crédito Especial
 */
export const PVSIRE_TIPO_CP_NOTA_CREDITO = new Set(['07', '87']);

/**
 * Solo Nota de Crédito básica (sin 87) — usado por validaValorOtrosTributos
 */
export const PVSIRE_TIPO_CP_NC_BASICA = new Set(['07']);

/**
 * Tipos CP de servicios continuos donde el valor puede ser positivo o negativo
 * (recibo de servicio público y AFP).
 *  - 14: Recibo por servicios públicos (luz, agua, telefonía)
 *  - 36: Documentos emitidos por operaciones bancarias / AFP
 */
export const PVSIRE_TIPO_CP_SERVICIO_PUB = new Set(['14', '36']);

// ============================================================================
// Códigos RCE específicos (compras)
// Source: ValidacionParametricoRCE.java
// ============================================================================

export const PVSIRE_RCE_ERROR_CODES = {
  /** RCE: campo vacío (variante) */
  VACIO_RCE: 401,
  /** RCE: longitud incorrecta */
  LONGITUD_RCE: 402,
  /** RCE: regex falla */
  REGEX_RCE: 403,
  /** RCE: campo debe ir vacío (CAR Orig, Detracción, Tipo Nota, Estado CDP) */
  DEBE_IR_VACIO: 404,
  /** RCE: CAR del contribuyente debe ir vacío en reemplazo */
  CAR_DEBE_IR_VACIO: 410,
  /** RCE: tipo CP no permitido (91, 97, 98) */
  TIPO_CP_PROHIBIDO_RCE: 418,
  /** RCE: IMB sin razón válida */
  IMB_VALOR_INVALIDO: 425,
  /** RCE: código DAM no en lista oficial de aduanas */
  COD_DAM_NO_EN_LISTA: 433,
  /** RCE: PorcPart requerido cuando idProyecto inicia con "1" */
  PORC_PART_REQUERIDO: 439,
  /** RCE: Cód DAM no coincide */
  COD_DAM_NO_COINCIDE: 445,
  /** RCE: Clasif Bss y Sss fuera de rango 1-5 */
  CLASIF_NO_EN_LISTA: 446,
  /** RCE: Clasif requerido cuando codBbSS=1 */
  CLASIF_REQUERIDO: 807
} as const;

/** Tipos CP prohibidos para RCE (compras) — Source: validaTipoComprobante RCE línea 332 */
export const PVSIRE_RCE_TIPOS_PROHIBIDOS = new Set(['91', '97', '98']);

/**
 * Tipos CP que requieren código DAM/DSI obligatoriamente
 *  - 50: DAM (Declaración Aduanera de Mercancías)
 *  - 52: DSI (Declaración Simplificada de Importación)
 */
export const PVSIRE_RCE_TIPOS_REQUIEREN_DAM = new Set(['50', '52']);

/** Valores válidos para Clasificación de Bienes y Servicios (RCE) */
export const PVSIRE_CLASIF_BSS_VALIDOS = new Set(['1', '2', '3', '4', '5']);

// ============================================================================
// Patterns RCE para validación de importes
// Source: ValidacionParametricoRCE.java líneas 65-68
// ============================================================================

/** PATER_NEGATIVO: acepta 0, positivo o negativo con hasta 12 enteros + 2 decimales */
export const PVSIRE_RCE_PATER_NEGATIVO = /^-?(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

/** PATER_POSITIVO: solo 0 o positivo con hasta 12 enteros + 2 decimales */
export const PVSIRE_RCE_PATER_POSITIVO = /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

/** PATER_MONTO: acepta posneg con hasta 12 enteros + 2 decimales (igual a NEGATIVO) */
export const PVSIRE_RCE_PATER_MONTO = /^-?(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

/** PATER_TIPO_CAMBIO: 1 entero + 3 decimales, no 0.000 */
export const PVSIRE_RCE_PATER_TIPO_CAMBIO = /^(?!0\.000)(\d\.\d{3})$/;

/**
 * Tipos CP RCE que requieren valor negativo (NC y especiales del crédito fiscal).
 *  - 07: Nota de Crédito
 *  - 87: Nota de Crédito Especial
 *  - 97: Otros
 */
export const PVSIRE_RCE_TIPO_CP_NEGATIVO = new Set(['07', '87', '97']);

/**
 * Tipos CP RCE de servicios continuos (recibo, AFP) — acepta posneg.
 *  - 14: Recibo por servicios públicos
 *  - 36: Documentos por operaciones bancarias / AFP
 */
export const PVSIRE_RCE_TIPO_CP_POSNEG = new Set(['14', '36']);

/** Tipo CP "Comprobante por contribuyente del régimen MYPE" (25) */
export const PVSIRE_RCE_TIPO_CP_MYPE = '25';

/** Tipos CP que son notas (07, 08, 87, 88) — usados para validación de doc modificado RCE */
export const PVSIRE_RCE_TIPO_CP_NOTAS = new Set(['07', '08', '87', '88']);

/** Códigos de error específicos del flujo RCE Mod */
export const PVSIRE_RCE_MOD_ERROR_CODES = {
  /** Campo requerido por ser NC/ND pero está vacío (428) */
  MOD_VACIO_OBLIGATORIO: 428,
  /** Campo presente cuando NO debería (no es NC/ND) (429) */
  MOD_NO_DEBE_TENER_VALOR: 429,
  /** Fecha inválida calendario (430) */
  MOD_FECHA_INVALIDA: 430,
  /** Fecha posterior al período (431) */
  MOD_FECHA_POSTERIOR_PERIODO: 431,
  /** Tipo CP Mod prohibido (02, 03, 12, 13) (432) */
  MOD_TIPO_CP_PROHIBIDO: 432
} as const;
