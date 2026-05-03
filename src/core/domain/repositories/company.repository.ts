/**
 * Company Repository Contract
 *
 * Defines the interface for company data operations.
 */

import type { Company, CreateCompanyDto } from '../entities/company.entity';

export interface CompanyRepository {
  /**
   * Create a new company
   *
   * @param dto - Company creation data
   * @returns The created company with generated ID
   */
  create(dto: CreateCompanyDto): Promise<Company>;

  /**
   * Get a company by its ID
   *
   * @param id - Company ID
   * @returns The company if found
   * @throws Error if company not found
   */
  getById(id: number): Promise<Company>;

  /**
   * Get all companies
   *
   * @returns Array of all companies
   */
  getAll(): Promise<Company[]>;

  /**
   * Update a company's business name
   *
   * @param id - Company ID
   * @param businessName - New business name
   * @returns The updated company
   */
  update(id: number, businessName: string): Promise<Company>;

  /**
   * Checks if any company exists in the database
   *
   * @returns True if at least one company exists, false otherwise
   */
  hasAnyCompany(): Promise<boolean>;
}
