/**
 * Reglas paramétricas RCE cargadas del JSON oficial de PVSIRE 1.7.0.
 *
 * Source: pvsire-rce-rules.json (copia byte-a-byte de json/validacionesRCE.json del JAR).
 *
 * Estructura:
 *  - paises: lista de países (codigo, descripcion)
 *  - docIdentidad: 11 tipos de documento de identidad con sus reglas
 *  - comprobantes: 54 tipos de comprobante con reglas de serie/numCp
 *  - monedas: 277 monedas ISO 4217
 *  - aduanas: 39 códigos de aduana DAM/DSI
 */
import rules from './pvsire-rce-rules.json';

// ============================================================================
// Tipos
// ============================================================================

export interface PvsireSerieRule {
  obligatorio: boolean;
  longitud: number;
  exactitud: boolean;
  /** Regex que aplica si la serie es de comprobante electrónico (ej. E001, F001) */
  validacionElectronico: string;
  /** Regex que aplica si la serie es de comprobante físico (contingencia) */
  validacionFisico: string;
}

export interface PvsireNumCpRule {
  obligatorio: boolean;
  longitud: number;
  exactitud: boolean;
  /** Regex de validación. Puede contener "[MAXIMO]" como placeholder a reemplazar */
  validacion: string;
  numerico: boolean;
}

export interface PvsireComprobanteRule {
  codigo: string;
  descripcion?: string;
  numSerie: PvsireSerieRule;
  numCp: PvsireNumCpRule;
}

export interface PvsireDocIdentidadRule {
  codigo: string;
  descripcion: string;
  longitud: number;
  numerico: boolean;
  exactitud: boolean;
  modulo11: boolean;
}

export interface PvsireMonedaRule {
  codigo: string;
  descripcion?: string;
}

export interface PvsireAduanaRule {
  codigo: string;
  descripcion?: string;
}

export interface PvsirePaisRule {
  numero: string;
  descripcion?: string;
}

interface PvsireRulesRoot {
  paises: PvsirePaisRule[];
  docIdentidad: PvsireDocIdentidadRule[];
  comprobantes: PvsireComprobanteRule[];
  monedas: PvsireMonedaRule[];
  aduanas: PvsireAduanaRule[];
}

const data = rules as PvsireRulesRoot;

// ============================================================================
// Maps por código para lookup O(1)
// ============================================================================

export const PVSIRE_RCE_COMPROBANTES: Map<string, PvsireComprobanteRule> = new Map(
  data.comprobantes.map((c) => [c.codigo, c])
);

export const PVSIRE_RCE_DOC_IDENTIDAD: Map<string, PvsireDocIdentidadRule> = new Map(
  data.docIdentidad.filter((d) => d.codigo).map((d) => [d.codigo, d])
);

export const PVSIRE_RCE_MONEDAS: Set<string> = new Set(data.monedas.map((m) => m.codigo));

export const PVSIRE_RCE_ADUANAS: Set<string> = new Set(data.aduanas.map((a) => a.codigo));

export const PVSIRE_RCE_PAISES: Set<string> = new Set(data.paises.map((p) => p.numero));

// ============================================================================
// Listas útiles
// ============================================================================

/**
 * Tipos CP que requieren año de emisión (DAM/DSI y variantes).
 * Source: ValidacionParametricoRCE.validaAnioEmision línea 387-410.
 */
export const PVSIRE_RCE_TIPOS_CON_ANIO = new Set(['50', '51', '52', '53', '54']);

/**
 * Tipos CP admitidos para numCP con regex numérico positivo.
 * Source: ValidacionParametricoRCE.validaNumCP línea 411-430.
 */
export const PVSIRE_RCE_TIPOS_NUMCP_NUMERICO = new Set([
  '01', '02', '03', '05', '06', '07', '08', '10',
  '12', '16', '17', '18', '19', '22', '23', '25',
  '27', '28', '29', '30', '32', '34', '35', '36',
  '37', '42', '43', '44', '45', '46', '48',
  '50', '51', '52', '53', '54',
  '55', '56', '64',
  '87', '88', '89'
]);
