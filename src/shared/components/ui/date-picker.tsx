'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Input } from '@/shared/components/ui/input';

interface DatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'dd/mm/yyyy', disabled, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [hasError, setHasError] = React.useState(false);

  // Convert internal value (yyyy-MM-dd) to display value (dd/mm/yyyy)
  React.useEffect(() => {
    if (value) {
      const date = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(date)) {
        setInputValue(format(date, 'dd/MM/yyyy'));
        setHasError(false);
      }
    } else {
      setInputValue('');
      setHasError(false);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear validation error while typing
    setHasError(false);

    // If empty, clear the date
    if (!newValue || newValue.trim() === '') {
      onChange(undefined);
      return;
    }

    // Don't validate while typing - only on blur
  };

  const handleInputBlur = () => {
    // Validate and parse on blur
    if (!inputValue || inputValue.trim() === '') {
      onChange(undefined);
      setHasError(false);
      return;
    }

    // Try multiple formats: dd/MM/yyyy, d/M/yyyy, dd/MM/yy
    const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy', 'd/M/yy'];
    let parsedDate: Date | null = null;

    for (const formatStr of formats) {
      const date = parse(inputValue, formatStr, new Date());
      if (isValid(date)) {
        parsedDate = date;
        break;
      }
    }

    if (parsedDate && isValid(parsedDate)) {
      onChange(format(parsedDate, 'yyyy-MM-dd'));
      setInputValue(format(parsedDate, 'dd/MM/yyyy'));
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      // Always set the new date, even if it's the same
      onChange(formattedDate);
      setInputValue(format(date, 'dd/MM/yyyy'));
      setHasError(false);
    }
    setOpen(false);
  };

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(hasError && 'border-destructive', className)}
        />
        {hasError && <p className="text-xs text-destructive mt-1">Formato inválido. Use dd/mm/yyyy</p>}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('shrink-0 px-3', !value && 'text-muted-foreground')}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
            defaultMonth={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
            onSelect={handleCalendarSelect}
            disabled={disabled}
            initialFocus
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
