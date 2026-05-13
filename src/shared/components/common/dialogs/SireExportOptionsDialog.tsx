import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import type { SireOpportunity } from '@/shared/lib/export/sire-filename';

/**
 * Diálogo para elegir la "oportunidad" SIRE al generar el TXT oficial.
 *
 * SUNAT distingue:
 *  - 01 Acepta propuesta: el contribuyente confirma la propuesta tal cual la
 *    generó SUNAT. Usar solo si los datos coinciden 1:1 con la propuesta.
 *  - 02 Reemplaza propuesta: el contribuyente sube su propio archivo con los
 *    datos correctos. **Caso más común** y default.
 *  - 03 Ajustes posteriores: corrige un período ya cerrado. Requiere
 *    correlativo (NN al final del nombre del archivo).
 *  - 04/05 Ajustes anteriores al nuevo sistema (raros — formato general / simplificado).
 */
export interface SireExportOptionsResult {
  opportunity: SireOpportunity;
  correlative?: string;
}

interface SireExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: SireExportOptionsResult) => void;
}

const OPPORTUNITY_LABELS: Record<SireOpportunity, string> = {
  '01': 'Acepta propuesta',
  '02': 'Reemplaza propuesta (recomendado)',
  '03': 'Ajustes posteriores',
  '04': 'Ajustes anteriores — formato general',
  '05': 'Ajustes anteriores — formato simplificado'
};

const REQUIRES_CORRELATIVE: SireOpportunity[] = ['03', '04', '05'];

export function SireExportOptionsDialog({ open, onOpenChange, onConfirm }: SireExportOptionsDialogProps) {
  const [opportunity, setOpportunity] = useState<SireOpportunity>('02');
  const [correlative, setCorrelative] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsCorrelative = REQUIRES_CORRELATIVE.includes(opportunity);

  const handleConfirm = () => {
    if (needsCorrelative && !/^\d{2}$/.test(correlative)) {
      setError('Correlativo debe ser de 2 dígitos (ej. 01, 02, 03…)');
      return;
    }
    setError(null);
    onConfirm({ opportunity, correlative: needsCorrelative ? correlative : undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Opciones de exportación SIRE</DialogTitle>
          <DialogDescription>
            Elige el tipo de envío. El nombre del archivo TXT incluye este código y SUNAT lo usa para clasificar el
            registro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="opportunity">Oportunidad</Label>
            <Select value={opportunity} onValueChange={(v) => setOpportunity(v as SireOpportunity)}>
              <SelectTrigger id="opportunity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OPPORTUNITY_LABELS) as SireOpportunity[]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} — {OPPORTUNITY_LABELS[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsCorrelative && (
            <div className="space-y-2">
              <Label htmlFor="correlative">Correlativo (2 dígitos)</Label>
              <Input
                id="correlative"
                value={correlative}
                onChange={(e) => setCorrelative(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="01"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Número de ajuste para este período. El primer ajuste posterior es 01, el segundo 02, etc.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Generar TXT</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
