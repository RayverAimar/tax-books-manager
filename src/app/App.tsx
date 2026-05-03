import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/shared/components/ui/sonner';
import { ErrorBoundary } from '@/shared/components/common/ErrorBoundary';
import { CompanyProvider } from '@/core/presentation/contexts/company.context';
import { PeriodProvider } from '@/core/presentation/contexts/period.context';
import { DatabaseService } from '@/core/infrastructure/database/database.service';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import { getActiveCompanyId } from '@/shared/lib/storage/local-storage';

// Lazy load pages for better performance (code splitting)
const Dashboard = lazy(() => import('@/features/dashboard/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Sales = lazy(() => import('@/features/sales/pages/Sales').then((m) => ({ default: m.Sales })));
const Purchases = lazy(() => import('@/features/purchases/pages/Purchases').then((m) => ({ default: m.Purchases })));
const OnboardingFlow = lazy(() =>
  import('@/features/onboarding/pages/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow }))
);
const CompanySelectionPage = lazy(() =>
  import('@/features/onboarding/pages/CompanySelectionPage').then((m) => ({ default: m.CompanySelectionPage }))
);

// Loading fallback
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

export function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [appState, setAppState] = useState<'onboarding' | 'company-selection' | 'app'>('onboarding');

  const initializeApp = async () => {
    try {
      // Initialize database
      const db = DatabaseService.getInstance();
      await db.initialize();

      // Check if there are any companies
      const companyRepo = RepositoryFactory.getCompanyRepository();
      const hasCompany = await companyRepo.hasAnyCompany();

      if (!hasCompany) {
        // No companies → show onboarding
        setAppState('onboarding');
      } else {
        // Has companies → check if there's an active company selected
        const activeCompanyId = getActiveCompanyId();

        if (!activeCompanyId) {
          // Has companies but no active selection → show company selector
          setAppState('company-selection');
        } else {
          // Has active company → show main app
          setAppState('app');
        }
      }
    } catch {
      // If database fails, assume we need onboarding
      setAppState('onboarding');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div
            className={
              'mx-auto mb-4 h-8 w-8 animate-spin rounded-full ' + 'border-4 border-primary border-t-transparent'
            }
          />
          <p className="text-sm text-muted-foreground">Inicializando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <CompanyProvider>
          <PeriodProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* State 1: No companies - Onboarding flow */}
                  {appState === 'onboarding' && (
                    <>
                      <Route
                        path="/"
                        element={
                          <OnboardingFlow
                            onComplete={() => {
                              window.location.reload(); // Reload to reinitialize
                            }}
                          />
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}

                  {/* State 2: Has companies but no active selection - Company selector */}
                  {appState === 'company-selection' && (
                    <>
                      <Route path="/" element={<CompanySelectionPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}

                  {/* State 3: Has active company - Main app */}
                  {appState === 'app' && (
                    <>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/purchases" element={<Purchases />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                </Routes>
              </Suspense>
              <Toaster />
            </BrowserRouter>
          </PeriodProvider>
        </CompanyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
