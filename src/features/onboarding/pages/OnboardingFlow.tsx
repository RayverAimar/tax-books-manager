import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WelcomeStep } from '../components/WelcomeStep';
import { CompanyRegistrationStep } from '../components/CompanyRegistrationStep';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { useToast } from '@/shared/hooks/useToast';
import { CheckCircle } from 'lucide-react';
import type { CreateCompanyDto } from '@/core/domain/entities/company.entity';

/**
 * Onboarding flow state
 */
interface OnboardingState {
  step: number;
  companyData?: CreateCompanyDto;
  isRegistering: boolean;
  showSuccess: boolean;
}

/**
 * Onboarding Flow Page
 * Guides new users through initial setup
 */
export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { createCompany } = useCompany();
  const { toast } = useToast();
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    isRegistering: false,
    showSuccess: false
  });

  /**
   * Handle welcome step completion
   */
  const handleWelcomeComplete = useCallback(() => {
    setState((prev) => ({ ...prev, step: 2 }));
  }, []);

  /**
   * Handle company registration
   */
  const handleCompanyRegistration = useCallback(
    async (data: CreateCompanyDto) => {
      setState((prev) => ({ ...prev, isRegistering: true }));

      try {
        // Create company in database
        await createCompany(data.ruc, data.businessName);

        // Show success animation
        setState((prev) => ({
          ...prev,
          companyData: data,
          isRegistering: false,
          showSuccess: true
        }));

        // Show success toast
        toast({
          title: '¡Empresa registrada!',
          description: `${data.businessName} se ha registrado exitosamente.`,
          variant: 'success'
        });

        // Wait for animation and then complete
        setTimeout(() => {
          onComplete();
        }, 2000);
      } catch (error: any) {
        setState((prev) => ({ ...prev, isRegistering: false }));

        // Check for duplicate company error
        if (
          error?.message?.includes('UNIQUE constraint failed') ||
          error?.message?.includes('already exists') ||
          error?.message?.includes('duplicate')
        ) {
          toast({
            title: 'Empresa ya registrada',
            description: 'Esta empresa ya existe en el sistema. Por favor, verifica el RUC ingresado.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Error al registrar empresa',
            description: 'Ocurrió un problema al registrar la empresa. Por favor, intenta nuevamente.',
            variant: 'destructive'
          });
        }
      }
    },
    [createCompany, toast, onComplete]
  );

  /**
   * Go back to previous step
   */
  const handleBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1)
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex min-h-screen items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {state.step === 1 && !state.showSuccess && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full max-w-lg"
            >
              <WelcomeStep onNext={handleWelcomeComplete} />
            </motion.div>
          )}

          {/* Step 2: Company Registration */}
          {state.step === 2 && !state.showSuccess && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full max-w-lg"
            >
              <CompanyRegistrationStep
                onSubmit={handleCompanyRegistration}
                onBack={handleBack}
                isLoading={state.isRegistering}
              />
            </motion.div>
          )}

          {/* Success Animation */}
          {state.showSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20
                }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
              >
                <CheckCircle className="h-12 w-12 text-green-600" />
              </motion.div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">¡Bienvenido!</h2>
              <p className="text-gray-600 dark:text-gray-400">Redirigiendo al panel principal...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator - only show 2 steps */}
        {!state.showSuccess && (
          <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 space-x-2">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={cn(
                  'h-2 w-2 rounded-full transition-all duration-300',
                  state.step === step
                    ? 'w-8 bg-primary'
                    : state.step > step
                      ? 'bg-primary/60'
                      : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function for class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
