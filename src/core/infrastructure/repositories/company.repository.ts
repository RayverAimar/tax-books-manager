import { DatabaseService } from '../database/database.service';
import type { Company, CreateCompanyDto } from '@/core/domain/entities/company.entity';
import { CompanyValidation } from '@/core/domain/entities/company.entity';
import type { CompanyRepository as CompanyRepositoryContract } from '@/core/domain/repositories';
import { setActiveCompanyId } from '@/shared/lib/storage/local-storage';

/**
 * Company Repository (SQLite Implementation)
 * Handles all database operations for companies
 *
 * Implements the CompanyRepository contract defined in the domain layer.
 * This allows switching between different data sources (SQLite, REST API, etc.)
 * without changing the application code.
 */
export class CompanyRepository implements CompanyRepositoryContract {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Creates a new company
   */
  async create(dto: CreateCompanyDto): Promise<Company> {
    // Validate input
    if (!CompanyValidation.isValidRuc(dto.ruc)) {
      throw new Error('RUC inválido. Debe tener 11 dígitos y un dígito verificador válido.');
    }

    if (!CompanyValidation.isValidBusinessName(dto.businessName)) {
      throw new Error('Razón social inválida. Debe tener entre 3 y 200 caracteres.');
    }

    try {
      const result = await this.db.execute(`INSERT INTO companies (ruc, business_name) VALUES (?, ?)`, [
        dto.ruc,
        dto.businessName.trim()
      ]);

      const newCompanyId = result.lastInsertId as number;

      // Set as active company (saves to localStorage only)
      setActiveCompanyId(newCompanyId);

      return await this.getById(newCompanyId);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE')) {
        throw new Error('Ya existe una empresa con este RUC');
      }
      throw error;
    }
  }

  /**
   * Gets a company by ID
   */
  async getById(id: number): Promise<Company> {
    const results = await this.db.select<Company>(
      `SELECT
        id,
        ruc,
        business_name as businessName,
        created_at as createdAt,
        updated_at as updatedAt
      FROM companies
      WHERE id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new Error('Empresa no encontrada');
    }

    return this.mapToEntity(results[0]);
  }

  /**
   * Gets all companies
   */
  async getAll(): Promise<Company[]> {
    const results = await this.db.select<Company>(
      `SELECT
        id,
        ruc,
        business_name as businessName,
        created_at as createdAt,
        updated_at as updatedAt
      FROM companies
      ORDER BY created_at DESC`
    );

    return results.map(this.mapToEntity);
  }

  /**
   * Updates a company
   */
  async update(id: number, businessName: string): Promise<Company> {
    if (!CompanyValidation.isValidBusinessName(businessName)) {
      throw new Error('Razón social inválida');
    }

    await this.db.execute(`UPDATE companies SET business_name = ? WHERE id = ?`, [businessName.trim(), id]);

    return await this.getById(id);
  }

  /**
   * Checks if any company exists
   */
  async hasAnyCompany(): Promise<boolean> {
    const result = await this.db.select<{ count: number }>(`SELECT COUNT(*) as count FROM companies`);
    return result[0].count > 0;
  }

  /**
   * Maps database row to entity
   */
  private mapToEntity(row: any): Company {
    return {
      id: row.id,
      ruc: row.ruc,
      businessName: row.businessName || row.business_name,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at)
    };
  }
}
