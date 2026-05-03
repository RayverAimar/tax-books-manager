import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { PeriodUtils, type AvailablePeriod } from '@/core/domain/entities/period.entity';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Period Selector Props
 */
interface PeriodSelectorProps {
  companyId: number;
  type: InvoiceType;
  value?: string;
  onChange?: (period: string) => void;
  readonly?: boolean;
}

/**
 * Period Selector Component
 * Dropdown to select accounting periods
 */
export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  companyId,
  type,
  value,
  onChange,
  readonly = false
}) => {
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(value || PeriodUtils.getLastValidPeriod());

  useEffect(() => {
    const loadAvailablePeriods = async () => {
      try {
        setIsLoading(true);
        const periodRepo = RepositoryFactory.getPeriodRepository();
        const periods = await periodRepo.getAvailablePeriods(companyId, type);

        // If no periods exist yet, use the generated list
        const allPeriods = periods.length > 0
          ? periods
          : PeriodUtils.getAvailablePeriods().map(p => ({
              ...p,
              hasData: false,
              recordCount: undefined,
              lastModified: undefined
            }));
        setAvailablePeriods(allPeriods);

        // Set current period if no value provided
        if (!value) {
          const currentPeriod = PeriodUtils.getLastValidPeriod();
          setSelectedPeriod(currentPeriod);
          if (onChange) {
            onChange(currentPeriod);
          }
        }
      } catch {
        // Fallback to generated periods
        const fallbackPeriods = PeriodUtils.getAvailablePeriods().map(p => ({
          ...p,
          hasData: false,
          recordCount: undefined,
          lastModified: undefined
        }));
        setAvailablePeriods(fallbackPeriods);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailablePeriods();
  }, [companyId, type, value, onChange]);

  useEffect(() => {
    if (value && value !== selectedPeriod) {
      setSelectedPeriod(value);
    }
  }, [value, selectedPeriod]);

  const handlePeriodChange = (newPeriod: string) => {
    if (readonly) return;
    setSelectedPeriod(newPeriod);
    if (onChange) {
      onChange(newPeriod);
    }
  };

  const getTypeColor = () => {
    return type === 'sales' ? 'text-blue-600' : 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Cargando periodos...</span>
      </div>
    );
  }

  const selectedPeriodData = availablePeriods.find(p => p.code === selectedPeriod);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className={`h-4 w-4 ${getTypeColor()}`} />
        <span>Periodo:</span>
      </div>

      <Select
        value={selectedPeriod}
        onValueChange={handlePeriodChange}
        disabled={readonly}
      >
        <SelectTrigger className="w-[220px]" disabled={readonly}>
          <SelectValue>
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">
                  {PeriodUtils.formatPeriodLabel(selectedPeriod)}
                </span>
                {selectedPeriodData?.declared && (
                  <div title="Declarado a SUNAT">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  </div>
                )}
              </div>
              {selectedPeriodData?.hasData && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedPeriodData.recordCount}
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availablePeriods.map((period) => (
            <SelectItem key={period.code} value={period.code}>
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{period.label}</span>
                  {period.declared && (
                    <div title="Declarado a SUNAT">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </div>
                  )}
                </div>
                {period.hasData && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {period.recordCount}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPeriodData?.hasData && selectedPeriodData.lastModified && (
        <div className="text-xs text-muted-foreground">
          Última actualización: {new Date(selectedPeriodData.lastModified).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  );
};