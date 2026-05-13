/**
 * Regresión SIRE: el output de los exporters debe cumplir byte-a-byte la estructura
 * oficial del Anexo 3 (RVIE) y Anexo 11 (RCE) de las RS 112-2021 / 040-2022 SUNAT.
 *
 * Fuente: Excel oficial en https://cpe.sunat.gob.pe/estructura-de-archivos
 * (Last-Modified servidor SUNAT: 2026-03-30).
 *
 * Si este test falla después de tocar field-registry, no parches el test — verifica
 * primero contra el Excel oficial y, en duda, contra PVSIRE.
 */
import { describe, it, expect } from 'vitest';
import { exportSalesTXT, exportSalesCSV, exportPurchasesTXT, exportPurchasesCSV } from '../generic-export';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

// Headers oficiales SIRE (50 cols RVIE, 80 cols RCE)
const SIRE_RVIE_HEADERS = [
  'RUC',
  'ID',
  'Periodo',
  'CAR SUNAT',
  'Fecha de emisión',
  'Fecha Vcto/Pago',
  'Tipo CP/Doc.',
  'Serie del CDP',
  'Nro CP o Doc. Nro Inicial (Rango)',
  'Nro Final (Rango)',
  'Tipo Doc Identidad',
  'Nro Doc Identidad',
  'Apellidos Nombres/ Razon  Social',
  'Valor Facturado Exportación',
  'BI Gravada',
  'Dscto BI',
  'IGV / IPM DG',
  'Dscto IGV / IPM',
  'Mto Exonerado',
  'Mto Inafecto',
  'ISC',
  'BI Grav IVAP',
  'IVAP',
  'ICBPER',
  'Otros Tributos',
  'Total CP',
  'Moneda',
  'Tipo de Cambio',
  'Fecha Emision Doc Modificado',
  'Tipo CP Modificado',
  'Serie CP Modificado',
  'Nro CP Modificado',
  'ID Proyecto Operadores Atribución',
  ...Array.from({ length: 17 }, (_, i) => `CLU${i + 1}`)
];

const SIRE_RCE_HEADERS = [
  'RUC',
  'Apellidos y Nombres o Razón social',
  'Periodo',
  'CAR SUNAT',
  'Fecha de emisión',
  'Fecha Vcto/Pago',
  'Tipo CP/Doc.',
  'Serie del CDP',
  'Año',
  'Nro CP o Doc. Nro Inicial (Rango)',
  'Nro Final (Rango)',
  'Tipo Doc Identidad',
  'Nro Doc Identidad',
  'Apellidos Nombres/ Razón  Social',
  'BI Gravado DG',
  'IGV / IPM DG',
  'BI Gravado DGNG',
  'IGV / IPM DGNG',
  'BI Gravado DNG',
  'IGV / IPM DNG',
  'Valor Adq. NG',
  'ISC',
  'ICBPER',
  'Otros Trib/ Cargos',
  'Total CP',
  'Moneda',
  'Tipo de Cambio',
  'Fecha Emisión Doc Modificado',
  'Tipo CP Modificado',
  'Serie CP Modificado',
  'COD. DAM O DSI',
  'Nro CP Modificado',
  'Clasif de Bss y Sss',
  'ID Proyecto Operadores/Participes',
  'PorcPart',
  'IMB',
  'CAR Orig',
  // Pos 38-41: SUNAT autoFilled (en CSV: placeholder SIRE_AUTO_NN; en TXT: celda vacía)
  'SIRE_AUTO_38',
  'SIRE_AUTO_39',
  'SIRE_AUTO_40',
  'SIRE_AUTO_41',
  ...Array.from({ length: 39 }, (_, i) => `CLU${i + 1}`)
];

const SIRE_AUTO_PATTERN = /^SIRE_AUTO_\d+$/;

