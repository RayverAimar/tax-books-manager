/**
 * Tests del orquestador de validación a nivel de fila (RVIE / RCE).
 * Verifica integración de los validadores individuales contra comprobantes completos.
 */
import { describe, it, expect } from 'vitest';
import { validateRvieRow, validateRceRow, validateForPvsire } from '../pvsire-row-validator';
import { aSalesInvoice, aPurchaseInvoice } from '@/test/helpers/factories';

describe('validateRvieRow', () => {
  it('factura válida → ok=true', () => {
    const inv = aSalesInvoice({
      ruc: '20131312955',
      businessName: 'EMPRESA SAC',
      period: '202501',
      issueDate: '2025-01-15',
      voucherType: '01',
      voucherSeries: 'F001',
      voucherNumber: '00000001',
      customerDocType: '6',
      customerDocNumber: '20100070970',
      customerName: 'CLIENTE SAC',
      taxableBase: 100,
      vatAmount: 18,
      totalAmount: 118,
      currency: 'PEN',
      exchangeRate: null
    });
    const r = validateRvieRow(inv, '202501');
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('RUC inválido → reporta error con posición', () => {
    const inv = aSalesInvoice({ ruc: '123' });
    const r = validateRvieRow(inv, '202501');
    expect(r.ok).toBe(false);
    const e = r.errors.find((x) => x.field === 'ruc');
    expect(e).toBeDefined();
    expect(e!.position).toBe(1);
  });

  it('Período no coincide → reporta error', () => {
    const inv = aSalesInvoice({ period: '202502' });
    const r = validateRvieRow(inv, '202501');
    expect(r.errors.some((e) => e.field === 'period')).toBe(true);
  });

  it('Tipo CP inválido → reporta error en pos 7', () => {
    const inv = aSalesInvoice({ voucherType: '99' });
    const r = validateRvieRow(inv, '202501');
    const e = r.errors.find((x) => x.field === 'voucherType');
    expect(e).toBeDefined();
    expect(e!.position).toBe(7);
  });
});

describe('validateRceRow', () => {
  it('compra válida → ok=true', () => {
    const inv = aPurchaseInvoice({
      ruc: '20131312955',
      businessName: 'EMPRESA SAC',
      period: '202501',
      sunatCorrelative: null, // CAR debe ir vacío en reemplazo
      issueDate: '2025-01-15',
      voucherType: '01',
      voucherSeries: 'F001',
      voucherNumberStart: '00000001',
      supplierDocType: '6',
      supplierDocNumber: '20100070970',
      supplierName: 'PROVEEDOR SAC',
      taxableBaseTaxed: 100,
      vatAmountTaxed: 18,
      totalAmount: 118,
      currency: 'PEN',
      exchangeRate: null,
      detraction: null,
      noteType: null,
      voucherStatus: null,
      inconsistencyIndicator: null,
      carExportImportIndicator: null
    });
    const r = validateRceRow(inv, '202501');
    expect(r.ok).toBe(true);
  });

  it('CAR con valor → 410 (debe ir vacío)', () => {
    const inv = aPurchaseInvoice({
      sunatCorrelative: 'M0001',
      detraction: null,
      noteType: null,
      voucherStatus: null,
      inconsistencyIndicator: null,
      carExportImportIndicator: null
    });
    const r = validateRceRow(inv, '202501');
    expect(r.errors.some((e) => e.field === 'sunatCorrelative' && e.code === 410)).toBe(true);
  });

  it('Pos 38-41 con valor → 404 (debe ir vacío)', () => {
    const inv = aPurchaseInvoice({
      sunatCorrelative: null,
      carExportImportIndicator: null,
      detraction: '1',
      noteType: '07',
      voucherStatus: '1',
      inconsistencyIndicator: '0'
    });
    const r = validateRceRow(inv, '202501');
    expect(r.errors.filter((e) => e.code === 404).length).toBeGreaterThanOrEqual(4);
  });

  it('Tipo CP 91 prohibido en RCE → 418', () => {
    const inv = aPurchaseInvoice({
      sunatCorrelative: null,
      voucherType: '91',
      detraction: null,
      noteType: null,
      voucherStatus: null,
      inconsistencyIndicator: null,
      carExportImportIndicator: null
    });
    const r = validateRceRow(inv, '202501');
    expect(r.errors.some((e) => e.field === 'voucherType' && e.code === 418)).toBe(true);
  });

  it('Mensaje incluye descripción legible', () => {
    const inv = aPurchaseInvoice({ ruc: '123' });
    const r = validateRceRow(inv, '202501');
    const e = r.errors.find((x) => x.field === 'ruc');
    expect(e!.message).toMatch(/Longitud/i);
  });
});

describe('validateForPvsire (batch)', () => {
  it('todas las filas válidas → ok=true', () => {
    const invoices = [aSalesInvoice(), aSalesInvoice({ id: 2, voucherNumber: '00000002' })];
    const r = validateForPvsire(invoices, 'sales', '202401'); // default factory period
    expect(r.ok).toBe(true);
    expect(r.totalErrors).toBe(0);
    expect(r.rowResults).toHaveLength(2);
  });

  it('una fila inválida → ok=false con conteo', () => {
    const invoices = [aSalesInvoice(), aSalesInvoice({ id: 2, ruc: 'BAD' })];
    const r = validateForPvsire(invoices, 'sales', '202401');
    expect(r.ok).toBe(false);
    expect(r.totalErrors).toBeGreaterThan(0);
  });

  it('procesa RCE igual que RVIE', () => {
    const invoices = [
      aPurchaseInvoice({
        sunatCorrelative: null,
        carExportImportIndicator: null,
        detraction: null,
        noteType: null,
        voucherStatus: null,
        inconsistencyIndicator: null
      })
    ];
    const r = validateForPvsire(invoices, 'purchases', '202401');
    expect(r.rowResults).toHaveLength(1);
  });
});
