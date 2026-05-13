/**
 * Genera archivos TXT SIRE de muestra para validar contra el portal SIRE / PVSIRE.
 *
 * Usa los exporters reales de la app + factories de test para datos sintéticos.
 * Output: out/sire-samples/{filename SIRE oficial}.TXT
 */
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exportSalesTXT, exportPurchasesTXT } from '../src/shared/lib/export/generic-export';
import { buildSireFileName } from '../src/shared/lib/export/sire-filename';
import { validateForPvsire } from '../src/shared/lib/export/pvsire-row-validator';
import { aSalesInvoice, aPurchaseInvoice } from '../src/test/helpers/factories';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'out', 'sire-samples');

// Período de prueba — uno donde el cliente ya tenga datos cargados
const PERIOD = '202501';
// RUC del user (con el que va a loguear en PVSIRE)
const RUC = '10719887304';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // === RVIE — Ventas ===
  const sales = [
    aSalesInvoice({
      id: 1,
      ruc: RUC,
      period: PERIOD,
      issueDate: '2026-04-05',
      voucherType: '01',
      voucherSeries: 'F001',
      voucherNumber: '00000001',
      taxableBase: 100,
      vatAmount: 18,
      totalAmount: 118
    }),
    aSalesInvoice({
      id: 2,
      ruc: RUC,
      period: PERIOD,
      issueDate: '2026-04-12',
      voucherType: '03',
      voucherSeries: 'B001',
      voucherNumber: '00000045',
      taxableBase: 50,
      vatAmount: 9,
      totalAmount: 59
    }),
    aSalesInvoice({
      id: 3,
      ruc: RUC,
      period: PERIOD,
      issueDate: '2026-04-20',
      voucherType: '07',
      voucherSeries: 'F001',
      voucherNumber: '00000005',
      taxableBase: -20,
      vatAmount: -3.6,
      totalAmount: -23.6,
      modifiedVoucherDate: '2026-04-05',
      modifiedVoucherType: '01',
      modifiedVoucherSeries: 'F001',
      modifiedVoucherNumber: '00000001'
    })
  ];

  // === RCE — Compras ===
  const purchases = [
    aPurchaseInvoice({
      id: 1,
      ruc: RUC,
      period: PERIOD,
      issueDate: '2026-04-08',
      voucherType: '01',
      voucherSeries: 'F001',
      voucherNumberStart: '00001234',
      taxableBaseTaxed: 200,
      vatAmountTaxed: 36,
      totalAmount: 236
    }),
    aPurchaseInvoice({
      id: 2,
      ruc: RUC,
      period: PERIOD,
      issueDate: '2026-04-15',
      voucherType: '01',
      voucherSeries: 'F002',
      voucherNumberStart: '00000077',
      taxableBaseTaxed: 500,
      vatAmountTaxed: 90,
      totalAmount: 590
    })
  ];

  console.log('=== Validación pre-export ===\n');
  const salesValidation = validateForPvsire(sales, 'sales', PERIOD);
  console.log(`RVIE: ${salesValidation.ok ? '✅' : '❌'} (${salesValidation.totalErrors} errores)`);
  if (!salesValidation.ok) {
    for (const { row, result } of salesValidation.rowResults) {
      if (!result.ok) {
        result.errors.forEach((e) => console.log(`  ❌ Fila ${row} ${e.field} (PVSIRE ${e.code}): ${e.message}`));
      }
    }
  }

  const purchasesValidation = validateForPvsire(purchases, 'purchases', PERIOD);
  console.log(`RCE:  ${purchasesValidation.ok ? '✅' : '❌'} (${purchasesValidation.totalErrors} errores)`);
  if (!purchasesValidation.ok) {
    for (const { row, result } of purchasesValidation.rowResults) {
      if (!result.ok) {
        result.errors.forEach((e) => console.log(`  ❌ Fila ${row} ${e.field} (PVSIRE ${e.code}): ${e.message}`));
      }
    }
  }

  // Si hay errores, no escribir archivos
  if (!salesValidation.ok || !purchasesValidation.ok) {
    console.error('\n⛔ Hay errores. Arreglar antes de generar TXT.');
    process.exit(1);
  }

  // Generar TXT
  const salesTxt = exportSalesTXT(sales);
  const salesFile = buildSireFileName({ ruc: RUC, period: PERIOD, type: 'sales' });
  const salesPath = join(OUT_DIR, salesFile);
  await writeFile(salesPath, salesTxt, 'utf-8');

  const purchasesTxt = exportPurchasesTXT(purchases);
  const purchasesFile = buildSireFileName({ ruc: RUC, period: PERIOD, type: 'purchases' });
  const purchasesPath = join(OUT_DIR, purchasesFile);
  await writeFile(purchasesPath, purchasesTxt, 'utf-8');

  console.log('\n=== Archivos generados ===\n');
  console.log(`📄 RVIE: ${salesPath}`);
  console.log(`   ${sales.length} filas, ${salesTxt.split('\n')[0].split('|').length} columnas`);
  console.log(`📄 RCE:  ${purchasesPath}`);
  console.log(`   ${purchases.length} filas, ${purchasesTxt.split('\n')[0].split('|').length} columnas`);
  console.log('\nListos para subir al portal SIRE / validar con PVSIRE.');
}

main();
