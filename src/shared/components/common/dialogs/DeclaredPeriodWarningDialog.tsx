import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { PeriodUtils } from '@/core/domain/entities/period.entity';

/**
 * Declared Period Warning Dialog Props
 */
interface DeclaredPeriodWarningDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms the operation */
  onConfirm: () => void;
  /** Period code being modified (YYYYMM format) */
  periodCode: string;
  /** Type of operation being performed */
  operationType: 'import' | 'edit' | 'delete';
}

/**
 * Declared Period Warning Dialog Component
 *
 * Shows a warning dialog when user attempts to modify data in a period
 * that has been marked as declared to SUNAT.
 *
 * Informs the user that:
 * - The period has been declared to SUNAT
 * - Continuing will automatically mark the period as undeclared
 * - They should verify the impact before proceeding
 */
export function DeclaredPeriodWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  periodCode,
  operationType
}: DeclaredPeriodWarningDialogProps) {
  const getOperationLabel = () => {
    switch (operationType) {
      case 'import':
        return 'importar datos';
      case 'edit':
        return 'editar un registro';
      case 'delete':
        return 'eliminar un registro';
      default:
        return 'modificar datos';
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <AlertDialogTitle>Periodo Declarado a SUNAT</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              El periodo <span className="font-semibold">{PeriodUtils.formatPeriodLabel(periodCode)}</span>{' '}
              ha sido marcado como declarado a SUNAT.
            </p>
            <p>
              Estás intentando <span className="font-semibold">{getOperationLabel()}</span> en este periodo.
            </p>
            <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Importante:</span> Si continúas, el periodo se marcará
                automáticamente como <span className="font-semibold">no declarado</span>, ya que los datos
                declarados habrán cambiado.
              </p>
            </div>
            <p className="text-sm">
              Verifica que esta modificación no afecte tus declaraciones ante SUNAT antes de continuar.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-yellow-600 hover:bg-yellow-700">
            Continuar de todas formas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
