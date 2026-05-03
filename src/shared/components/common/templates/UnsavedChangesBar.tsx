import { AlertCircle, Save, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface UnsavedChangesBarProps {
  changeCount: number;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesBar({
  changeCount,
  onSave,
  onDiscard,
  isSaving = false
}: UnsavedChangesBarProps) {
  return (
    <>
      <div className="flex items-center gap-2 mr-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-600 font-medium">
          {changeCount} cambios sin guardar
        </span>
      </div>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
      >
        <Save className="h-4 w-4 mr-1" />
        Guardar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onDiscard}
        disabled={isSaving}
      >
        <X className="h-4 w-4 mr-1" />
        Descartar
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
    </>
  );
}
