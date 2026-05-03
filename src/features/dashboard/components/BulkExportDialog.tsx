import React, { useState } from 'react';
import { Download, FileArchive, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  showError,
  showInfo,
  showWarning,
  createShowInFolderAction,
  showSuccess,
} from '@/shared/lib/utils/toast';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { createBulkExportZip, type BulkExportFormat, type PeriodExportData } from '@/shared/lib/export/bulk-zip-export';

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for bulk exporting historical data to ZIP files
 *
 * Structure:
 * - Creates a ZIP file with two folders: compras/ and ventas/
 * - Each folder contains files named YYYYMM.{format}
 * - Supports CSV, TXT, and Excel formats
 */
export const BulkExportDialog: React.FC<BulkExportDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { company } = useCompany();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('datos-historicos');
  const [format, setFormat] = useState<BulkExportFormat>('csv');

  const handleExport = async () => {
    if (!fileName.trim()) {
      showError('Nombre de archivo requerido', {
        description: 'Por favor ingresa un nombre para el archivo ZIP',
      });
      return;
    }

    if (!company) {
      showError('No hay empresa seleccionada');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Get all available periods for this company
      showInfo('Cargando períodos...');
      const periodRepo = RepositoryFactory.getPeriodRepository();

      const [salesPeriods, purchasesPeriods] = await Promise.all([
        periodRepo.getAvailablePeriods(company.id, 'sales'),
        periodRepo.getAvailablePeriods(company.id, 'purchases')
      ]);

      // Get unique period codes
      const allPeriodCodes = new Set([
        ...salesPeriods.map((p) => p.code),
        ...purchasesPeriods.map((p) => p.code)
      ]);

      if (allPeriodCodes.size === 0) {
        showWarning('No hay datos para exportar', {
          description: 'No se encontraron registros de ventas o compras',
        });
        setIsProcessing(false);
        return;
      }

      // Step 2: Load data for each period
      showInfo(`Cargando datos de ${allPeriodCodes.size} períodos...`);
      const salesRepo = RepositoryFactory.getSalesRepository();
      const purchasesRepo = RepositoryFactory.getPurchasesRepository();

      // Load records for each period
      const periodsData: PeriodExportData[] = [];
      for (const periodCode of Array.from(allPeriodCodes)) {
        const [salesRecords, purchaseRecords] = await Promise.all([
          salesRepo.getAll(company.id, periodCode),
          purchasesRepo.getAll(company.id, periodCode)
        ]);

        periodsData.push({
          period: periodCode,
          salesRecords,
          purchaseRecords
        });
      }

      // Step 3: Generate ZIP file
      showInfo('Generando archivo ZIP...');
      const zipResult = await createBulkExportZip(periodsData, format);

      if (!zipResult.success || !zipResult.zipBlob) {
        if (zipResult.errors.length > 0) {
          showError('Error al generar el archivo', {
            description: zipResult.errors[0],
          });
        }
        setIsProcessing(false);
        return;
      }

      // Step 4: Save ZIP file
      const zipFileName = `${fileName}.zip`;
      const filePath = await save({
        defaultPath: zipFileName,
        filters: [
          {
            name: 'ZIP',
            extensions: ['zip']
          }
        ]
      });

      if (!filePath) {
        setIsProcessing(false);
        return;
      }

      // Convert Blob to Uint8Array
      const arrayBuffer = await zipResult.zipBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(filePath, uint8Array);

      showSuccess('Exportación completada', {
        description:
          `${zipResult.periodsExported} períodos exportados ` +
          `(${zipResult.salesFilesCreated} ventas, ${zipResult.purchasesFilesCreated} compras)`,
        action: createShowInFolderAction(filePath),
        duration: 5000,
      });

      onOpenChange(false);
      setFileName('datos-historicos');
      setFormat('csv');
    } catch (error) {
      showError('Error al generar el archivo', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      setFileName('datos-historicos');
      setFormat('csv');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Exportar Datos Históricos
          </DialogTitle>
          <DialogDescription>
            Exporta todos tus registros de ventas y compras en un archivo ZIP estructurado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Info */}
          <div className="rounded-md border p-4 bg-muted/30 space-y-2">
            <p className="text-sm font-semibold">El archivo ZIP contendrá:</p>
            <ul className="ml-4 space-y-1 text-sm text-muted-foreground">
              <li>• Carpeta <strong>compras/</strong> con todos los registros de compras</li>
              <li>• Carpeta <strong>ventas/</strong> con todos los registros de ventas</li>
              <li>• Archivos separados por período (YYYYMM.{format})</li>
              <li>• Formato oficial SUNAT</li>
            </ul>
          </div>

          {/* File Name Input */}
          <div className="space-y-2">
            <Label htmlFor="filename">Nombre del archivo</Label>
            <div className="flex gap-2">
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="datos-historicos"
                disabled={isProcessing}
              />
              <span className="flex items-center text-sm text-muted-foreground">.zip</span>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Formato de archivos</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as BulkExportFormat)}
              disabled={isProcessing}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <span>CSV</span>
                    <span className="text-xs text-muted-foreground">
                      (Valores separados por comas)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="txt">
                  <div className="flex items-center gap-2">
                    <span>TXT</span>
                    <span className="text-xs text-muted-foreground">
                      (Archivo de texto plano)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <span>Excel</span>
                    <span className="text-xs text-muted-foreground">
                      (Libro de Excel .xlsx)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="rounded-md border p-3 bg-muted/20">
            <p className="text-xs font-mono text-muted-foreground">
              Archivo resultante: <strong>{fileName}.zip</strong>
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Formato de archivos internos: <strong>.{format}</strong>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={!fileName.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
