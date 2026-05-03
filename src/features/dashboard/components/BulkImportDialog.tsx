import React, { useState } from 'react';
import { Upload, FileArchive, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  showError,
  showInfo,
  showSuccess,
  showWarning,
} from '@/shared/lib/utils/toast';
import { useCompany } from '@/core/presentation/contexts/company.context';
import {
  processZipFile,
  checkPeriodCollisions,
  importValidatedFiles,
  type ZipFileInfo,
  type PeriodCollision,
  type ZipValidationResult
} from '@/shared/lib/import/bulk-zip-import';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for bulk importing historical data from ZIP files
 *
 * Rules:
 * 1. Only accepts .zip files
 * 2. Inside ZIP: two folders named 'compras' or 'ventas' (case-insensitive)
 * 3. Inside each folder: CSV or TXT files named YYYYMM.csv or YYYYMM.txt
 * 4. Periods must be >= 202408 and not in the future
 * 5. Files must have correct SUNAT format
 */
export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { company } = useCompany();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ZipValidationResult | null>(null);
  const [collisions, setCollisions] = useState<PeriodCollision[]>([]);
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [currentCollisionIndex, setCurrentCollisionIndex] = useState(0);
  const [collisionDecisions, setCollisionDecisions] = useState<Map<string, 'overwrite' | 'append'>>(new Map());

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showError('Formato de archivo inválido', {
        description: 'Solo se aceptan archivos ZIP (.zip)',
      });
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setCollisions([]);
    setCollisionDecisions(new Map());
  };

  const handleImport = async () => {
    if (!selectedFile || !company) {
      showError('No se ha seleccionado ningún archivo o empresa');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Validate ZIP structure and contents
      showInfo('Validando archivo ZIP...');
      const zipResult = await processZipFile(selectedFile);

      if (!zipResult.success || !zipResult.validatedFiles || zipResult.validatedFiles.length === 0) {
        // Show all validation errors
        if (zipResult.errors.length > 0) {
          zipResult.errors.forEach(err => {
            showError(err.error, {
              description: err.filePath ? `Archivo: ${err.filePath}` : undefined,
              duration: 5000,
            });
          });
        }
        setIsProcessing(false);
        return;
      }

      setValidationResult(zipResult);

      // Step 2: Check for period collisions
      showInfo('Verificando períodos existentes...');
      const periodCollisions = await checkPeriodCollisions(zipResult.validatedFiles, company.id);

      if (periodCollisions.length > 0) {
        setCollisions(periodCollisions);
        setCurrentCollisionIndex(0);
        setShowCollisionDialog(true);
        setIsProcessing(false);
        return;
      }

      // Step 3: No collisions, proceed with import
      await performImport(zipResult.validatedFiles);

    } catch (error) {
      showError('Error al procesar el archivo', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      setIsProcessing(false);
    }
  };

  const handleCollisionDecision = (decision: 'overwrite' | 'append') => {
    const collision = collisions[currentCollisionIndex];
    const key = `${collision.period}-${collision.type}`;

    const newDecisions = new Map(collisionDecisions);
    newDecisions.set(key, decision);
    setCollisionDecisions(newDecisions);

    // Move to next collision or proceed with import
    if (currentCollisionIndex < collisions.length - 1) {
      setCurrentCollisionIndex(currentCollisionIndex + 1);
    } else {
      setShowCollisionDialog(false);
      proceedWithImport();
    }
  };

  const proceedWithImport = async () => {
    if (!validationResult?.validatedFiles || !company) {
      return;
    }

    setIsProcessing(true);
    await performImport(validationResult.validatedFiles);
  };

  const performImport = async (files: ZipFileInfo[]) => {
    if (!company) {
      return;
    }

    try {
      showInfo('Importando datos...', {
        description: `Procesando ${files.length} archivos`,
      });

      const importResult = await importValidatedFiles(files, company.id, collisionDecisions);

      if (importResult.errors.length > 0) {

        // Show first 3 errors as toasts
        const errorsToShow = importResult.errors.slice(0, 3);
        errorsToShow.forEach(err => {
          showError(err.error, {
            description: err.filePath ? `Archivo: ${err.filePath}` : undefined,
            duration: 8000,
          });
        });

        // If more than 3 errors, show count
        if (importResult.errors.length > 3) {
          showWarning(`${importResult.errors.length - 3} errores adicionales`, {
            description: 'Los detalles están registrados en el sistema',
            duration: 8000
          });
        }
      }

      if (importResult.success) {
        showSuccess('Importación completada', {
          description:
            `${importResult.recordsImported} registros importados de ` +
            `${importResult.filesProcessed} archivos`,
        });
        onOpenChange(false);
        resetState();
      } else {
        showWarning('Importación parcial', {
          description:
            `${importResult.recordsImported} registros importados de ${importResult.filesProcessed} archivos.\n` +
            `${importResult.errors.length} archivo(s) con errores.`,
          duration: 10000
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setCollisions([]);
    setCollisionDecisions(new Map());
    setCurrentCollisionIndex(0);
  };

  const handleCancel = () => {
    if (!isProcessing) {
      resetState();
      onOpenChange(false);
    }
  };

  const currentCollision = collisions[currentCollisionIndex];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              Importar Datos Históricos
            </DialogTitle>
            <DialogDescription>
              Importa registros de ventas y compras desde un archivo ZIP estructurado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Requirements Section */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Requisitos del archivo ZIP:</p>
                  <ul className="ml-4 space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>
                        Debe contener <strong>dos carpetas</strong>:{' '}
                        <code className="px-1 py-0.5 bg-muted rounded">compras</code> y/o{' '}
                        <code className="px-1 py-0.5 bg-muted rounded">ventas</code>{' '}
                        (no distingue mayúsculas)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>
                        Dentro de cada carpeta: archivos CSV o TXT con formato{' '}
                        <code className="px-1 py-0.5 bg-muted rounded">YYYYMM.csv</code> o{' '}
                        <code className="px-1 py-0.5 bg-muted rounded">YYYYMM.txt</code>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>
                        Períodos válidos: desde <strong>Agosto 2024 (202408)</strong> hasta el mes actual
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>
                        Los archivos deben tener el formato oficial de SUNAT (40 columnas para ventas, 80 para compras)
                      </span>
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Example Structure */}
            <div className="rounded-md border p-4 bg-muted/30">
              <p className="text-sm font-semibold mb-2">Ejemplo de estructura:</p>
              <pre className="text-xs font-mono">
{`datos-historicos.zip
├── compras/
│   ├── 202408.csv
│   ├── 202409.txt
│   └── 202410.csv
└── ventas/
    ├── 202408.csv
    ├── 202409.txt
    └── 202410.csv`}
              </pre>
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar archivo ZIP</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('zip-file-input')?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? selectedFile.name : 'Seleccionar archivo...'}
                </Button>
                <input
                  id="zip-file-input"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
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
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collision Dialog */}
      {currentCollision && (
        <AlertDialog open={showCollisionDialog} onOpenChange={setShowCollisionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Período Existente Detectado
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    El período <strong>{currentCollision.period}</strong> de{' '}
                    <strong>{currentCollision.type === 'sales' ? 'ventas' : 'compras'}</strong> ya existe
                    en la base de datos con <strong>{currentCollision.existingRecordCount}</strong> registros.
                  </p>
                  <p className="text-sm">
                    ¿Qué deseas hacer? ({currentCollisionIndex + 1} de {collisions.length})
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCollisionDialog(false);
                  setIsProcessing(false);
                  resetState();
                }}
              >
                Cancelar Todo
              </Button>
              <Button
                onClick={() => handleCollisionDecision('append')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Agregar (Append)
              </Button>
              <Button
                onClick={() => handleCollisionDecision('overwrite')}
                className="bg-destructive hover:bg-destructive/90"
              >
                Sobrescribir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
