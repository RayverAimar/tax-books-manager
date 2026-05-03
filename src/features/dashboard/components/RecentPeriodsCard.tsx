import React, { useEffect, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import type { AvailablePeriod } from '@/core/domain/entities/period.entity';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Recent Periods Card Props
 */
interface RecentPeriodsCardProps {
  companyId: number;
  onPeriodClick: (type: InvoiceType, period: string) => void;
}

/**
 * Recent Periods Card Component
 * Shows recent periods with data
 */
export const RecentPeriodsCard: React.FC<RecentPeriodsCardProps> = ({ companyId, onPeriodClick }) => {
  const [recentPeriods, setRecentPeriods] = useState<{
    sales: AvailablePeriod[];
    purchases: AvailablePeriod[];
  }>({ sales: [], purchases: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentPeriods = async () => {
      try {
        setIsLoading(true);
        const periodRepo = RepositoryFactory.getPeriodRepository();

        const [salesPeriods, purchasesPeriods] = await Promise.all([
          periodRepo.getAvailablePeriods(companyId, 'sales'),
          periodRepo.getAvailablePeriods(companyId, 'purchases')
        ]);

        // Get only periods with data, sorted by most recent
        const recentSales = salesPeriods.filter((p) => p.hasData).slice(0, 3);

        const recentPurchases = purchasesPeriods.filter((p) => p.hasData).slice(0, 3);

        setRecentPeriods({
          sales: recentSales,
          purchases: recentPurchases
        });
      } catch {
        // Ignore errors loading recent periods
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentPeriods();
  }, [companyId]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Periodos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = recentPeriods.sales.length > 0 || recentPeriods.purchases.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Periodos Recientes</CardTitle>
        <CardDescription>Últimos periodos con información registrada</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAnyData ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No hay periodos con datos registrados</p>
            <p className="mt-1 text-xs text-muted-foreground">Comienza importando o agregando registros</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sales Periods */}
            {recentPeriods.sales.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Registro de Ventas</h4>
                <div className="space-y-2">
                  {recentPeriods.sales.map((period) => (
                    <div
                      key={period.code}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50
                        cursor-pointer transition-colors"
                      onClick={() => onPeriodClick('sales', period.code)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{period.label}</p>
                          <p className="text-xs text-muted-foreground">{period.recordCount} registros</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(period.lastModified)}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchases Periods */}
            {recentPeriods.purchases.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Registro de Compras</h4>
                <div className="space-y-2">
                  {recentPeriods.purchases.map((period) => (
                    <div
                      key={period.code}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50
                        cursor-pointer transition-colors"
                      onClick={() => onPeriodClick('purchases', period.code)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{period.label}</p>
                          <p className="text-xs text-muted-foreground">{period.recordCount} registros</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(period.lastModified)}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
