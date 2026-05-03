import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/shared/lib/formatters/currency';

/**
 * Data structure for SUNAT period summary report
 */
export interface PeriodSummaryData {
  // Contributor info
  ruc: string;
  businessName: string;

  // Registry info
  registryType: 'RVIE' | 'RVCE'; // Electronic Sales or Purchases Registry
  period: string; // YYYY/MM format
  isDeclared: boolean; // Whether the period has been declared to SUNAT
  recordCount: number;
  transactionDate?: string; // Transaction date and time

  // Financial totals
  totals: {
    // Sales fields
    taxableBase?: number; // BI Gravada (for sales)
    vatTotal?: number; // IGV/IPM (for sales)
    totalAmount: number; // Total CP (for both)

    // Purchases fields
    taxableBasePurchases?: number; // BI Gravado DG (for purchases)
    vatPurchases?: number; // IGV/IPM DG (for purchases)
    nonTaxableAmount?: number; // Non-taxable acquisitions (for purchases)

    // IGV breakdown by rate (optional)
    vatBreakdown?: Array<{
      rate: number; // e.g., 18, 10, 0
      amount: number; // Total IGV for this rate
    }>;
  };
}

/**
 * Generates a PDF report matching SUNAT's official format
 * Replicates the design from SUNAT portal screenshots
 *
 * @param data - Period summary data
 * @param logoImageData - Optional base64 image data for logo
 * @returns Blob of the generated PDF
 *
 * @example
 * const pdfBlob = generateSunatPeriodReport({
 *   ruc: '20498053573',
 *   businessName: 'RESTAURANT CEBICHERIA MARY EIRL',
 *   registryType: 'RVIE',
 *   period: '2024/08',
 *   isDeclared: true,
 *   recordCount: 174,
 *   totals: { ... }
 * });
 */
