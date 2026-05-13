import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Registro de un archivo exportado para SUNAT.
 *
 * Se persiste cada vez que el usuario genera un TXT/CSV exitosamente.
 * Sirve para auditoría: si SUNAT impugna un envío, el contribuyente puede
 * probar con `file_hash` (SHA-256) qué archivo exacto se subió.
 */
export interface ExportHistoryEntry {
  id: number;
  companyId: number;
  type: InvoiceType;
  period: string;
  format: 'csv' | 'txt';
  opportunity: string | null;
  correlative: string | null;
  recordCount: number;
  fileName: string;
  filePath: string;
  fileHash: string;
  createdAt: Date;
}

export type CreateExportHistoryDto = Omit<ExportHistoryEntry, 'id' | 'createdAt'>;

export interface ExportHistoryRepository {
  /** Registra una exportación recién completada. */
  create(dto: CreateExportHistoryDto): Promise<ExportHistoryEntry>;
  /** Lista exports de una empresa, los más recientes primero. */
  listByCompany(companyId: number, limit?: number): Promise<ExportHistoryEntry[]>;
}
