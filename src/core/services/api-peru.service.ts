import { invoke } from '@tauri-apps/api/core';
import { CompanyValidation } from '@/core/domain/entities/company.entity';

/**
 * RUC data structure from apiperu.dev API
 */
export interface RucData {
  ruc: string;
  razon_social: string;
  estado: string;
  condicion: string;
  direccion: string;
  ubigeo?: string[];
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

/**
 * DNI data structure from apiperu.dev API
 */
export interface DniData {
  dni: string;
  cliente: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
}

/**
 * Service for querying RUC and DNI data from Peru APIs
 * IMPORTANT: All methods require a valid API key - no fallback available
 */
export class ApiPeruService {
  /**
   * Query RUC data from peruapi.com
   * @param ruc - 11-digit RUC number
   * @param apiKey - PeruAPI.com API key (REQUIRED)
   * @returns RUC data or throws error
   * @throws Error if API key is not provided or is empty
   */
  static async queryRuc(ruc: string, apiKey: string): Promise<RucData> {
    // Validate API key before making the call
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API Key no configurada. Configure su API Key en Configuración.');
    }

    try {
      const data = await invoke<RucData>('query_ruc', { ruc, apiKey: apiKey.trim() });
      return data;
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Error al consultar RUC');
    }
  }

  /**
   * Query DNI data from peruapi.com
   * @param dni - 8-digit DNI number
   * @param apiKey - PeruAPI.com API key (REQUIRED)
   * @returns DNI data or throws error
   * @throws Error if API key is not provided or is empty
   */
  static async queryDni(dni: string, apiKey: string): Promise<DniData> {
    // Validate API key before making the call
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API Key no configurada. Configure su API Key en Configuración.');
    }

    try {
      const data = await invoke<DniData>('query_dni', { dni, apiKey: apiKey.trim() });
      return data;
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Error al consultar DNI');
    }
  }

  /**
   * Valida RUC: 11 dígitos + dígito verificador (módulo 11). Delegado al canónico
   * en CompanyValidation para mantener una sola implementación del algoritmo SUNAT.
   */
  static isValidRuc(ruc: string): boolean {
    return CompanyValidation.isValidRuc(ruc);
  }

  /**
   * Validates DNI format (8 digits)
   */
  static isValidDni(dni: string): boolean {
    return /^\d{8}$/.test(dni);
  }
}