export function generateSunatPeriodReport(data: PeriodSummaryData, logoImageData?: string): Blob {
  const doc = new jsPDF();

  // Determine report title based on registry type
  const reportTitle =
    data.registryType === 'RVIE'
      ? 'Reporte de Registro de Ventas e Ingresos'
      : 'Reporte de Registro de Compras Electrónico';

  // Set document metadata
  doc.setProperties({
    title: `${reportTitle} - ${data.period}`,
    subject: `${data.businessName} - Período ${data.period}`,
    author: 'Tax Books Manager',
    creator: 'Tax Books Manager'
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const leftMargin = 15; // Consistent margin like SUNAT
  const labelWidth = 60; // Width for labels to align values
  let currentY = 15;
  const lineHeight = 6;

  // === HEADER: Logo and Title ===
  if (logoImageData) {
    // Show logo image in upper left corner
    const logoSize = 12; // 12mm square logo
    doc.addImage(logoImageData, 'PNG', leftMargin, currentY - 3, logoSize, logoSize);
  } else {
    // Fallback to text logo if no image provided
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 153); // Blue color for logo text
    doc.text('TAX BOOKS', leftMargin, currentY);
    doc.text('MANAGER', leftMargin, currentY + 4);
  }

  doc.setTextColor(0, 0, 0); // Back to black
  doc.setFontSize(14);
  doc.text(reportTitle, pageWidth / 2, currentY + 2, { align: 'center' });
  currentY += 20; // Increased space after title

  // === SECTION: Transacción ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Transacción', leftMargin, currentY);
  currentY += lineHeight + 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  const transactionName =
    data.registryType === 'RVIE' ? 'Generación del RVIE' : 'Generación del Registro de Compras Electrónico(RCE)';
  doc.text(transactionName, leftMargin + labelWidth, currentY);
  currentY += lineHeight;

  // Transaction date (if provided) - Format: dd/mm/yyyy hh:mm:ss
  if (data.transactionDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha y hora:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.transactionDate, leftMargin + labelWidth, currentY);
    currentY += lineHeight;
  }

  currentY += 5; // Increased space between sections

  // === SECTION: Datos del Contribuyente ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Contribuyente', leftMargin, currentY);
  currentY += lineHeight + 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Número de RUC:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ruc, leftMargin + labelWidth, currentY);
  currentY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre o Razón Social:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.businessName, leftMargin + labelWidth, currentY);
  currentY += lineHeight + 5; // Increased space between sections

  // === SECTION: Datos del Registro ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Registro', leftMargin, currentY);
  currentY += lineHeight + 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Registro:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  const registryLabel = data.registryType === 'RVIE' ? 'RVIE' : 'Registro de Compras Electrónico';
  doc.text(registryLabel, leftMargin + labelWidth, currentY);
  currentY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Periodo:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.period, leftMargin + labelWidth, currentY);
  currentY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');

  // Draw text first, then circle indicator after the text
  const textX = leftMargin + labelWidth;
  const statusText = data.isDeclared ? 'Declarado' : 'No Declarado';

  // Draw the text
  doc.setTextColor(0, 0, 0);
  doc.text(statusText, textX, currentY);

  // Calculate position for circle after the text
  const textWidth = doc.getTextWidth(statusText);
  const circleX = textX + textWidth + 2; // 2mm space after text
  const circleY = currentY - 1; // Adjust Y to align with text baseline (center vertically)
  const circleRadius = 1.5;

  // Draw circle after the text
  if (data.isDeclared) {
    // Green circle for "Declarado"
    doc.setFillColor(34, 197, 94); // green-600
    doc.circle(circleX, circleY, circleRadius, 'F');
  } else {
    // Red circle for "No Declarado"
    doc.setFillColor(239, 68, 68); // red-600
    doc.circle(circleX, circleY, circleRadius, 'F');
  }
  currentY += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Cantidad de registros:', leftMargin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.recordCount.toString(), leftMargin + labelWidth, currentY);
  currentY += lineHeight + 7; // Increased space before table section

  // === SECTION: Datos Totales (Table) ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos Totales', leftMargin, currentY);
  currentY += 6; // Increased space before table

  // Build table rows based on registry type
  let tableRows: string[][] = [];

  if (data.registryType === 'RVIE') {
    // Sales report - base row + IGV breakdown section + IGV subtotal + total
    tableRows = [
      ['Monto Total de la base imponible de la operación gravada.', formatCurrency(data.totals.taxableBase || 0)]
    ];

    // Add IGV breakdown if available
    if (data.totals.vatBreakdown && data.totals.vatBreakdown.length > 0) {
      // Header for IGV breakdown section
      tableRows.push(['IGV y/o IPM:', '']);

      // Individual IGV rates (indented)
      let totalVatSum = 0;
      data.totals.vatBreakdown.forEach((breakdown) => {
        const rateLabel = breakdown.rate > 0 ? `${breakdown.rate}%` : '0%';
        tableRows.push([`   • IGV/IPM (${rateLabel})`, formatCurrency(breakdown.amount)]);
        totalVatSum += breakdown.amount;
      });

      // Subtotal of all IGV
      tableRows.push(['Monto Total del IGV y/o IPM.', formatCurrency(totalVatSum)]);
    } else {
      // Fallback: single IGV row if no breakdown provided
      tableRows.push(['Monto Total del IGV y/o IPM.', formatCurrency(data.totals.vatTotal || 0)]);
    }

    // Add total row
    tableRows.push(['Monto Total del Comprobante de Pago.', formatCurrency(data.totals.totalAmount)]);
  } else {
    // Purchases report - base row + IGV breakdown section + IGV subtotal + non-taxable + total
    tableRows = [
      [
        'Monto Total de la Base imponible de las adquisiciones gravadas que dan derecho a ' +
          'crédito fiscal y/o saldo a favor por exportación, destinadas exclusivamente a ' +
          'operaciones gravadas y/o de exportación.',
        formatCurrency(data.totals.taxableBasePurchases || 0)
      ]
    ];

    // Add IGV breakdown if available
    if (data.totals.vatBreakdown && data.totals.vatBreakdown.length > 0) {
      // Header for IGV breakdown section
      tableRows.push(['IGV y/o IPM destinado a operac. Gravadas y/o Exp.:', '']);

      // Individual IGV rates (indented)
      let totalVatSum = 0;
      data.totals.vatBreakdown.forEach((breakdown) => {
        const rateLabel = breakdown.rate > 0 ? `${breakdown.rate}%` : '0%';
        tableRows.push([`   • IGV/IPM (${rateLabel})`, formatCurrency(breakdown.amount)]);
        totalVatSum += breakdown.amount;
      });

      // Subtotal of all IGV
      tableRows.push([
        'Monto Total del IGV y/o IPM destinado a operac. Gravadas y/o Exp.',
        formatCurrency(totalVatSum)
      ]);
    } else {
      // Fallback: single IGV row if no breakdown provided
      tableRows.push([
        'Monto Total del IGV y/o IPM destinado a operac. Gravadas y/o Exp.',
        formatCurrency(data.totals.vatPurchases || 0)
      ]);
    }

    // Add remaining rows
    tableRows.push(
      ['Monto Total de adquisiciones no gravadas.', formatCurrency(data.totals.nonTaxableAmount || 0)],
      [
        'Importe Total de las adquisiciones registradas según comprobante de pago.',
        formatCurrency(data.totals.totalAmount)
      ]
    );
  }

  // Generate table with autoTable
  autoTable(doc, {
    startY: currentY,
    head: [['Descripción', 'Totales S/']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 220, 220], // Light gray background
      textColor: [0, 0, 0], // Black text
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: {
        cellWidth: 130,
        halign: 'left'
      },
      1: {
        cellWidth: 50,
        halign: 'right'
      }
    },
    // Custom styling for specific rows
    didParseCell: function (data) {
      const rowCells = data.row.cells;

      // Get the text from the first column (description) to identify the row
      const descriptionText = rowCells[0]?.text[0] || '';

      // Main field 1: Base imponible (ALWAYS styled - sales & purchases)
      if (
        descriptionText &&
        (descriptionText.includes('base imponible de la operación gravada') ||
          descriptionText.includes('Base imponible de las adquisiciones gravadas'))
      ) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240]; // Light gray
      }

      // Main field 2: IGV subtotal (ALWAYS styled - sales & purchases)
      // Important: Only "Monto Total del IGV", NOT "IGV y/o IPM:" header
      if (descriptionText && descriptionText.includes('Monto Total del IGV')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240]; // Light gray
      }

      // Main field 3 (purchases only): Non-taxable amount
      if (descriptionText && descriptionText.includes('adquisiciones no gravadas')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240]; // Light gray
      }

      // Main field 3/4: Final total (ALWAYS styled - sales & purchases)
      if (
        descriptionText &&
        (descriptionText.includes('Monto Total del Comprobante') ||
          descriptionText.includes('Importe Total de las adquisiciones'))
      ) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240]; // Light gray
        data.cell.styles.fontSize = 10;
      }
    },
    margin: { left: leftMargin, right: leftMargin },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1
  });

  // === FOOTER: Disclaimer ===
  const footerY = pageHeight - 20;

  // Red disclaimer text
  doc.setFontSize(7);
  doc.setTextColor(255, 0, 0); // Red color
  doc.setFont('helvetica', 'bold');

  const disclaimerLines = [
    'AVISO LEGAL: Este reporte ha sido generado con el programa "Registro de Libros Electrónicos".',
    'Este documento NO constituye una declaración oficial ante SUNAT ni tiene valor legal.',
    'Para presentar sus declaraciones oficiales, debe utilizar el Sistema de Libros Electrónicos de SUNAT.'
  ];

  let disclaimerY = footerY;
  disclaimerLines.forEach((line) => {
    doc.text(line, pageWidth / 2, disclaimerY, { align: 'center' });
    disclaimerY += 3.5;
  });

  // Generation timestamp - same format as transaction date
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  // Use the same date from transactionDate if available
  const footerDate = data.transactionDate || new Date().toLocaleString('es-PE');
  doc.text(`Generado: ${footerDate}`, pageWidth / 2, disclaimerY + 2, { align: 'center' });

  // Return as Blob
  return doc.output('blob');
}

