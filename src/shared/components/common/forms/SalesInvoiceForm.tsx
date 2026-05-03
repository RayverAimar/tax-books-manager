import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Loader2, Search, Edit2, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { ApiPeruService } from '@/core/services/api-peru.service';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { usePeriod } from '@/core/presentation/contexts/period.context';
import { RepositoryFactory } from '@/core/infrastructure/repositories/repository.factory';
import type { SalesInvoiceFormData } from '@/features/sales/lib/sales-transform';

interface SalesInvoiceFormProps {
  onSubmit: (data: SalesInvoiceFormData) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<SalesInvoiceFormData>;
}

export function SalesInvoiceForm({ onSubmit, onCancel, defaultValues }: SalesInvoiceFormProps) {
  const { company } = useCompany();
  const { selectedPeriod } = usePeriod();

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState(false);
  const [isAdditionalFieldsOpen, setIsAdditionalFieldsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm<SalesInvoiceFormData>({
    mode: 'onBlur', // Changed from 'onChange' to reduce render cost during mount
    defaultValues: {
      ruc: company?.ruc || '',
      businessName: company?.businessName || '',
      period: selectedPeriod || '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: undefined,
      voucherType: '01', // Default to factura
      voucherSeries: 'F001',
      voucherNumber: '',
      customerDocType: '6', // Default to RUC
      customerDocNumber: '',
      customerName: '',
      totalAmount: '0.00',
      vatPercentage: '18',
      taxableBase: '0.00',
      vatAmount: '0.00',
      exportValue: '0.00',
      taxableBaseDiscount: '0.00',
      vatDiscount: '0.00',
      exemptAmount: '0.00',
      unaffectedAmount: '0.00',
      selectiveConsumptionTax: '0.00',
      riceVatBase: '0.00',
      riceVat: '0.00',
      plasticBagTax: '0.00',
      otherTaxes: '0.00',
      currency: 'PEN',
      exchangeRate: '1.000',
      ...defaultValues
    }
  });

  // Watch for changes
  const voucherType = watch('voucherType');
  const customerDocType = watch('customerDocType');
  const customerDocNumber = watch('customerDocNumber');
  const totalAmount = watch('totalAmount');
  const vatPercentage = watch('vatPercentage');

  // Auto-update serie based on document type
  useEffect(() => {
    if (voucherType === '01') {
      setValue('voucherSeries', 'F001');
    } else if (voucherType === '03') {
      setValue('voucherSeries', 'B001');
    }
  }, [voucherType, setValue]);

  // Clear document number and name when document type changes
  useEffect(() => {
    setValue('customerDocNumber', '');
    setValue('customerName', '');
    setLookupError(null);
  }, [customerDocType, setValue]);

  // Auto-calculate amounts when total or VAT% changes
  useEffect(() => {
    const total = parseFloat(totalAmount || '0') || 0;
    const vat = parseFloat(vatPercentage || '18') || 18;

    if (total > 0) {
      // Calculate base and VAT: Total = Base + VAT
      // Base = Total / (1 + VAT/100)
      const base = total / (1 + vat / 100);
      const vatAmount = total - base;

      setValue('taxableBase', base.toFixed(2));
      setValue('vatAmount', vatAmount.toFixed(2));
    } else {
      setValue('taxableBase', '0.00');
      setValue('vatAmount', '0.00');
    }
  }, [totalAmount, vatPercentage, setValue]);

  // Lookup RUC/DNI
  const handleLookup = async () => {
    if (!customerDocNumber) {
      setLookupError('Ingrese un número de documento');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      // Get API key from database - REQUIRED, no fallback
      const settingsRepo = RepositoryFactory.getSettingsRepository();
      const apiKey = await settingsRepo.getApiKey();
      if (!apiKey || apiKey.trim() === '') {
        setLookupError('API Key no configurada. Configure su API Key en Configuración.');
        return;
      }

      if (customerDocType === '6') {
        // RUC lookup
        if (!ApiPeruService.isValidRuc(customerDocNumber)) {
          setLookupError('RUC inválido (debe tener 11 dígitos)');
          return;
        }
        const data = await ApiPeruService.queryRuc(customerDocNumber, apiKey);
        setValue('customerName', data.razon_social);
      } else if (customerDocType === '1') {
        // DNI lookup
        if (!ApiPeruService.isValidDni(customerDocNumber)) {
          setLookupError('DNI inválido (debe tener 8 dígitos)');
          return;
        }
        const data = await ApiPeruService.queryDni(customerDocNumber, apiKey);
        setValue('customerName', data.cliente);
      } else {
        setLookupError('Tipo de documento no soportado para consulta automática');
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Error al consultar documento');
    } finally {
      setIsLookingUp(false);
    }
  };

  const onFormSubmit = async (data: SalesInvoiceFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Company Info Section */}
      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Información del Emisor</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingCompanyInfo(!isEditingCompanyInfo)}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            {isEditingCompanyInfo ? 'Bloquear' : 'Editar'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ruc">RUC del Emisor</Label>
            <Input
              id="ruc"
              {...register('ruc')}
              disabled={!isEditingCompanyInfo}
              className={!isEditingCompanyInfo ? 'bg-muted' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">Razón Social del Emisor</Label>
            <Input
              id="businessName"
              {...register('businessName')}
              disabled={!isEditingCompanyInfo}
              className={!isEditingCompanyInfo ? 'bg-muted' : ''}
            />
          </div>
        </div>
      </div>

      {/* Period Section (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="period">Periodo Tributario</Label>
        <Input id="period" {...register('period')} disabled className="bg-muted" placeholder="YYYYMM" />
        <p className="text-xs text-muted-foreground">Periodo actual seleccionado</p>
      </div>

      {/* Invoice Details Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Datos del Comprobante</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="issueDate">
              Fecha de Emisión <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="issueDate"
              control={control}
              rules={{ required: 'Fecha requerida' }}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} placeholder="dd/mm/yyyy" />
              )}
            />
            {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha de Vencimiento/Pago</Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} placeholder="dd/mm/yyyy" />
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voucherType">
            Tipo de Comprobante <span className="text-destructive">*</span>
          </Label>
          <Select value={voucherType} onValueChange={(value) => setValue('voucherType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="01">01 - Factura</SelectItem>
              <SelectItem value="03">03 - Boleta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voucherSeries">
              Serie del Comprobante <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voucherSeries"
              onClick={(e) => e.currentTarget.select()}
              {...register('voucherSeries', { required: 'Serie requerida' })}
              placeholder="F001 o B001"
              maxLength={4}
            />
            {errors.voucherSeries && <p className="text-xs text-destructive">{errors.voucherSeries.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="voucherNumber">
              Número del Comprobante <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voucherNumber"
              onClick={(e) => e.currentTarget.select()}
              {...register('voucherNumber', { required: 'Número requerido' })}
              placeholder="00000001"
              maxLength={20}
            />
            {errors.voucherNumber && <p className="text-xs text-destructive">{errors.voucherNumber.message}</p>}
          </div>
        </div>
      </div>

      {/* Customer Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Datos del Cliente</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="customerDocType">
              Tipo de Documento <span className="text-destructive">*</span>
            </Label>
            <Select value={customerDocType} onValueChange={(value) => setValue('customerDocType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - DNI</SelectItem>
                <SelectItem value="6">6 - RUC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customerDocNumber">
              Número de Documento <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="customerDocNumber"
                onClick={(e) => e.currentTarget.select()}
                {...register('customerDocNumber', { required: 'Documento requerido' })}
                placeholder={customerDocType === '6' ? '11 dígitos (RUC)' : '8 dígitos (DNI)'}
                maxLength={customerDocType === '6' ? 11 : 8}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setValue('customerDocNumber', value);
                }}
              />
              <Button
                type="button"
                onClick={handleLookup}
                disabled={isLookingUp || !customerDocNumber}
                variant="secondary"
                className="shrink-0"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
            {errors.customerDocNumber && <p className="text-xs text-destructive">{errors.customerDocNumber.message}</p>}
          </div>
        </div>

        {lookupError && (
          <Alert variant="destructive">
            <AlertDescription>{lookupError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="customerName">
            Apellidos y Nombres / Razón Social <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customerName"
            onClick={(e) => e.currentTarget.select()}
            {...register('customerName', { required: 'Nombre/Razón Social requerido' })}
            placeholder="Nombre completo o razón social del cliente"
          />
          {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
        </div>
      </div>

      {/* Amounts Section */}
      <div className="space-y-4 rounded-lg border bg-blue-50/50 p-4">
        <h3 className="text-sm font-semibold">Montos y Cálculos</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="totalAmount">
              Total Comprobante de Pago <span className="text-destructive">*</span>
            </Label>
            <Input
              id="totalAmount"
              onClick={(e) => e.currentTarget.select()}
              type="number"
              step="0.01"
              title="Ingresa un número"
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              {...register('totalAmount', { required: 'Total requerido' })}
              placeholder="0.00"
            />
            {errors.totalAmount && <p className="text-xs text-destructive">{errors.totalAmount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatPercentage">
              IGV % <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vatPercentage"
              onClick={(e) => e.currentTarget.select()}
              type="number"
              step="1"
              title="Ingresa un número"
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              {...register('vatPercentage', { required: 'IGV requerido' })}
              placeholder="18"
            />
            {errors.vatPercentage && <p className="text-xs text-destructive">{errors.vatPercentage.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxableBase">Base Imponible Gravada</Label>
            <Input id="taxableBase" {...register('taxableBase')} disabled className="bg-muted font-semibold" />
            <p className="text-xs text-muted-foreground">Calculado automáticamente: Total / (1 + IGV/100)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatAmount">Monto IGV</Label>
            <Input id="vatAmount" {...register('vatAmount')} disabled className="bg-muted font-semibold" />
            <p className="text-xs text-muted-foreground">Calculado automáticamente: Total - Base</p>
          </div>
        </div>

        <Collapsible open={isAdditionalFieldsOpen} onOpenChange={setIsAdditionalFieldsOpen} className="space-y-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex w-full items-center justify-between p-0 hover:bg-transparent">
              <span className="text-sm font-semibold">Campos Adicionales</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isAdditionalFieldsOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exportValue">Valor Facturado Exportación</Label>
                <Input
                  id="exportValue"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('exportValue')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxableBaseDiscount">Dscto BI</Label>
                <Input
                  id="taxableBaseDiscount"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('taxableBaseDiscount')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatDiscount">Dscto IGV/IPM</Label>
                <Input
                  id="vatDiscount"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('vatDiscount')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exemptAmount">Mto Exonerado</Label>
                <Input
                  id="exemptAmount"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('exemptAmount')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unaffectedAmount">Mto Inafecto</Label>
                <Input
                  id="unaffectedAmount"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('unaffectedAmount')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectiveConsumptionTax">ISC</Label>
                <Input
                  id="selectiveConsumptionTax"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('selectiveConsumptionTax')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="riceVatBase">BI Grav IVAP</Label>
                <Input
                  id="riceVatBase"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('riceVatBase')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="riceVat">IVAP</Label>
                <Input
                  id="riceVat"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('riceVat')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plasticBagTax">ICBPER</Label>
                <Input
                  id="plasticBagTax"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('plasticBagTax')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherTaxes">Otros Tributos</Label>
                <Input
                  id="otherTaxes"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('otherTaxes')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  onClick={(e) => e.currentTarget.select()}
                  {...register('currency')}
                  placeholder="PEN"
                  maxLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Tipo de Cambio</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.001"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('exchangeRate')}
                  placeholder="1.000"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Alert className="bg-muted/50 border-muted-foreground/20">
          <AlertDescription className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Puedes añadir o editar campos adicionales directamente en la tabla después de crear
            el registro.
          </AlertDescription>
        </Alert>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Registro'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
