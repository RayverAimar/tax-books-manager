import { useEffect, useState } from 'react';
import { History, Copy, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { showSuccess, showError } from '@/shared/lib/utils/toast';
import type { ExportHistoryEntry } from '@/core/domain/repositories';

interface ExportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lista los últimos archivos exportados para la empresa activa.
 *
 * Cada entrada incluye el hash SHA-256 del archivo — sirve para probar ante
 * SUNAT qué archivo exacto se subió en caso de impugnación.
 */
export function ExportHistoryDialog({ open, onOpenChange }: ExportHistoryDialogProps) {
  const { company } = useCompany();
  const [entries, setEntries] = useState<ExportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !company?.id) return;
    setLoading(true);
    RepositoryFactory.getExportHistoryRepository()
      .listByCompany(company.id, 100)
      .then(setEntries)
      .catch(() => showError('No se pudo cargar el historial de exports'))
      .finally(() => setLoading(false));
  }, [open, company?.id]);

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    showSuccess('Hash copiado');
  };

  const revealFile = async (filePath: string) => {
    try {
      const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
      await revealItemInDir(filePath);
    } catch {
      showError('No se pudo abrir la carpeta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <DialogTitle>Historial de exports</DialogTitle>
          </div>
          <DialogDescription>
            Últimos archivos generados para SUNAT. El hash SHA-256 te permite probar qué archivo se subió en caso de
            impugnación.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay exports registrados para esta empresa.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Oportunidad</TableHead>
                  <TableHead className="text-right">Filas</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.createdAt.toLocaleString('es-PE')}</TableCell>
                    <TableCell className="text-xs">{e.type === 'sales' ? 'Ventas' : 'Compras'}</TableCell>
                    <TableCell className="text-xs">{e.period}</TableCell>
                    <TableCell className="text-xs uppercase">{e.format}</TableCell>
                    <TableCell className="text-xs">
                      {e.opportunity ?? '—'}
                      {e.correlative ? ` (${e.correlative})` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-right">{e.recordCount}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[200px] truncate" title={e.fileName}>
                      {e.fileName}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[120px] truncate" title={e.fileHash}>
                      {e.fileHash.slice(0, 12)}…
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyHash(e.fileHash)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => revealFile(e.filePath)}>
                          <FolderOpen className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
