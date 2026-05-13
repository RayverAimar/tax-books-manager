/**
 * Tablas oficiales SIRE — Anexo 1 RS 112-2021/SUNAT.
 *
 * Source of truth: PDF oficial https://www.sunat.gob.pe/legislacion/superin/2021/anexo-112-2021.pdf
 * Verificado 2026-05-12. Cualquier código fuera de estas tablas hace que PVSIRE rechace el archivo.
 */

/**
 * Tabla 1 — Tipo de Documento de Identidad
 */
export const SIRE_DOC_TYPES = {
  '0': 'Doc. trib. no domiciliado sin RUC',
  '1': 'DNI',
  '4': 'Carnet de extranjería',
  '6': 'RUC',
  '7': 'Pasaporte',
  A: 'Cédula diplomática de identidad',
  B: 'Doc. identidad país residencia no domiciliado',
  C: 'TIN — Doc. trib. PP.NN',
  D: 'IN — Doc. trib. PP.JJ',
  E: 'TAM — Tarjeta andina de migración',
  F: 'PTP — Permiso temporal de permanencia'
} as const;

export type SireDocType = keyof typeof SIRE_DOC_TYPES;

/**
 * Tabla 1 — reglas de longitud y validación por tipo de documento.
 * LO=longitud, T=Tipo (A=Alfanum, N=Numérico), L=fijo|variable, M=módulo 11
 */
export interface SireDocTypeRule {
  length: number;
  type: 'A' | 'N';
  fixed: boolean;
  mod11: boolean;
}

export const SIRE_DOC_TYPE_RULES: Record<string, SireDocTypeRule> = {
  '0': { length: 15, type: 'A', fixed: false, mod11: false },
  '1': { length: 8, type: 'N', fixed: true, mod11: false },
  '4': { length: 12, type: 'A', fixed: false, mod11: false },
  '6': { length: 11, type: 'N', fixed: true, mod11: true },
  '7': { length: 12, type: 'A', fixed: false, mod11: false },
  A: { length: 15, type: 'N', fixed: true, mod11: false },
  B: { length: 15, type: 'A', fixed: false, mod11: false },
  C: { length: 15, type: 'A', fixed: false, mod11: false },
  D: { length: 15, type: 'A', fixed: false, mod11: false },
  E: { length: 15, type: 'A', fixed: false, mod11: false },
  F: { length: 15, type: 'A', fixed: false, mod11: false }
};

/**
 * Tabla 2 — Tipo de moneda (ISO 4217). Subset de los más usados en Perú.
 * La tabla oficial incluye ~180 monedas; aceptamos cualquier código de 3 letras y
 * validamos contra esta lista solo las advertencias (no error duro).
 */
export const SIRE_COMMON_CURRENCIES = new Set([
  'PEN', // Soles
  'USD', // US Dollar
  'EUR', // Euro
  'BRL', // Brasil
  'CLP', // Chile
  'COP', // Colombia
  'ARS', // Argentina
  'BOB', // Bolivia
  'CAD', // Canadá
  'CHF', // Suiza
  'CNY', // China
  'GBP', // Reino Unido
  'JPY', // Japón
  'MXN', // México
  'XDR' // SDR FMI
]);

/**
 * Tabla 3 — Tipo de Comprobante de Pago o Documento (códigos más relevantes para SIRE).
 * Extracto de la tabla oficial; los códigos usados en RVIE y RCE.
 */
