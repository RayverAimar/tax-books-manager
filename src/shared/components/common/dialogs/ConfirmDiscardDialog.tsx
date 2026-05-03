import { AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';

interface ConfirmDiscardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation Dialog for Discarding Selected Rows
 * Shows a warning that the operation is irreversible
 */
export function ConfirmDiscardDialog({
  isOpen,
  onOpenChange,
  selectedCount,
  onConfirm,
  onCancel
}: ConfirmDiscardDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Confirmar eliminación
          </DialogTitle>
          <DialogDescription className="pt-2">
            Estás a punto de eliminar {selectedCount} registro{selectedCount > 1 ? 's' : ''}.
            <br />
            <br />
            <span className="font-semibold text-destructive">Esta operación es irreversible.</span>
            <br />
            <br />
            ¿Estás seguro de que deseas continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
