import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Company } from '@/core/domain/entities/company.entity';
import type { CompanyRepository } from '@/core/domain/repositories';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { DatabaseService } from '@/core/infrastructure/database/database.service';
import {
  getActiveCompanyId,
  setActiveCompanyId,
  removeStorageValue,
  StorageKeys
} from '@/shared/lib/storage/local-storage';
import { resetInvoiceIdCounter } from '@/shared/lib/utils/invoice';

/**
 * Company context state
 */
interface CompanyContextState {
  company: Company | null;
  companies: Company[];
  isLoading: boolean;
  error: string | null;
  switchCompany: (companyId: number) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  createCompany: (ruc: string, businessName: string) => Promise<Company>;
  updateCompany: (companyId: number, businessName: string) => Promise<Company>;
}

/**
 * Company context
 */
const CompanyContext = createContext<CompanyContextState | undefined>(undefined);

/**
 * Company Provider Props
 */
interface CompanyProviderProps {
  children: React.ReactNode;
}

/**
 * Company Provider Component
 * Provides global company state management
 */
export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<CompanyRepository | null>(null);

  /**
   * Initializes the database and repository
   */
  useEffect(() => {
    let cancelled = false;

    const initializeDatabase = async () => {
      try {
        if (!cancelled) {
          setIsLoading(true);
          setError(null);
        }

        // Initialize database
        const db = DatabaseService.getInstance();
        await db.initialize();

        // Get repository
        const repo = RepositoryFactory.getCompanyRepository();

        // SECURITY: Check if component is still mounted before updating state
        if (cancelled) return;

        setRepository(repo);

        // Load all companies
        const allCompanies = await repo.getAll();

        // Get active company from localStorage (NO database fallback)
        const activeCompanyIdValue = getActiveCompanyId();
        let activeCompany: Company | null = null;

        if (activeCompanyIdValue) {
          // Active company is saved in localStorage, try to load it
          try {
            activeCompany = await repo.getById(activeCompanyIdValue);
          } catch {
            // Clear invalid active company from localStorage
            removeStorageValue(StorageKeys.ACTIVE_COMPANY_ID);
            // Fall through to auto-selection logic below
          }
        }

        // If no active company loaded yet, handle auto-selection
        if (!activeCompany) {
          if (allCompanies.length === 1) {
            // Only one company exists - auto-select and save to localStorage
            activeCompany = allCompanies[0];
            setActiveCompanyId(activeCompany.id);
          } else if (allCompanies.length > 1) {
            // Multiple companies - leave null, UI will show company selection page
            activeCompany = null;
          } else {
            // No companies - onboarding flow
            activeCompany = null;
          }
        }

        if (!cancelled) {
          setCompanies(allCompanies);
          setCompany(activeCompany);
        }
      } catch {
        if (!cancelled) {
          setError('Error al inicializar la base de datos');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Switches to a different company
   */
  const switchCompany = useCallback(
    async (companyId: number) => {
      if (!repository) return;

      try {
        setError(null);
        setActiveCompanyId(companyId);
        // Any unsaved (negative) ids from the previous company are now unreachable.
        resetInvoiceIdCounter();
        const newCompany = await repository.getById(companyId);
        setCompany(newCompany);
      } catch (err) {
        setError('Error al cambiar de empresa');
        throw err;
      }
    },
    [repository]
  );

  /**
   * Refreshes the companies list
   */
  const refreshCompanies = useCallback(async () => {
    if (!repository) return;

    try {
      setError(null);
      const allCompanies = await repository.getAll();
      setCompanies(allCompanies);
    } catch {
      setError('Error al actualizar empresas');
    }
  }, [repository]);

  /**
   * Creates a new company
   */
  const createCompany = useCallback(
    async (ruc: string, businessName: string): Promise<Company> => {
      if (!repository) {
        throw new Error('Repository not initialized');
      }

      try {
        setError(null);
        const newCompany = await repository.create({ ruc, businessName });

        // Refresh companies list
        await refreshCompanies();

        // Set as active company and save to localStorage
        setCompany(newCompany);
        setActiveCompanyId(newCompany.id);

        return newCompany;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear empresa';
        setError(errorMessage);
        throw err;
      }
    },
    [repository, refreshCompanies]
  );

  /**
   * Updates an existing company
   */
  const updateCompany = useCallback(
    async (companyId: number, businessName: string): Promise<Company> => {
      if (!repository) {
        throw new Error('Repository not initialized');
      }

      try {
        setError(null);
        const updatedCompany = await repository.update(companyId, businessName);

        // Refresh companies list
        await refreshCompanies();

        // Update current company if it's the one being updated
        if (company?.id === companyId) {
          setCompany(updatedCompany);
        }

        return updatedCompany;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al actualizar empresa';
        setError(errorMessage);
        throw err;
      }
    },
    [repository, refreshCompanies, company]
  );

  /**
   * Memoized context value
   */
  const contextValue = useMemo(
    () => ({
      company,
      companies,
      isLoading,
      error,
      switchCompany,
      refreshCompanies,
      createCompany,
      updateCompany
    }),
    [company, companies, isLoading, error, switchCompany, refreshCompanies, createCompany, updateCompany]
  );

  return <CompanyContext.Provider value={contextValue}>{children}</CompanyContext.Provider>;
};

/**
 * Hook to use company context
 */
export const useCompany = (): CompanyContextState => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

/**
 * Hook to get active company (throws if no company)
 */
export const useActiveCompany = (): Company => {
  const { company } = useCompany();
  if (!company) {
    throw new Error('No active company selected');
  }
  return company;
};

/**
 * Hook to check if has any company
 */
export const useHasCompany = (): boolean => {
  const { company, companies } = useCompany();
  return Boolean(company) || companies.length > 0;
};
