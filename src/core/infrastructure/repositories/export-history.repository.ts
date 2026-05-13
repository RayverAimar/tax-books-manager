import { DatabaseService } from '../database/database.service';
import type {
  CreateExportHistoryDto,
  ExportHistoryEntry,
  ExportHistoryRepository as ExportHistoryRepositoryContract
} from '@/core/domain/repositories/export-history.repository';
import type { InvoiceType } from '@/shared/types/invoice.types';

interface ExportHistoryRow {
  id: number;
  company_id: number;
  type: string;
  period: string;
  format: string;
  opportunity: string | null;
  correlative: string | null;
  record_count: number;
  file_name: string;
  file_path: string;
  file_hash: string;
  created_at: string;
}

export class ExportHistoryRepository implements ExportHistoryRepositoryContract {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async create(dto: CreateExportHistoryDto): Promise<ExportHistoryEntry> {
    const result = await this.db.execute(
      `INSERT INTO export_history
         (company_id, type, period, format, opportunity, correlative,
          record_count, file_name, file_path, file_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.companyId,
        dto.type,
        dto.period,
        dto.format,
        dto.opportunity,
        dto.correlative,
        dto.recordCount,
        dto.fileName,
        dto.filePath,
        dto.fileHash
      ]
    );

    const id = result.lastInsertId as number;
    return {
      id,
      ...dto,
      createdAt: new Date()
    };
  }

  async listByCompany(companyId: number, limit: number = 100): Promise<ExportHistoryEntry[]> {
    const rows = await this.db.select<ExportHistoryRow>(
      `SELECT * FROM export_history WHERE company_id = ? ORDER BY created_at DESC LIMIT ?`,
      [companyId, limit]
    );
    return rows.map(this.mapToEntity);
  }

  private mapToEntity(row: ExportHistoryRow): ExportHistoryEntry {
    return {
      id: row.id,
      companyId: row.company_id,
      type: row.type as InvoiceType,
      period: row.period,
      format: row.format as 'csv' | 'txt',
      opportunity: row.opportunity,
      correlative: row.correlative,
      recordCount: row.record_count,
      fileName: row.file_name,
      filePath: row.file_path,
      fileHash: row.file_hash,
      createdAt: new Date(row.created_at)
    };
  }
}
