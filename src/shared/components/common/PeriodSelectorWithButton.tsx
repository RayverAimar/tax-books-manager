import React, { useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface PeriodSelectorWithButtonProps {
  value: string | null;
  onChange: (period: string) => void;
  disabled?: boolean;
}

const MONTHS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

const MIN_PERIOD = 202408; // Agosto 2024

/**
 * Period Selector with separate Year/Month fields and confirmation button
 * Validates that period >= 202408
 */
export const PeriodSelectorWithButton: React.FC<PeriodSelectorWithButtonProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  // Generate years from 2024 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => (2024 + i).toString());

  // Initialize state from value prop (one-time initialization)
  const [selectedYear, setSelectedYear] = useState<string>(() =>
    value && value.length === 6 ? value.substring(0, 4) : ''
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    value && value.length === 6 ? value.substring(4, 6) : ''
  );

  // Validation
  const isValid = selectedYear && selectedMonth;
  const periodCode = isValid ? parseInt(`${selectedYear}${selectedMonth}`) : 0;
  const meetsMinimum = periodCode >= MIN_PERIOD;
  const canSubmit = isValid && meetsMinimum;

  // Check if current selection matches saved value
  const hasChanges = value !== `${selectedYear}${selectedMonth}`;

  const handleApply = () => {
    if (canSubmit && hasChanges) {
      onChange(`${selectedYear}${selectedMonth}`);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Selector Row */}
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Periodo:</span>

        {/* Year Selector */}
        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={disabled}>
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year} className="cursor-pointer">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Selector */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={disabled}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value} className="cursor-pointer">
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Apply Button */}
        <Button
          size="sm"
          disabled={!canSubmit || !hasChanges || disabled}
          onClick={handleApply}
          className={cn(
            'transition-all',
            canSubmit && hasChanges ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground'
          )}
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>

      {/* Validation Message - Below selectors (always reserves space) */}
      <span className={cn('text-xs text-destructive min-h-[20px]', (!isValid || meetsMinimum) && 'invisible')}>
        El periodo debe ser desde agosto 2024
      </span>
    </div>
  );
};
