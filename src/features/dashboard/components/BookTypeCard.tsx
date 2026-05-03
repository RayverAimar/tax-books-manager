import React from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { PeriodUtils } from '@/core/domain/entities/period.entity';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Book Type Card Props
 */
interface BookTypeCardProps {
  type: InvoiceType;
  title: string;
  description: string;
  icon: React.ReactNode;
  stats?: {
    periods: number;
    currentPeriod: string;
  };
  onClick: () => void;
}

/**
 * Book Type Card Component
 * Navigation card for sales/purchases
 */
export const BookTypeCard: React.FC<BookTypeCardProps> = ({ type, title, description, icon, stats, onClick }) => {
  const bgColor = type === 'sales' ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-green-50 dark:bg-green-950/20';
  const iconColor = type === 'sales' ? 'text-blue-600' : 'text-green-600';

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-3 ${bgColor}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {stats.periods} {stats.periods === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{PeriodUtils.formatPeriodLabel(stats.currentPeriod)}</div>
          </div>
        )}
        <Button
          variant="ghost"
          className="mt-4 w-full justify-between"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <span>Ir a {type === 'sales' ? 'Ventas' : 'Compras'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
