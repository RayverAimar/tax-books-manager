import React from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Import Confirmation Dialog Props
 */
interface ImportConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'replace' | 'append' | 'cancel') => void | Promise<void>;
  existingCount: number;
  newCount: number;
  type: InvoiceType;
}

/**
 * Import Confirmation Dialog Component
 * Asks user whether to replace or append imported data
 */
export const ImportConfirmationDialog: React.FC<ImportConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingCount,
  newCount,
  type
}) => {
  const typeName = type === 'sales' ? 'ventas' : 'compras';

  const handleAction = (action: 'replace' | 'append' | 'cancel') => {
    const result = onConfirm(action);
    if (result instanceof Promise) {
      result.then(() => {
        if (action !== 'cancel') {
          onClose();
        }
      });
    } else {
      if (action !== 'cancel') {
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleAction('cancel')}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Confirmar Importación
          </DialogTitle>
          <DialogDescription>
            Se han encontrado {existingCount} registro{existingCount !== 1 ? 's' : ''} existente
            {existingCount !== 1 ? 's' : ''} en el periodo actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Registros existentes:</span>
              <span className="font-semibold">{existingCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nuevos registros a importar:</span>
              <span className="font-semibold">{newCount.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>Total después de reemplazar:</span>
              <span>{newCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total después de agregar:</span>
              <span>{(existingCount + newCount).toLocaleString()}</span>
            </div>
          </div>

          {/* Warning */}
          {existingCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Reemplazar</strong> eliminará todos los {existingCount} registro
                {existingCount !== 1 ? 's' : ''} existente{existingCount !== 1 ? 's' : ''} de {typeName} y los
                reemplazará con los {newCount} nuevo{newCount !== 1 ? 's' : ''} importado
                {newCount !== 1 ? 's' : ''}. Esta acción no se puede deshacer.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">¿Qué deseas hacer?</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => handleAction('cancel')} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => handleAction('append')} className="w-full sm:w-auto">
            Agregar {newCount} Registros
          </Button>
          <Button variant="destructive" onClick={() => handleAction('replace')} className="w-full sm:w-auto">
            Reemplazar Todo ({newCount} Registros)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
