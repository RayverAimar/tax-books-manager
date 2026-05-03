import React, { useState, memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import { usePeriod } from '@/core/presentation/contexts/period.context';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { showSuccess, showError } from '@/shared/lib/utils/toast';
import type { InvoiceType } from '@/shared/types/invoice.types';

interface DeclaredToggleProps {
  type: InvoiceType;
  disabled?: boolean;
}

/**
 * Toggle para marcar/desmarcar periodo como declarado
 * Lee y actualiza el estado desde el PeriodContext
 */
export const DeclaredToggle = memo(function DeclaredToggle({ type, disabled = false }: DeclaredToggleProps) {
  const { company } = useCompany();
  const { period, toggleDeclared } = usePeriod();
  const [isToggling, setIsToggling] = useState(false);

  if (!period) return null;

  // Leer estado del contexto
  const isDeclared = type === 'sales' ? period.salesDeclared : period.purchasesDeclared;

  const handleToggle = async () => {
    if (!company) return;

    try {
      setIsToggling(true);
      await toggleDeclared(company.id, type);

      const newState = !isDeclared;
      const periodFormatted = period.code.replace(/^(\d{4})(\d{2})$/, '$1/$2');

      showSuccess(
        newState ? 'Periodo marcado como declarado' : 'Periodo desmarcado',
        {
          description: newState
            ? `El periodo ${periodFormatted} ha sido marcado como declarado a SUNAT`
            : `El periodo ${periodFormatted} ha sido desmarcado`
        }
      );
    } catch {
      showError('Error', {
        description: 'No se pudo actualizar el estado del periodo'
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center gap-2 border-l pl-4">
      <div className="flex items-center gap-2">
        {isDeclared && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        <span className="text-sm font-medium text-muted-foreground">Declarado</span>
      </div>
      <Switch
        checked={isDeclared}
        onCheckedChange={handleToggle}
        disabled={disabled || isToggling}
      />
    </div>
  );
});
