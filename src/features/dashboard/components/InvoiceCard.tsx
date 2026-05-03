import React from 'react';
import { ShoppingCart, Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Invoice Card Props
 */
interface InvoiceCardProps {
  type: InvoiceType;
  title: string;
  description: string;
  recordCount: number;
  declared?: boolean;
  onClick: () => void;
}

/**
 * Invoice Card Component
 * Navigation card for Sales or Purchases registry with record count
 */
export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  type,
  title,
  description,
  recordCount,
  declared = false,
  onClick
}) => {
  const isSales = type === 'sales';
  const Icon = isSales ? ShoppingCart : Package;
  const badgeColor = isSales ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-rose-500 hover:bg-rose-500';
  const iconBg = isSales ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20';
  const iconColor = isSales ? 'text-emerald-600' : 'text-rose-600';

  return (
    <Card className="cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xl" onClick={onClick}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <Badge className={`${badgeColor} text-white`}>{isSales ? 'VENTAS' : 'COMPRAS'}</Badge>
            {declared && (
              <div className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1" title="Declarado a SUNAT">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Declarado</span>
              </div>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-1 text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">Total Registros</p>
          <p className="ml-auto text-3xl font-bold">{recordCount}</p>
          <p className="text-sm text-muted-foreground">registros</p>
        </div>
      </CardContent>
    </Card>
  );
};