describe('SIRE compliance (regresión contra Anexo oficial)', () => {
  describe('RVIE — Ventas (Anexo 3 RS 112-2021)', () => {
    it('TXT no incluye cabecera (SIRE submission format)', () => {
      const txt = exportSalesTXT([aSalesInvoice()]);
      const firstLine = txt.split('\n')[0];
      // Primera línea es data, no headers — debe empezar con el RUC numérico
      expect(firstLine).toMatch(/^\d{11}\|/);
    });

    it('TXT tiene exactamente 50 columnas por fila', () => {
      const txt = exportSalesTXT([aSalesInvoice()]);
      const cols = txt.split('\n')[0].split('|');
      expect(cols).toHaveLength(50);
    });

    it('CSV tiene cabecera byte-a-byte como el Excel oficial', () => {
      const csv = exportSalesCSV([aSalesInvoice()]);
      const headerRow = csv.split('\n')[0];
      const actualHeaders = headerRow.split(',').map((h) => h.replace(/^"|"$/g, ''));
      expect(actualHeaders).toEqual(SIRE_RVIE_HEADERS);
    });

    it('CSV tiene 50 columnas (cabecera + data)', () => {
      const csv = exportSalesCSV([aSalesInvoice()]);
      const dataRow = csv.split('\n')[1];
      expect(dataRow.split(',')).toHaveLength(50);
    });
  });

  describe('RCE — Compras (Anexo 11 RS 040-2022)', () => {
    it('TXT no incluye cabecera', () => {
      const txt = exportPurchasesTXT([aPurchaseInvoice()]);
      expect(txt.split('\n')[0]).toMatch(/^\d{11}\|/);
    });

    it('TXT tiene exactamente 80 columnas por fila', () => {
      const txt = exportPurchasesTXT([aPurchaseInvoice()]);
      const cols = txt.split('\n')[0].split('|');
      expect(cols).toHaveLength(80);
    });

    it('TXT: pos 38-41 (SUNAT autoFilled) van vacías', () => {
      const txt = exportPurchasesTXT([aPurchaseInvoice()]);
      const cols = txt.split('\n')[0].split('|');
      // Pos 38-41 = índices 37-40
      expect(cols[37]).toBe('');
      expect(cols[38]).toBe('');
      expect(cols[39]).toBe('');
      expect(cols[40]).toBe('');
    });

    it('CSV tiene cabecera byte-a-byte como el Excel oficial', () => {
      const csv = exportPurchasesCSV([aPurchaseInvoice()]);
      const headerRow = csv.split('\n')[0];
      const actualHeaders = headerRow.split(',').map((h) => h.replace(/^"|"$/g, ''));
      expect(actualHeaders).toEqual(SIRE_RCE_HEADERS);
    });

    it('CSV: pos 38-41 (SUNAT autoFilled) van vacías en la fila de datos', () => {
      const csv = exportPurchasesCSV([aPurchaseInvoice()]);
      const headers = csv.split('\n')[0].split(',');
      const dataCols = csv.split('\n')[1].split(',');
      for (let i = 0; i < headers.length; i++) {
        if (SIRE_AUTO_PATTERN.test(headers[i])) {
          expect(dataCols[i], `Pos ${i + 1} debe ir vacía`).toBe('');
        }
      }
    });
  });

  describe('SIRE rules generales', () => {
    it('TXT usa separador |', () => {
      const txt = exportSalesTXT([aSalesInvoice()]);
      expect(txt).toContain('|');
      expect(txt).not.toContain('\t');
    });

    it('RVIE acepta multiples filas y mantiene 50 cols cada una', () => {
      const txt = exportSalesTXT([aSalesInvoice(), aSalesInvoice({ id: 2 }), aSalesInvoice({ id: 3 })]);
      const rows = txt.split('\n');
      expect(rows).toHaveLength(3);
      rows.forEach((row, i) => {
        expect(row.split('|'), `fila ${i + 1}`).toHaveLength(50);
      });
    });

    it('RCE acepta multiples filas y mantiene 80 cols cada una', () => {
      const txt = exportPurchasesTXT([aPurchaseInvoice(), aPurchaseInvoice({ id: 2 })]);
      const rows = txt.split('\n');
      expect(rows).toHaveLength(2);
      rows.forEach((row, i) => {
        expect(row.split('|'), `fila ${i + 1}`).toHaveLength(80);
      });
    });
  });
});
