import React, { useState } from 'react';
import { Building, ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import type { CreateCompanyDto } from '@/core/domain/entities/company.entity';

/**
 * Company Registration Step Props
 */
interface CompanyRegistrationStepProps {
  onSubmit: (data: CreateCompanyDto) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

/**
 * Company Registration Step Component
 * Second step of onboarding - register company with RUC and business name
 */
export const CompanyRegistrationStep: React.FC<CompanyRegistrationStepProps> = ({ onSubmit, onBack, isLoading }) => {
  const [formData, setFormData] = useState({
    ruc: '',
    businessName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate RUC (11 digits)
    if (!formData.ruc) {
      newErrors.ruc = 'El RUC es obligatorio';
    } else if (!/^\d{11}$/.test(formData.ruc)) {
      newErrors.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos';
    }

    // Validate business name
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'La razón social es obligatoria';
    } else if (formData.businessName.trim().length < 3) {
      newErrors.businessName = 'La razón social debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const companyData: CreateCompanyDto = {
      ruc: formData.ruc,
      businessName: formData.businessName.trim()
    };

    await onSubmit(companyData);
  };

  /**
   * Handle input changes
   */
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Registra tu Empresa</CardTitle>
        <CardDescription>Ingresa los datos de tu empresa para comenzar</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* RUC Field */}
          <div className="space-y-2">
            <Label htmlFor="ruc">
              RUC <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ruc"
              type="text"
              placeholder="12345678901"
              value={formData.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              maxLength={11}
              disabled={isLoading}
              className={errors.ruc ? 'border-destructive' : ''}
              autoFocus
            />
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
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              disabled={isLoading}
              className={errors.businessName ? 'border-destructive' : ''}
            />
            {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
          </div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 dark:bg-blue-950/20">
            <Building className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs">
              Esta información se utilizará en todos tus registros contables. Asegúrate de que sea correcta.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Registrando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Registrar Empresa
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
