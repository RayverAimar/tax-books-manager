import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getSelectedPeriod, setSelectedPeriod as saveSelectedPeriod } from '@/shared/lib/storage/local-storage';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import type { InvoiceType } from '@/shared/types/invoice.types';

/**
 * Estructura completa del periodo con estado declared
 */
interface PeriodData {
  code: string;                  // "202401"
  salesDeclared: boolean;        // Estado declared para ventas
  purchasesDeclared: boolean;    // Estado declared para compras
}

/**
 * Context data con estado completo del periodo
 */
interface PeriodContextData {
  // Periodo completo (null si no hay seleccionado)
  period: PeriodData | null;

  // Código del periodo seleccionado (para compatibilidad)
  selectedPeriod: string | null;

  // Cargar periodo completo con estado declared
  loadPeriod: (periodCode: string, companyId: number) => Promise<void>;

  // Toggle declared status
  toggleDeclared: (companyId: number, type: InvoiceType) => Promise<void>;

  // Clear period
  clearPeriod: () => void;
}

const PeriodContext = createContext<PeriodContextData | undefined>(undefined);

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
};

interface PeriodProviderProps {
  children: ReactNode;
}

export const PeriodProvider: React.FC<PeriodProviderProps> = ({ children }) => {
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar período inicial desde localStorage
  useEffect(() => {
    try {
      const savedPeriodCode = getSelectedPeriod();
      if (savedPeriodCode) {
        // Periodo inicial sin estado declared
        // Se cargará completo cuando el usuario haga "Buscar" en Dashboard
        setPeriod({
          code: savedPeriodCode,
          salesDeclared: false,
          purchasesDeclared: false
        });
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * Carga un periodo completo con su estado declared
   * Se llama cuando el usuario hace click en "Buscar" en el Dashboard
   */
  const loadPeriod = useCallback(async (periodCode: string, companyId: number): Promise<void> => {
    try {
      const periodRepo = RepositoryFactory.getPeriodRepository();

      // Query para sales
      const salesPeriods = await periodRepo.getAvailablePeriods(companyId, 'sales');
      const salesPeriod = salesPeriods.find(p => p.code === periodCode);

      // Query para purchases
      const purchasesPeriods = await periodRepo.getAvailablePeriods(companyId, 'purchases');
      const purchasesPeriod = purchasesPeriods.find(p => p.code === periodCode);

      // Construir periodo completo
      const periodData: PeriodData = {
        code: periodCode,
        salesDeclared: salesPeriod?.declared || false,
        purchasesDeclared: purchasesPeriod?.declared || false
      };

      // Guardar en estado y localStorage
      setPeriod(periodData);
      saveSelectedPeriod(periodCode);
    } catch (error) {
      console.error('Error loading period:', error);
      // En caso de error, crear periodo con valores por defecto
      setPeriod({
        code: periodCode,
        salesDeclared: false,
        purchasesDeclared: false
      });
      saveSelectedPeriod(periodCode);
    }
  }, []);

  /**
   * Toggle declared status para un tipo de registro
   * Hace update optimista para mejor UX
   */
  const toggleDeclared = useCallback(
    async (companyId: number, type: InvoiceType): Promise<void> => {
      if (!period) return;

      const currentDeclared = type === 'sales' ? period.salesDeclared : period.purchasesDeclared;
      const newDeclared = !currentDeclared;

      // Optimistic update
      setPeriod({
        ...period,
        salesDeclared: type === 'sales' ? newDeclared : period.salesDeclared,
        purchasesDeclared: type === 'purchases' ? newDeclared : period.purchasesDeclared
      });

      try {
        // Guardar en DB
        const periodRepo = RepositoryFactory.getPeriodRepository();
        await periodRepo.setDeclared(companyId, period.code, type, newDeclared);
      } catch (error) {
        console.error('Error toggling declared status:', error);
        // Rollback en caso de error
        setPeriod({
          ...period,
          salesDeclared: type === 'sales' ? currentDeclared : period.salesDeclared,
          purchasesDeclared: type === 'purchases' ? currentDeclared : period.purchasesDeclared
        });
        throw error;
      }
    },
    [period]
  );

  /**
   * Clear period (para logout o cambio de empresa)
   */
  const clearPeriod = useCallback(() => {
    setPeriod(null);
  }, []);

  // No renderizar hasta que se cargue el período guardado
  if (!isLoaded) {
    return null;
  }

  return (
    <PeriodContext.Provider
      value={{
        period,
        selectedPeriod: period?.code || null,
        loadPeriod,
        toggleDeclared,
        clearPeriod
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
};
