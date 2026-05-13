import React, { memo } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { downloadSunatPeriodReport, type PeriodSummaryData } from '@/shared/lib/export/pdf-export';
import { showSuccess, showInfo, showError, createShowInFolderAction } from '@/shared/lib/utils/toast';
import { calculateSalesVatBreakdown, calculatePurchasesVatBreakdown } from '@/shared/lib/utils/invoice-calculations';
import { nextPaint } from '@/shared/lib/utils/next-paint';
import type { SalesInvoice } from '@/features/sales/types/sales.types';
import type { PurchaseInvoice } from '@/features/purchases/types/purchases.types';

interface ExportPDFButtonProps {
  onCalculateData: () => PeriodSummaryData | undefined; // ✅ NUEVO: Función de cálculo lazy
  invoices: SalesInvoice[] | PurchaseInvoice[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

/**
 * Button component for exporting period summary reports to PDF
 * Generates a SUNAT-formatted PDF report with lazy data calculation
 *
 * @example
 * <ExportPDFButton
 *   onCalculateData={calculatePDFReportData}
 *   invoices={invoices}
 * />
 */
export const ExportPDFButton = memo(function ExportPDFButton({
  onCalculateData,
  invoices,
  variant = 'outline',
  size = 'default',
  className,
  disabled = false
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    // Let the "Descargando..." button repaint before the (synchronous) jsPDF work begins.
    await nextPaint();

    try {
      // ✅ Calcular data solo cuando se hace click
      const data = onCalculateData();

      if (!data) {
        showError('Error', {
          description: 'No hay datos para exportar'
        });
        return;
      }

      // Calculate IGV breakdown from invoices
      const vatBreakdown =
        data.registryType === 'RVIE'
          ? calculateSalesVatBreakdown(invoices as SalesInvoice[])
          : calculatePurchasesVatBreakdown(invoices as PurchaseInvoice[]);

      // Add IGV breakdown to data
      const dataWithBreakdown: PeriodSummaryData = {
        ...data,
        totals: {
          ...data.totals,
          vatBreakdown: vatBreakdown
        }
      };

      const filePath = await downloadSunatPeriodReport(dataWithBreakdown);

      if (filePath) {
        // Determine registry type from data
        const registryType = data.registryType === 'RVIE' ? 'ventas' : 'compras';

        showSuccess('Descarga completa', {
          description: `El reporte de ${registryType} ha sido descargado exitosamente`,
          action: createShowInFolderAction(filePath)
        });
      } else {
        // User cancelled the dialog
        showInfo('Exportación cancelada');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError('Error al generar el archivo', {
        description: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExportPDF}
      disabled={disabled || isExporting}
      className={className}
    >
      <FileDown className="mr-2 h-4 w-4" />
      {isExporting ? 'Descargando...' : 'Descargar Reporte'}
    </Button>
  );
});
