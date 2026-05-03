import { memo } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';

interface ImportButtonProps {
  onImport: (format: 'csv' | 'txt') => void;
  isImporting: boolean;
  progress?: number;
  disabled?: boolean;
}

export const ImportButton = memo(function ImportButton({
  onImport,
  isImporting,
  progress = 0,
  disabled = false
}: ImportButtonProps) {
  // Simple computed values - no need for memoization
  const isDisabled = isImporting || disabled;
  const buttonText = isImporting ? `Importando... ${progress}%` : 'Importar';

  // Simple handlers - no need for useCallback
  const handleImportCSV = () => onImport('csv');
  const handleImportTXT = () => onImport('txt');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isDisabled}>
          <Upload className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="!animate-none !duration-0 !transition-none">
        <DropdownMenuItem onClick={handleImportCSV} className="cursor-pointer">
          Importar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleImportTXT} className="cursor-pointer">
          Importar TXT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
