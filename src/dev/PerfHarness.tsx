/**
 * Harness de perf solo para DEV. Renderiza <DataTable> con N facturas sintéticas
 * sin tocar Tauri APIs ni DB. Activado por query string:
 *
 *   ?perf=500                     baseline (todo activado)
 *   ?perf=500&nosticky=1          inyecta CSS que desactiva sticky en select column
 *   ?perf=500&notransition=1      desactiva transition-colors en filas
 *   ?perf=500&trivialcells=1      reemplaza todos los cell renderers por () => null
 *   ?perf=500&fewcols=10          renderiza solo las primeras 10 columnas
 *
 * Cada flag aisla un costo conocido para A/B en Playwright.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/data-table/DataTable';
import { useSalesColumns } from '@/features/sales/components/SalesColumns';
import type { SalesInvoice } from '@/features/sales/types/sales.types';

function makeMockInvoice(i: number): SalesInvoice {
  return {
    id: i + 1,
    ruc: '20131312955',
    businessName: 'EMPRESA EJEMPLO SAC',
    period: '202401',
    sunatCorrelative: `M${String(i + 1).padStart(4, '0')}`,
    issueDate: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    dueDate: null,
    voucherType: '01',
    voucherSeries: 'F001',
    voucherNumber: String(i + 1).padStart(8, '0'),
    voucherEndNumber: null,
    customerDocType: '6',
    customerDocNumber: '20100070970',
    customerName: `CLIENTE ${i + 1}`,
    exportValue: null,
    taxableBase: 100 + (i % 50),
    taxableBaseDiscount: null,
    vatAmount: 18 + (i % 9),
    vatDiscount: null,
    exemptAmount: null,
    unaffectedAmount: null,
    selectiveConsumptionTax: null,
    riceVatBase: null,
    riceVat: null,
    plasticBagTax: null,
    otherTaxes: null,
    totalAmount: 118 + (i % 59),
    currency: 'PEN',
    exchangeRate: null,
    modifiedVoucherDate: null,
    modifiedVoucherType: null,
    modifiedVoucherSeries: null,
    modifiedVoucherNumber: null,
    attributionProjectId: null,
    noteType: null,
    voucherStatus: '1',
    fobShippedValue: null,
    freeOperationsValue: null,
    operationType: null,
    damCp: null,
    freeUseField: null,
    vatPercentage: 18,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z')
  } as SalesInvoice;
}

interface Flags {
  noSticky: boolean;
  noTransition: boolean;
  trivialCells: boolean;
  fewCols: number; // 0 = todas
  overscan: number | undefined;
}

function useFlags(): Flags {
  return useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const overscanParam = p.get('overscan');
    return {
      noSticky: p.get('nosticky') === '1',
      noTransition: p.get('notransition') === '1',
      trivialCells: p.get('trivialcells') === '1',
      fewCols: Number(p.get('fewcols') ?? '0') || 0,
      overscan: overscanParam !== null ? Number(overscanParam) : undefined
    };
  }, []);
}

export function PerfHarness({ rowCount }: { rowCount: number }) {
  const flags = useFlags();
  const baseColumns = useSalesColumns();
  const [data] = useState<SalesInvoice[]>(() => Array.from({ length: rowCount }, (_, i) => makeMockInvoice(i)));

  // Transformar columnas según flags.
  const columns = useMemo(() => {
    let cols = baseColumns as ColumnDef<SalesInvoice>[];
    if (flags.fewCols > 0) cols = cols.slice(0, flags.fewCols);
    if (flags.trivialCells) {
      cols = cols.map((c) => ({ ...c, cell: () => null }));
    }
    return cols;
  }, [baseColumns, flags.fewCols, flags.trivialCells]);

  // CSS overrides — inyectados como <style> en el head. Más fáciles de revertir
  // que tocar la fuente, y aplican exactamente el override que queremos medir.
  useEffect(() => {
    const overrides: string[] = [];
    if (flags.noSticky) {
      overrides.push('thead th, tbody td, tfoot td { position: static !important; }');
    }
    if (flags.noTransition) {
      overrides.push('tbody tr { transition: none !important; }');
    }
    if (overrides.length === 0) return;
    const style = document.createElement('style');
    style.id = 'perf-harness-overrides';
    style.textContent = overrides.join('\n');
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [flags.noSticky, flags.noTransition]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__perfHarness = {
      rowCount: data.length,
      flags
    };
  }, [data.length, flags]);

  const flagSummary = [
    flags.noSticky && 'noSticky',
    flags.noTransition && 'noTransition',
    flags.trivialCells && 'trivialCells',
    flags.fewCols > 0 && `fewCols=${flags.fewCols}`
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex h-screen flex-col p-4">
      <h1 className="mb-2 text-sm font-semibold">
        Perf Harness — {data.length} filas × {columns.length} cols
        {flagSummary && <span className="text-orange-600"> [{flagSummary}]</span>}
      </h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Consola: <code>__perfDebug.enable(); __perfDebug.reset()</code> → interactuar → <code>__perfDebug.flush()</code>
      </p>
      {/* min-h-0 es necesario para que flex-1 + overflow-y-auto del DataTable
          interior realmente limiten altura. Sin esto el contenedor crece al tamaño
          del contenido y `overflow-y-auto` nunca se activa → virtualizer mide
          el full height y rendea todas las filas. */}
      <div className="min-h-0 flex-1">
        <DataTable columns={columns} data={data} enableSelection overscanOverride={flags.overscan} />
      </div>
    </div>
  );
}
