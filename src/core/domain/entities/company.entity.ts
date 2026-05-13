import type { SystemFields } from '@/shared/types/common.types';

/**
 * Company Entity
 * Represents a company (empresa) in the domain
 *
 * Composition:
 * - SystemFields: System-managed fields (id, createdAt, updatedAt)
 */
export interface Company extends SystemFields {
  ruc: string;
  businessName: string;
}

/**
 * Company creation DTO
 */
export interface CreateCompanyDto {
  ruc: string;
  businessName: string;
}

/**
 * Company validation rules
 */
export class CompanyValidation {
  /**
   * Validates RUC format and check digit
   * @param ruc - The RUC to validate
   * @returns true if valid, false otherwise
   */
  static isValidRuc(ruc: string): boolean {
    // RUC must be exactly 11 digits
    if (!/^\d{11}$/.test(ruc)) {
      return false;
    }

    // Validate RUC check digit using Peruvian algorithm
    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(ruc[i]) * factors[i];
    }

    // Algoritmo oficial SUNAT:
    //   check = 11 - (sum % 11)
    //   si check == 10 → 0; si check == 11 → 1
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10) checkDigit = 0;
    else if (checkDigit === 11) checkDigit = 1;

    return checkDigit === parseInt(ruc[10]);
  }

  /**
   * Validates company name
   * @param businessName - The company name to validate
   * @returns true if valid, false otherwise
   */
  static isValidBusinessName(businessName: string): boolean {
    return businessName.trim().length >= 3 && businessName.trim().length <= 200;
  }
}