/**
 * Saves the PDF report to disk using Tauri file dialog
 *
 * @param data - Period summary data
 * @param fileName - Optional custom filename (without extension)
 * @returns Promise that resolves to the saved file path, or null if cancelled
 * @throws Error if save operation fails
 */
export async function downloadSunatPeriodReport(data: PeriodSummaryData, fileName?: string): Promise<string | null> {
  // Generate filename if not provided
  // Format: reporte_RVIE_<ruc>_YYYYMM_timestamp
  // Example: reporte_RVIE_20498053573_202408_20250119_143025
  const timestamp = new Date();
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getSeconds()).padStart(2, '0');
  const timestampStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  // Convert period from YYYY/MM to YYYYMM
  const periodYYYYMM = data.period.replace('/', '');

  const defaultFileName = `reporte_${data.registryType}_${data.ruc}_${periodYYYYMM}_${timestampStr}`;
  const finalFileName = fileName || defaultFileName;

  // Import Tauri APIs dynamically
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  // Show save dialog
  const filePath = await save({
    defaultPath: `${finalFileName}.pdf`,
    filters: [
      {
        name: 'PDF',
        extensions: ['pdf']
      }
    ],
    title: 'Guardar Reporte PDF'
  });

  // User cancelled the dialog
  if (!filePath) {
    return null;
  }

  // Load logo image
  let logoImageData: string | undefined;
  try {
    // Load the app icon from public folder
    const response = await fetch('/app-icon.png');
    const imageBlob = await response.blob();
    const reader = new FileReader();

    logoImageData = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch {
    logoImageData = undefined;
  }

  // Generate PDF
  const pdfBlob = generateSunatPeriodReport(data, logoImageData);

  // Convert Blob to Uint8Array for Tauri
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Write file using Tauri
  await writeFile(filePath, uint8Array);

  return filePath;
}
