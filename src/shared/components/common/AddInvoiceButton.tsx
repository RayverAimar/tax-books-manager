import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';

interface AddInvoiceButtonProps<FormData> {
  label: string;
  dialogTitle: string;
  dialogDescription: string;
  FormComponent: React.ComponentType<{
    onSubmit: (data: FormData) => void;
  }>;
  onSubmit: (data: FormData) => void;
  disabled?: boolean;
}

/**
 * Botón "Agregar" con dialog integrado
 * Maneja su propio estado de open/close
 * El FormComponent solo se monta cuando el dialog está abierto
 */
export const AddInvoiceButton = React.memo(function AddInvoiceButton<FormData>({
  label,
  dialogTitle,
  dialogDescription,
  FormComponent,
  onSubmit,
  disabled = false
}: AddInvoiceButtonProps<FormData>) {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    setIsOpen(false); // Cerrar después de submit exitoso
    setShowForm(false);
  };

  const handleClick = () => {
    setIsOpen(true);
  };

  React.useEffect(() => {
    if (isOpen) {
      // Delay form render slightly to separate Dialog paint from Form paint
      requestAnimationFrame(() => {
        setShowForm(true);
      });
    } else {
      setShowForm(false);
    }
  }, [isOpen]);

  return (
    <>
      <Button onClick={handleClick} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>

      {/* Lazy mount: Dialog solo se monta cuando está abierto */}
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[600px]">
            <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4 shadow-sm">
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto px-6 py-6">
              {showForm ? (
                <FormComponent onSubmit={handleSubmit} />
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <div className="text-sm text-muted-foreground">Cargando formulario...</div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}) as <FormData>(props: AddInvoiceButtonProps<FormData>) => React.ReactElement;
