import { memo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'txt' | 'excel') => void;
  isExporting: boolean;
  disabled?: boolean;
}

export const ExportButton = memo(function ExportButton({ onExport, isExporting, disabled = false }: ExportButtonProps) {
  // Simple computed value - no need for memoization
  const isDisabled = isExporting || disabled;

  // Simple handlers - no need for useCallback
  const handleExportCSV = () => onExport('csv');
  const handleExportTXT = () => onExport('txt');
  const handleExportExcel = () => onExport('excel');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isDisabled}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!animate-none !duration-0 !transition-none">
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          Exportar como CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportTXT} className="cursor-pointer">
          Exportar como TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
