import { useState } from 'react';
import { ApiPeruService } from '@/core/services/api-peru.service';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';

/**
 * Type of document for lookup
 */
export type DocumentType = '1' | '6'; // 1=DNI, 6=RUC

/**
 * Result of a successful document lookup
 */
export interface LookupResult {
  name: string;
}

/**
 * Custom hook for looking up document information (RUC/DNI) from API Perú
 *
 * Provides a unified interface for document validation and lookup across
 * sales and purchase forms.
 *
 * @returns {object} Hook state and functions
 * @returns {boolean} isLookingUp - Whether a lookup is in progress
 * @returns {string | null} lookupError - Error message if lookup failed
 * @returns {function} lookupDocument - Function to perform the lookup
 * @returns {function} clearError - Function to clear the error state
 *
 * @example
 * ```tsx
 * const { isLookingUp, lookupError, lookupDocument, clearError } = useDocumentLookup();
 *
 * const handleLookup = async () => {
 *   const result = await lookupDocument(docNumber, docType);
 *   if (result) {
 *     setValue('customerName', result.name);
 *   }
 * };
 * ```
 */
export function useDocumentLookup() {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  /**
   * Perform document lookup (RUC or DNI)
   *
   * @param docNumber - Document number to look up
   * @param docType - Type of document ('1' for DNI, '6' for RUC)
   * @returns Lookup result with name, or null if failed
   */
  const lookupDocument = async (
    docNumber: string,
    docType: DocumentType
  ): Promise<LookupResult | null> => {
    // Validate input
    if (!docNumber || docNumber.trim() === '') {
      setLookupError('Ingrese un número de documento');
      return null;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      // Get API key from database - REQUIRED, no fallback
      const settingsRepo = RepositoryFactory.getSettingsRepository();
      const apiKey = await settingsRepo.getApiKey();

      if (!apiKey || apiKey.trim() === '') {
        setLookupError('API Key no configurada. Configure su API Key en Configuración.');
        return null;
      }

      // RUC lookup
      if (docType === '6') {
        if (!ApiPeruService.isValidRuc(docNumber)) {
          setLookupError('RUC inválido (debe tener 11 dígitos)');
          return null;
        }
        const data = await ApiPeruService.queryRuc(docNumber, apiKey);
        return { name: data.razon_social };
      }

      // DNI lookup
      else if (docType === '1') {
        if (!ApiPeruService.isValidDni(docNumber)) {
          setLookupError('DNI inválido (debe tener 8 dígitos)');
          return null;
        }
        const data = await ApiPeruService.queryDni(docNumber, apiKey);
        return { name: data.cliente };
      }

      // Unsupported document type
      else {
        setLookupError('Tipo de documento no soportado para consulta automática');
        return null;
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Error al consultar documento');
      return null;
    } finally {
      setIsLookingUp(false);
    }
  };

  /**
   * Clear the error state
   */
  const clearError = () => {
    setLookupError(null);
  };

  return {
    isLookingUp,
    lookupError,
    lookupDocument,
    clearError
  };
}
