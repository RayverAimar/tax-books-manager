import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

/**
 * Props minimalistas del Header
 */
interface InvoiceListHeaderProps {
  children: React.ReactNode;
}

/**
 * Componente Header base con composición
 * Solo se encarga del layout, no de la lógica
 */
export function InvoiceListHeader({ children }: InvoiceListHeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="flex h-16 w-full items-center justify-between px-6">{children}</div>
    </header>
  );
}

/**
 * Subcomponente: Botón de navegación hacia atrás
 */
interface HeaderBackProps {
  onBack: () => void;
}

InvoiceListHeader.Back = function HeaderBack({ onBack }: HeaderBackProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};

/**
 * Subcomponente: Título con periodo y contador de registros
 */
interface HeaderTitleProps {
  title: string;
  period?: string | null;
  recordCount?: number;
}

InvoiceListHeader.Title = function HeaderTitle({ title, period, recordCount }: HeaderTitleProps) {
  // Helper para formatear periodo
  const formatPeriod = (p: string) => p.replace(/^(\d{4})(\d{2})$/, '$1/$2');

  return (
    <div>
      <h1 className="text-lg font-semibold">
        {title}
        {period && <> | {formatPeriod(period)}</>}
      </h1>
      {period && recordCount !== undefined && (
        <p className="text-xs text-muted-foreground">{recordCount.toLocaleString()} registros</p>
      )}
    </div>
  );
};

/**
 * Subcomponente: Slot para acciones (botones)
 */
interface HeaderActionsProps {
  children: React.ReactNode;
}

InvoiceListHeader.Actions = function HeaderActions({ children }: HeaderActionsProps) {
  return <div className="flex items-center gap-2">{children}</div>;
};

/**
 * Subcomponente: Indicador de carga
 */
interface HeaderLoadingProps {
  isLoading: boolean;
}

InvoiceListHeader.Loading = function HeaderLoading({ isLoading }: HeaderLoadingProps) {
  if (!isLoading) return null;

  return (
    <Badge variant="outline" className="gap-2">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-xs">Cargando...</span>
    </Badge>
  );
};
