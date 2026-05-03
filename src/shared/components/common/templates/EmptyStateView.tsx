import React from 'react';
import { Building, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/**
 * Empty State View Props
 */
interface EmptyStateViewProps {
  type: 'no-company' | 'no-period' | 'loading';
  onNavigateHome?: () => void;
}

/**
 * Empty State View Component
 * Displays different empty states based on context
 */
export const EmptyStateView: React.FC<EmptyStateViewProps> = ({ type, onNavigateHome }) => {
  if (type === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (type === 'no-company') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Building className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No hay empresa registrada</h2>
          <p className="text-sm text-muted-foreground">
            Por favor, registra una empresa para comenzar a gestionar tus registros contables
          </p>
          {onNavigateHome && (
            <Button onClick={onNavigateHome} className="mt-4">
              Volver al Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  // type === 'no-period'
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <Calendar className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Selecciona un periodo</h2>
        <p className="text-sm text-muted-foreground">
          Usa el selector de periodo en la parte superior para ver y gestionar tus registros
        </p>
      </div>
    </div>
  );
};
