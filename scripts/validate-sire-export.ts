/**
 * Validador estructural offline contra SIRE oficial.
 *
 * Genera TXT y CSV de muestra usando los exporters de la app y los compara contra:
 * - Anexo 3 RS 112-2021 (RVIE — ventas, 50 columnas)
 * - Anexo 11 RS 040-2022 (RCE — compras, 80 columnas)
 *
 * Cubre ~80% de lo que valida PVSIRE offline. NO valida:
 * - CAR contra padrón SUNAT, RUC contra padrón, validez del CDR
 * - Reglas de oportunidad (CC) en nombre de archivo
 */
import { exportSalesTXT, exportSalesCSV, exportPurchasesTXT, exportPurchasesCSV } from '../src/shared/lib/export/generic-export';
import { aSalesInvoice, aPurchaseInvoice } from '../src/test/helpers/factories';

// Headers oficiales SIRE — extraídos del Excel oficial (cpe.sunat.gob.pe, 30-mar-2026)
const SIRE_RVIE_HEADERS = [
  'RUC', 'ID', 'Periodo', 'CAR SUNAT', 'Fecha de emisión', 'Fecha Vcto/Pago',
  'Tipo CP/Doc.', 'Serie del CDP', 'Nro CP o Doc. Nro Inicial (Rango)', 'Nro Final (Rango)',
  'Tipo Doc Identidad', 'Nro Doc Identidad', 'Apellidos Nombres/ Razon  Social',
  'Valor Facturado Exportación', 'BI Gravada', 'Dscto BI', 'IGV / IPM DG', 'Dscto IGV / IPM',
  'Mto Exonerado', 'Mto Inafecto', 'ISC', 'BI Grav IVAP', 'IVAP', 'ICBPER', 'Otros Tributos',
  'Total CP', 'Moneda', 'Tipo de Cambio', 'Fecha Emision Doc Modificado', 'Tipo CP Modificado',
  'Serie CP Modificado', 'Nro CP Modificado', 'ID Proyecto Operadores Atribución',
  ...Array.from({ length: 17 }, (_, i) => `CLU${i + 1}`)
];

// SIRE pos 38-41 son SUNAT-autoFilled. En CSV los emitimos como SIRE_AUTO_NN
// (placeholders únicos para evitar deduplicación de headers vacíos).
// En TXT (sin cabecera) van como celdas vacías.
const SIRE_RCE_HEADERS = [
  'RUC', 'Apellidos y Nombres o Razón social', 'Periodo', 'CAR SUNAT', 'Fecha de emisión',
  'Fecha Vcto/Pago', 'Tipo CP/Doc.', 'Serie del CDP', 'Año', 'Nro CP o Doc. Nro Inicial (Rango)',
  'Nro Final (Rango)', 'Tipo Doc Identidad', 'Nro Doc Identidad', 'Apellidos Nombres/ Razón  Social',
  'BI Gravado DG', 'IGV / IPM DG', 'BI Gravado DGNG', 'IGV / IPM DGNG', 'BI Gravado DNG',
  'IGV / IPM DNG', 'Valor Adq. NG', 'ISC', 'ICBPER', 'Otros Trib/ Cargos', 'Total CP', 'Moneda',
  'Tipo de Cambio', 'Fecha Emisión Doc Modificado', 'Tipo CP Modificado', 'Serie CP Modificado',
  'COD. DAM O DSI', 'Nro CP Modificado', 'Clasif de Bss y Sss', 'ID Proyecto Operadores/Participes',
  'PorcPart', 'IMB', 'CAR Orig',
  'SIRE_AUTO_38', 'SIRE_AUTO_39', 'SIRE_AUTO_40', 'SIRE_AUTO_41',
  ...Array.from({ length: 39 }, (_, i) => `CLU${i + 1}`)
];

const SIRE_AUTO_PATTERN = /^SIRE_AUTO_\d+$/;

interface Issue {
  severity: 'error' | 'warning';
  category: string;
  message: string;
}

