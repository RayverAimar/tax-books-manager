import { describe, it, expect } from 'vitest';
import {
  formatExportValue,
  exportToCSV,
  exportToTXT,
  createExporter,
  exportSalesCSV,
  exportSalesTXT,
  exportPurchasesCSV,
  exportPurchasesTXT,
  type FieldMapping
} from '../generic-export';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

describe('formatExportValue', () => {
  it('null/undefined/empty → cadena vacía', () => {
    expect(formatExportValue(null, 'csv')).toBe('');
    expect(formatExportValue(undefined, 'csv')).toBe('');
    expect(formatExportValue('', 'csv')).toBe('');
  });

  it('yyyy-mm-dd → dd/mm/yyyy', () => {
    expect(formatExportValue('2024-01-15', 'csv')).toBe('15/01/2024');
  });

  it('Date object → dd/mm/yyyy', () => {
    expect(formatExportValue(new Date(2024, 0, 15), 'csv')).toBe('15/01/2024');
  });

  it('número con 2 decimales', () => {
    expect(formatExportValue(1234.5, 'csv')).toBe('1234.50');
    expect(formatExportValue(0, 'csv')).toBe('0.00');
  });

  it('escapa comillas y comas en CSV', () => {
    expect(formatExportValue('hello, world', 'csv')).toBe('"hello, world"');
    expect(formatExportValue('say "hi"', 'csv')).toBe('"say ""hi"""');
  });

  it('TXT no escapa comas', () => {
    expect(formatExportValue('a, b', 'txt')).toBe('a, b');
  });
});

const mappings: FieldMapping[] = [
  { sunatHeader: 'RUC', tsField: 'ruc' },
  { sunatHeader: 'BASE', tsField: 'taxableBase' },
  { sunatHeader: 'TOTAL', tsField: 'totalAmount' }
];

describe('exportToCSV', () => {
  it('retorna cadena vacía si no hay datos', () => {
    expect(exportToCSV([], mappings)).toBe('');
  });

  it('genera header + filas', () => {
    const csv = exportToCSV([aSalesInvoice()], mappings);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('RUC,BASE,TOTAL');
    expect(lines[1]).toMatch(/20131312955,100\.00,118\.00/);
  });

  it('omite columnas con excludeFromExport', () => {
    const m: FieldMapping[] = [...mappings, { sunatHeader: 'X', tsField: 'ruc', excludeFromExport: true }];
    const csv = exportToCSV([aSalesInvoice()], m);
    expect(csv.split('\n')[0]).not.toContain('X');
  });

  it('usa defaultValue cuando el campo no existe en el objeto', () => {
    const m: FieldMapping[] = [{ sunatHeader: 'FOO', defaultValue: 'BAR' }];
    const csv = exportToCSV([{}], m);
    expect(csv.split('\n')[1]).toBe('BAR');
  });
});

describe('exportToTXT', () => {
  it('genera SOLO filas de datos (SIRE no espera cabecera en TXT)', () => {
    const txt = exportToTXT([aSalesInvoice()], mappings);
    const rows = txt.split('\n');
    expect(rows).toHaveLength(1); // sin cabecera
    expect(rows[0].split('|')).toHaveLength(3);
    expect(rows[0]).toMatch(/^\d{11}\|/); // empieza con RUC, no con header
  });

  it('respeta sireAutoFilled emitiendo vacío', () => {
    const m: FieldMapping[] = [
      { sunatHeader: 'RUC', tsField: 'ruc' },
      { sunatHeader: '', tsField: 'businessName', sireAutoFilled: true }
    ];
    const txt = exportToTXT([aSalesInvoice({ businessName: 'NO DEBE APARECER' })], m);
    expect(txt).toBe('20131312955|');
  });
});

describe('createExporter', () => {
  it('expone toCSV y toTXT', () => {
    const e = createExporter(mappings);
    const inv = aSalesInvoice();
    expect(e.toCSV([inv])).toContain('RUC');
    expect(e.toTXT([inv])).toContain('|');
  });
});

describe('exportSalesCSV / exportSalesTXT / exportPurchasesCSV / exportPurchasesTXT', () => {
  it('genera contenido para sales', () => {
    expect(exportSalesCSV([aSalesInvoice()])).toContain('20131312955');
    expect(exportSalesTXT([aSalesInvoice()])).toContain('|');
  });

  it('genera contenido para purchases', () => {
    expect(exportPurchasesCSV([aPurchaseInvoice()])).toContain('20131312955');
    expect(exportPurchasesTXT([aPurchaseInvoice()])).toContain('|');
  });

  it('vacío para arreglo vacío', () => {
    expect(exportSalesCSV([])).toBe('');
    expect(exportPurchasesCSV([])).toBe('');
  });
});