export const SIRE_VOUCHER_TYPES = {
  '00': 'Otros',
  '01': 'Factura',
  '02': 'Recibo por honorarios',
  '03': 'Boleta de venta',
  '04': 'Liquidación de compra',
  '05': 'Boleto de transporte aéreo (BME)',
  '06': 'Carta de porte aéreo',
  '07': 'Nota de crédito',
  '08': 'Nota de débito',
  '09': 'Guía de remisión',
  '10': 'Recibo por arrendamiento',
  '11': 'Póliza emitida por agentes de bolsa',
  '12': 'Ticket o cinta emitido por máquina registradora',
  '13': 'Documento emitido por bancos / financieras',
  '14': 'Recibo por servicios públicos (luz, agua, telefonía)',
  '15': 'Boleto emitido por servicio de transporte público urbano',
  '16': 'Boleto de viaje terrestre',
  '18': 'Documentos emitidos por AFP',
  '19': 'Boleto numerado emitido por espectáculos públicos',
  '21': 'Conocimiento de embarque por transporte marítimo',
  '22': 'Comprobante por compra de oro al productor',
  '23': 'Pólizas de adjudicación',
  '24': 'Certificado de pago de regalías minera',
  '25': 'Documento por venta de bienes nave / aeronave',
  '26': 'Boletos por servicios de telefonía pública',
  '27': 'Seguros y reaseguros',
  '28': 'Tasas y derechos administrativos',
  '29': 'Documentos emitidos por COFOPRI',
  '30': 'Documentos emitidos por edificación de unidades inmobiliarias',
  '31': 'Guía de remisión transportista',
  '32': 'Documentos por venta de bienes terminados de tránsito',
  '34': 'Documentos por servicio de salud público',
  '35': 'Recibo por servicio bajo régimen de PYME',
  '36': 'Documentos por operaciones bancarias',
  '37': 'Documentos por operaciones de comercio exterior',
  '40': 'Comprobante de Percepción',
  '41': 'Comprobante de Percepción Venta Interna',
  '42': 'Documento del operador / Atribución',
  '43': 'Boleto único cuya emisión es por el operador',
  '45': 'Documentos autorizados por SUNAT',
  '48': 'Comprobante de operaciones — Ley N° 29972',
  '50': 'DAM (Declaración Aduanera de Mercancías)',
  '52': 'Declaración Simplificada de Importación (DSI)',
  '53': 'Declaraciones únicas — exportación',
  '54': 'Otros documentos por importación',
  '55': 'BVME para transporte ferroviario de pasajeros',
  '56': 'Comprobante de pago SEAE (Sistema Especial Anticipado de Exportación)',
  '87': 'Nota de crédito especial',
  '88': 'Nota de débito especial',
  '91': 'Comprobante de no domiciliado'
} as const;

export type SireVoucherType = keyof typeof SIRE_VOUCHER_TYPES;

/**
 * Tabla 5 — Reglas generales del RVIE
 */
export const SIRE_FIELD_RULES = {
  /** Caracteres prohibidos en celdas de texto libre. Las fechas dd/mm/yyyy son excepción. */
  PROHIBITED_CHARS: ['|', '/', '\\'] as const,
  /** Patrón de fecha que SIRE espera */
  DATE_PATTERN: /^\d{2}\/\d{2}\/\d{4}$/,
  /** Longitud máxima de campos numéricos: hasta 12 enteros + 2 decimales (sin comas) */
  MAX_NUMERIC_DIGITS_INT: 12,
  MAX_NUMERIC_DIGITS_DEC: 2,
  /** Tipo de cambio: 1 entero + 3 decimales */
  EXCHANGE_RATE_INT: 1,
  EXCHANGE_RATE_DEC: 3,
  /** Tolerancia en validación de coherencia aritmética (céntimos) */
  ARITHMETIC_TOLERANCE: 0.05
} as const;

/**
 * Longitudes máximas por campo (extraídas del Excel oficial Anexo 3 / Anexo 11).
 * Las claves son los tsField del registry. Si no está acá, no se valida longitud.
 */
export const SIRE_FIELD_MAX_LENGTH: Record<string, number> = {
  // RUC del contribuyente: exacto 11
  ruc: 11,
  // ID del registro: hasta 1500
  businessName: 1500,
  // Período: exacto 6
  period: 6,
  // CAR SUNAT: hasta 40 (validación laxa)
  sunatCorrelative: 40,
  // Fechas: 10 chars (dd/mm/yyyy)
  issueDate: 10,
  dueDate: 10,
  modifiedVoucherDate: 10,
  // Tipo CP/Doc: 2 chars
  voucherType: 2,
  modifiedVoucherType: 2,
  // Serie: hasta 20
  voucherSeries: 20,
  modifiedVoucherSeries: 20,
  // Año (DAM/DSI): 4 chars
  customsYear: 4,
  // Nro CP: hasta 20
  voucherNumber: 20,
  voucherNumberStart: 20,
  voucherNumberEnd: 20,
  modifiedVoucherNumber: 20,
  // Tipo Doc Identidad: exacto 1
  customerDocType: 1,
  supplierDocType: 1,
  // Nro Doc Identidad: hasta 15
  customerDocNumber: 15,
  supplierDocNumber: 15,
  // Apellidos / Razón Social: hasta 1500
  customerName: 1500,
  supplierName: 1500,
  // Moneda: 3 chars
  currency: 3,
  // Atribución / Operadores: hasta 50
  attributionProjectId: 50,
  operatorsProjectId: 50,
  // COD. DAM O DSI: 3
  damCode: 3,
  // Clasificación Bss y Sss: 1
  goodsServicesClass: 1,
  // PorcPart: hasta 2 enteros + 2 decimales
  participationPercentage: 5,
  // CAR Orig: hasta 40
  carExportImportIndicator: 40,
  // CLU (libre uso): hasta 200 — aplica freeUseField1..freeUseField39
  ...Object.fromEntries(Array.from({ length: 39 }, (_, i) => [`freeUseField${i + 1}`, 200]))
};