function validate(
  generated: string,
  expectedHeaders: string[],
  separator: string,
  hasHeaderRow: boolean
): Issue[] {
  const issues: Issue[] = [];
  const lines = generated.split('\n');
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
    issues.push({ severity: 'error', category: 'archivo', message: 'Archivo vacío' });
    return issues;
  }

  const firstDataRowIdx = hasHeaderRow ? 1 : 0;
  const expectedCols = expectedHeaders.length;
  const firstRowCells = lines[0].split(separator);

  // 1. Conteo de columnas
  if (firstRowCells.length !== expectedCols) {
    issues.push({
      severity: 'error',
      category: 'estructura',
      message: `Columnas: app=${firstRowCells.length}, SIRE=${expectedCols} (diff ${firstRowCells.length - expectedCols})`
    });
  }

  // 2. Si tiene cabecera (CSV): comparar headers byte-a-byte
  if (hasHeaderRow) {
    const actualHeaders = firstRowCells.map((h) => h.replace(/^"|"$/g, ''));
    const maxLen = Math.max(actualHeaders.length, expectedCols);
    for (let i = 0; i < maxLen; i++) {
      const actual = actualHeaders[i] ?? null;
      const expected = i < expectedCols ? expectedHeaders[i] : null;
      if (actual === null) {
        issues.push({ severity: 'error', category: 'header', message: `Pos ${i + 1}: FALTA — SIRE espera "${expected}"` });
      } else if (expected === null) {
        issues.push({ severity: 'error', category: 'header', message: `Pos ${i + 1}: SOBRA — app envía "${actual}"` });
      } else if (actual !== expected) {
        issues.push({ severity: 'error', category: 'header', message: `Pos ${i + 1}: app="${actual}" ≠ SIRE="${expected}"` });
      }
    }
  }

  // 3. Pos SIRE_AUTO_NN: la celda data en esas posiciones debe estar vacía
  if (lines.length > firstDataRowIdx) {
    const dataCells = lines[firstDataRowIdx].split(separator);
    for (let i = 0; i < expectedCols; i++) {
      if (SIRE_AUTO_PATTERN.test(expectedHeaders[i]) && dataCells[i] && dataCells[i].trim() !== '') {
        issues.push({
          severity: 'error',
          category: 'auto-completado',
          message: `Pos ${i + 1} (SUNAT completa) tiene valor "${dataCells[i]}" — debe ir vacío`
        });
      }
    }
  }

  // 4. Caracteres prohibidos en TXT
  if (separator === '|' && lines.length > firstDataRowIdx) {
    const dataLine = lines[firstDataRowIdx];
    // / y \ pueden aparecer en fechas (dd/mm/yyyy) — no marcar dentro de fechas
    const noDateLine = dataLine.replace(/\d{2}\/\d{2}\/\d{4}/g, '');
    if (/[/\\]/.test(noDateLine)) {
      issues.push({
        severity: 'warning',
        category: 'caracteres',
        message: 'Posibles "/" o "\\" en texto libre (SIRE prohíbe |, /, \\)'
      });
    }
  }

  // 5. Formato de negativos: SIRE espera "- #.##"
  if (lines.length > firstDataRowIdx) {
    const dataLine = lines[firstDataRowIdx];
    if (/(?<![\d-])-\d/.test(dataLine)) {
      issues.push({
        severity: 'warning',
        category: 'formato',
        message: 'Negativos sin espacio detectados (app: "-123.45", SIRE: "- 123.45")'
      });
    }
  }

  return issues;
}

function printReport(label: string, issues: Issue[]) {
  console.log(`\n========== ${label} ==========`);
  if (issues.length === 0) {
    console.log('✅ Sin issues estructurales');
    return;
  }
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  console.log(`❌ ${errors.length} errores, ⚠️  ${warnings.length} warnings\n`);
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
    console.log(`  ${icon} [${issue.category}] ${issue.message}`);
  }
}

function dumpSample(label: string, content: string) {
  console.log(`\n--- Muestra ${label} (primeras 2 líneas) ---`);
  const lines = content.split('\n').slice(0, 2);
  for (const l of lines) console.log('  ' + (l.length > 250 ? l.slice(0, 250) + '...' : l));
}

// Generar muestras
const salesSample = [
  aSalesInvoice(),
  aSalesInvoice({ id: 2, voucherNumber: '00000002', totalAmount: -50, taxableBase: -42.37, vatAmount: -7.63 })
];
const purchasesSample = [aPurchaseInvoice()];

const salesTxt = exportSalesTXT(salesSample);
const salesCsv = exportSalesCSV(salesSample);
const purchasesTxt = exportPurchasesTXT(purchasesSample);
const purchasesCsv = exportPurchasesCSV(purchasesSample);

dumpSample('Ventas TXT', salesTxt);
dumpSample('Compras TXT', purchasesTxt);

// SIRE oficial: TXT sin cabecera, CSV con cabecera (uso interno)
printReport('RVIE — Ventas TXT (pipe, SIN cabecera) vs Anexo 3 SIRE', validate(salesTxt, SIRE_RVIE_HEADERS, '|', false));
printReport('RVIE — Ventas CSV (coma, con cabecera) vs Anexo 3 SIRE', validate(salesCsv, SIRE_RVIE_HEADERS, ',', true));
printReport('RCE — Compras TXT (pipe, SIN cabecera) vs Anexo 11 SIRE', validate(purchasesTxt, SIRE_RCE_HEADERS, '|', false));
printReport('RCE — Compras CSV (coma, con cabecera) vs Anexo 11 SIRE', validate(purchasesCsv, SIRE_RCE_HEADERS, ',', true));
