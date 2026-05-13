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
  onExport: (format: 'csv' | 'txt') => void;
  isExporting: boolean;
  disabled?: boolean;
}

export const ExportButton = memo(function ExportButton({ onExport, isExporting, disabled = false }: ExportButtonProps) {
  const isDisabled = isExporting || disabled;

  const handleExportCSV = () => onExport('csv');
  const handleExportTXT = () => onExport('txt');

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
