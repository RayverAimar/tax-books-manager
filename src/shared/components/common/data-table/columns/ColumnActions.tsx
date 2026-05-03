import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';

interface ColumnActionsProps<TData extends { id: string }> {
  row: TData;
  onView?: (row: TData) => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
}

/**
 * Shared column actions dropdown menu for data tables
 *
 * Provides consistent action buttons across all tables with:
 * - Copy ID to clipboard
 * - View details (optional)
 * - Edit (optional)
 * - Delete (optional)
 */
export function ColumnActions<TData extends { id: string }>({
  row,
  onView,
  onEdit,
  onDelete
}: ColumnActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.id)}>Copiar ID</DropdownMenuItem>
        <DropdownMenuSeparator />
        {onView && <DropdownMenuItem onClick={() => onView(row)}>Ver detalles</DropdownMenuItem>}
        {onEdit && <DropdownMenuItem onClick={() => onEdit(row)}>Editar</DropdownMenuItem>}
        {onDelete && (
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(row)}>
            Eliminar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
