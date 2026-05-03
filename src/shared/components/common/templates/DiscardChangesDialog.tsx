import { AlertCircle, Save, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

interface DiscardChangesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  changesSummary: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
  };
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function DiscardChangesDialog({
  isOpen,
  onOpenChange,
  changesSummary,
  onDiscard,
  onSave,
  onCancel
}: DiscardChangesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Cambios sin guardar
          </DialogTitle>
          <DialogDescription>
            Tienes {changesSummary.total} cambios sin guardar:
            {changesSummary.added > 0 && ` ${changesSummary.added} agregados,`}
            {changesSummary.modified > 0 && ` ${changesSummary.modified} modificados,`}
            {changesSummary.deleted > 0 && ` ${changesSummary.deleted} eliminados.`}
            <br />
            <br />
            ¿Qué deseas hacer?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="ghost" onClick={onCancel} className="sm:mr-auto">
            Cancelar
          </Button>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onDiscard}>
              <X className="h-4 w-4 mr-1" />
              Descartar
            </Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
