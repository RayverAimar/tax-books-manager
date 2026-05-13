import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Código de oportunidad SIRE (posición 28-29 del nombre).
 * - 01: cuando el contribuyente ACEPTA la propuesta del registro
 * - 02: cuando REEMPLAZA la propuesta (caso más común al exportar desde la app)
 * - 03: ajustes posteriores al periodo
 * - 04: ajustes anteriores al nuevo sistema (formato general)
 * - 05: ajustes anteriores al nuevo sistema (formato simplificado)
 */
export type SireOpportunity = '01' | '02' | '03' | '04' | '05';

/**
 * Genera el nombre de archivo oficial SIRE (Sistema Integrado de Registros Electrónicos)
 * según Tabla 6 del Anexo 1 de la RS 112-2021/SUNAT.
 *
 * Patrón: `LE{RUC}{AAAA}{MM}00{libro}{CC}{O}{I}{M}{G}[NN].TXT`
 * - RUC: 11 dígitos del contribuyente
 * - AAAA: año del período
 * - MM: mes del período
 * - 00: día (siempre 00 para libros mensuales)
 * - libro: 140400 = RVIE (Ventas), 080400 = RCE (Compras)
 * - CC: código de oportunidad (ver SireOpportunity)
 * - O: indicador de operaciones (0=cierre RUC / 1=operativa / 2=cierre libro)
 * - I: contenido (1=con info, 0=sin info)
 * - M: moneda (1=soles, 2=dólares)
 * - G: indicador de sistema, siempre `2` (libro generado por MIGE IGV)
 * - NN: correlativo (solo para ajustes posteriores CC=03/04/05)
 *
 * Ejemplo RVIE enero 2024 reemplazando propuesta, operativa, con info, soles:
 *   LE20123456789202401001404000211112.TXT
 */
export function buildSireFileName({
  ruc,
  period,
  type,
  opportunity = '02',
  hasInfo = true,
  currency = 'PEN',
  operationIndicator = '1',
  correlative
}: {
  ruc: string;
  /** Período en formato YYYYMM */
  period: string;
  type: InvoiceType;
  opportunity?: SireOpportunity;
  hasInfo?: boolean;
  currency?: 'PEN' | 'USD';
  operationIndicator?: '0' | '1' | '2';
  /** Correlativo para ajustes posteriores (CC=03/04/05). Ignorado en otros casos. */
  correlative?: string;
}): string {
  // Códigos según PVSIRE v1.7.0:
  // - ConstantesValidaciones.COD_LIBRO_RVIE_CP = "140000"
  // - ConstantesValidaciones.COD_LIBRO_RCE_CP  = "080400"
  // (No domiciliados RCE: "080500" — no soportado todavía)
  const libro = type === 'sales' ? '140000' : '080400';
  const aaaa = period.slice(0, 4);
  const mm = period.slice(4, 6);
  const indicadorContenido = hasInfo ? '1' : '0';
  const indicadorMoneda = currency === 'USD' ? '2' : '1';
  const indicadorSistema = '2'; // fijo: libro generado por MIGE IGV
  const sufijoCorrelativo = ['03', '04', '05'].includes(opportunity) && correlative ? correlative : '';

  const indicadores = `${opportunity}${operationIndicator}${indicadorContenido}${indicadorMoneda}${indicadorSistema}`;
  return `LE${ruc}${aaaa}${mm}00${libro}${indicadores}${sufijoCorrelativo}.TXT`;
}
