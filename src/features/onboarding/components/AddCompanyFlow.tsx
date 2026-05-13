import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Key, ChevronLeft, Save, Search, CheckCircle, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { SettingsRepository } from '@/core/infrastructure/repositories/settings.repository';
import { ApiPeruService } from '@/core/services/api-peru.service';
import { showSuccess, showError } from '@/shared/lib/utils/toast';
import type { CreateCompanyDto } from '@/core/domain/entities/company.entity';

interface AddCompanyFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface FlowState {
  step: number;
  hasApiKey: boolean;
  checkingApiKey: boolean;
  apiKey: string;
  savingApiKey: boolean;
  ruc: string;
  businessName: string;
  isLoadingRuc: boolean;
  isRegistering: boolean;
  showSuccess: boolean;
}

/**
 * Add Company Flow Component
 * 2-step flow to add a new company:
 * 1. API Key (optional, only if not set)
 * 2. RUC + Business Name (with autocomplete)
 */
export const AddCompanyFlow: React.FC<AddCompanyFlowProps> = ({ onComplete, onCancel }) => {
  const { createCompany } = useCompany();
  const [state, setState] = useState<FlowState>({
    step: 1,
    hasApiKey: false,
    checkingApiKey: true,
    apiKey: '',
    savingApiKey: false,
    ruc: '',
    businessName: '',
    isLoadingRuc: false,
    isRegistering: false,
    showSuccess: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Check if API key exists in database
   */
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const settingsRepo = new SettingsRepository();
        const apiKey = await settingsRepo.getApiKey();

        if (apiKey) {
          // Has API key, skip to step 2 (RUC registration)
          setState((prev) => ({
            ...prev,
            hasApiKey: true,
            checkingApiKey: false,
            step: 2
          }));
        } else {
          // No API key, start at step 1
          setState((prev) => ({
            ...prev,
            hasApiKey: false,
            checkingApiKey: false,
            step: 1
          }));
        }
      } catch {
        // If error, assume no API key and show step 1
        setState((prev) => ({
          ...prev,
          hasApiKey: false,
          checkingApiKey: false,
          step: 1
        }));
      }
    };

    checkApiKey();
  }, []);

  /**
   * Save API key and proceed to step 2
   */
  const handleSaveApiKey = async () => {
    if (!state.apiKey.trim()) {
      setErrors({ apiKey: 'Por favor ingrese una API Key válida' });
      return;
    }

    try {
      setState((prev) => ({ ...prev, savingApiKey: true }));
      const settingsRepo = new SettingsRepository();
      await settingsRepo.setApiKey(state.apiKey.trim());

      showSuccess('API Key guardada correctamente');

      setState((prev) => ({
        ...prev,
        savingApiKey: false,
        hasApiKey: true,
        step: 2
      }));
    } catch {
      showError('Error al guardar la API Key');
      setState((prev) => ({ ...prev, savingApiKey: false }));
    }
  };

  /**
   * Skip API key step and go to company registration
   */
  const handleSkipApiKey = () => {
    setState((prev) => ({ ...prev, step: 2 }));
  };

  /**
   * Lookup RUC using PeruAPI
   */
  const handleLookupRuc = useCallback(async () => {
    if (!/^\d{11}$/.test(state.ruc)) {
      setErrors({ ruc: 'El RUC debe tener exactamente 11 dígitos' });
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoadingRuc: true }));
      setErrors({});

      // Get API key from database
      const settingsRepo = new SettingsRepository();
      const apiKey = await settingsRepo.getApiKey();

      if (!apiKey) {
        showError('No se ha configurado una API Key');
        setState((prev) => ({ ...prev, isLoadingRuc: false }));
        return;
      }

      const result = await ApiPeruService.queryRuc(state.ruc, apiKey);

      setState((prev) => ({
        ...prev,
        businessName: result.razon_social,
        isLoadingRuc: false
      }));
      showSuccess('Razón social encontrada');
    } catch {
      setState((prev) => ({ ...prev, isLoadingRuc: false }));
      showError('Error al buscar el RUC. Por favor, ingrese la razón social manualmente.');
    }
  }, [state.ruc]);

  /**
   * Validate company form
   */
  const validateCompanyForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!state.ruc) {
      newErrors.ruc = 'El RUC es obligatorio';
    } else if (!/^\d{11}$/.test(state.ruc)) {
      newErrors.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos';
    }

    if (!state.businessName.trim()) {
      newErrors.businessName = 'La razón social es obligatoria';
    } else if (state.businessName.trim().length < 3) {
      newErrors.businessName = 'La razón social debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle company registration
   */
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCompanyForm()) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, isRegistering: true }));

      const companyData: CreateCompanyDto = {
        ruc: state.ruc,
        businessName: state.businessName.trim()
      };

      await createCompany(companyData.ruc, companyData.businessName);

      // Show success
      setState((prev) => ({
        ...prev,
        isRegistering: false,
        showSuccess: true
      }));

      showSuccess('Empresa registrada correctamente');

      // Complete after animation
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      setState((prev) => ({ ...prev, isRegistering: false }));

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle duplicate RUC error
      if (
        errorMessage.includes('UNIQUE constraint failed') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate') ||
        errorMessage.includes('companies.ruc')
      ) {
        setErrors({ ruc: 'Este RUC ya está registrado en el sistema' });
      } else {
        showError('Error al registrar la empresa');
      }
    }
  };

  // Loading state while checking API key
  if (state.checkingApiKey) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className={
              'mx-auto mb-4 h-8 w-8 animate-spin rounded-full ' + 'border-4 border-primary border-t-transparent'
            }
          />
          <p className="text-sm text-muted-foreground">Verificando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px]">
      <AnimatePresence mode="wait">
        {/* Step 1: API Key (optional) */}
        {state.step === 1 && !state.showSuccess && (
          <motion.div
            key="api-key"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">API Key de SUNAT (Opcional)</h2>
              <p className="text-muted-foreground mt-2">Configura tu API Key para autocompletar datos de RUC</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key de PeruAPI.com</Label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="Ingrese su API Key"
                  value={state.apiKey}
                  onChange={(e) => {
                    setState((prev) => ({ ...prev, apiKey: e.target.value }));
                    if (errors.apiKey) setErrors({});
                  }}
                  disabled={state.savingApiKey}
                  className={errors.apiKey ? 'border-destructive' : ''}
                />
                {errors.apiKey && <p className="text-sm text-destructive">{errors.apiKey}</p>}
                <p className="text-xs text-muted-foreground">
                  Obtenga su API Key en{' '}
                  <a
                    href="https://peruapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://peruapi.com
                  </a>
                </p>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/20">
                <Key className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>Nota:</strong> La API Key permite buscar automáticamente la razón social de empresas. Este
                  paso es opcional y puedes omitirlo.
                </AlertDescription>
              </Alert>
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-6 gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleSkipApiKey}>
                  Omitir
                </Button>
                <Button onClick={handleSaveApiKey} disabled={state.savingApiKey || !state.apiKey.trim()}>
                  {state.savingApiKey ? 'Guardando...' : 'Guardar y Continuar'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Company Registration */}
        {state.step === 2 && !state.showSuccess && (
          <motion.div
            key="company"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Registra tu Empresa</h2>
              <p className="text-muted-foreground mt-2">Ingresa los datos de tu empresa para comenzar</p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterCompany} className="space-y-4">
              {/* RUC Field */}
              <div className="space-y-2">
                <Label htmlFor="ruc">
                  RUC <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ruc"
                    type="text"
                    placeholder="12345678901"
                    value={state.ruc}
                    onChange={(e) => {
                      setState((prev) => ({ ...prev, ruc: e.target.value }));
                      if (errors.ruc) {
                        const { ruc: _ruc, ...rest } = errors;
                        setErrors(rest);
                      }
                    }}
                    maxLength={11}
                    disabled={state.isRegistering || state.isLoadingRuc}
                    className={errors.ruc ? 'border-destructive' : ''}
                    autoFocus
                  />
                  {state.hasApiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLookupRuc}
                      disabled={state.isLoadingRuc || state.isRegistering || !/^\d{11}$/.test(state.ruc)}
                    >
                      {state.isLoadingRuc ? (
                        <div
                          className={
                            'h-4 w-4 animate-spin rounded-full ' + 'border-2 border-primary border-t-transparent'
                          }
                        />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {errors.ruc && <p className="text-sm text-destructive">{errors.ruc}</p>}
                <p className="text-xs text-muted-foreground">El RUC debe tener 11 dígitos</p>
              </div>

              {/* Business Name Field */}
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  Razón Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Nombre completo de la empresa"
                  value={state.businessName}
                  onChange={(e) => {
                    setState((prev) => ({ ...prev, businessName: e.target.value }));
                    if (errors.businessName) setErrors({});
                  }}
                  disabled={state.isRegistering || state.isLoadingRuc}
                  className={errors.businessName ? 'border-destructive' : ''}
                />
                {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/20">
                <Building className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  Esta información se utilizará en todos tus registros contables. Asegúrate de que sea correcta.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (state.hasApiKey) {
                      // If we skipped API key or it was already set, cancel
                      onCancel();
                    } else {
                      // Go back to API key step
                      setState((prev) => ({ ...prev, step: 1 }));
                    }
                  }}
                  disabled={state.isRegistering}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {state.hasApiKey ? 'Cancelar' : 'Atrás'}
                </Button>
                <Button type="submit" disabled={state.isRegistering}>
                  {state.isRegistering ? (
                    <>
                      <div
                        className={
                          'mr-2 h-4 w-4 animate-spin rounded-full ' +
                          'border-2 border-primary-foreground border-t-transparent'
                        }
                      />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Registrar Empresa
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Success Animation */}
        {state.showSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="flex min-h-[500px] items-center justify-center"
          >
            <div className="text-center">
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
              <h2 className="mb-2 text-2xl font-bold">¡Empresa Registrada!</h2>
              <p className="text-muted-foreground">Redirigiendo al panel principal...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Indicator - only show when not success */}
      {!state.showSuccess && !state.hasApiKey && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 space-x-2">
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
  );
};

// Helper function for class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
