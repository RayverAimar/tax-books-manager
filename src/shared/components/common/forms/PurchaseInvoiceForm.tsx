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
import type { PurchaseInvoiceFormData } from '@/features/purchases/lib/purchases-transform';

interface PurchaseInvoiceFormProps {
  onSubmit: (data: PurchaseInvoiceFormData) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<PurchaseInvoiceFormData>;
}

export function PurchaseInvoiceForm({ onSubmit, onCancel, defaultValues }: PurchaseInvoiceFormProps) {
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
  } = useForm<PurchaseInvoiceFormData>({
    mode: 'onBlur', // Changed from 'onChange' to reduce render cost during mount
    defaultValues: {
      ruc: company?.ruc || '',
      businessName: company?.businessName || '',
      period: selectedPeriod || '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: undefined,
      voucherType: '01',
      voucherSeries: 'F001',
      voucherNumberStart: '',
      supplierDocType: '6',
      supplierDocNumber: '',
      supplierName: '',
      totalAmount: '0.00',
      vatPercentage: '18',
      taxableBaseTaxed: '0.00',
      vatAmountTaxed: '0.00',
      nonTaxableValue: '0.00',
      otherTaxes: '0.00',
      taxableBaseMixed: '0.00',
      vatAmountMixed: '0.00',
      taxableBaseUntaxed: '0.00',
      vatAmountUntaxed: '0.00',
      selectiveConsumptionTax: '0.00',
      plasticBagTax: '0.00',
      currency: 'PEN',
      exchangeRate: '1.000',
      voucherStatus: '1',
      ...defaultValues
    }
  });

  const voucherType = watch('voucherType');
  const voucherStatus = watch('voucherStatus');
  const supplierDocType = watch('supplierDocType');
  const supplierDocNumber = watch('supplierDocNumber');
  const totalAmount = watch('totalAmount');
  const vatPercentage = watch('vatPercentage');

  useEffect(() => {
    if (voucherType === '01') {
      setValue('voucherSeries', 'F001');
    } else if (voucherType === '03') {
      setValue('voucherSeries', 'B001');
    }
  }, [voucherType, setValue]);

  // Clear supplier document number when document type changes (DNI ↔ RUC)
  useEffect(() => {
    setValue('supplierDocNumber', '');
    setValue('supplierName', '');
    setLookupError(null);
  }, [supplierDocType, setValue]);

  useEffect(() => {
    const total = parseFloat(totalAmount || '0') || 0;
    const vat = parseFloat(vatPercentage || '18') || 18;
    if (total > 0) {
      const base = total / (1 + vat / 100);
      const vatAmount = total - base;
      setValue('taxableBaseTaxed', base.toFixed(2));
      setValue('vatAmountTaxed', vatAmount.toFixed(2));
    } else {
      setValue('taxableBaseTaxed', '0.00');
      setValue('vatAmountTaxed', '0.00');
    }
  }, [totalAmount, vatPercentage, setValue]);

  const handleLookup = async () => {
    if (!supplierDocNumber) {
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

      if (supplierDocType === '6') {
        if (!ApiPeruService.isValidRuc(supplierDocNumber)) {
          setLookupError('RUC inválido (11 dígitos + dígito verificador)');
          return;
        }
        const data = await ApiPeruService.queryRuc(supplierDocNumber, apiKey);
        setValue('supplierName', data.razon_social);
      } else if (supplierDocType === '1') {
        if (!ApiPeruService.isValidDni(supplierDocNumber)) {
          setLookupError('DNI inválido (debe tener 8 dígitos)');
          return;
        }
        const data = await ApiPeruService.queryDni(supplierDocNumber, apiKey);
        setValue('supplierName', data.cliente);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Error al consultar documento');
    } finally {
      setIsLookingUp(false);
    }
  };

  const onFormSubmit = async (data: PurchaseInvoiceFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Información del Contribuyente</h3>
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
            <Label htmlFor="ruc">RUC del Contribuyente</Label>
            <Input
              id="ruc"
              {...register('ruc')}
              disabled={!isEditingCompanyInfo}
              className={!isEditingCompanyInfo ? 'bg-muted' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">Razón Social del Contribuyente</Label>
            <Input
              id="businessName"
              {...register('businessName')}
              disabled={!isEditingCompanyInfo}
              className={!isEditingCompanyInfo ? 'bg-muted' : ''}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="period">Periodo Tributario</Label>
        <Input id="period" {...register('period')} disabled className="bg-muted" placeholder="YYYYMM" />
        <p className="text-xs text-muted-foreground">Periodo actual seleccionado</p>
      </div>
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Datos del Comprobante de Compra</h3>
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
            <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} placeholder="dd/mm/yyyy" />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="space-y-2">
            <Label htmlFor="voucherStatus">
              Estado del Comprobante <span className="text-destructive">*</span>
            </Label>
            <Select value={voucherStatus ?? '1'} onValueChange={(value) => setValue('voucherStatus', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Registrado</SelectItem>
                <SelectItem value="2">2 - Anulado</SelectItem>
                <SelectItem value="8">8 - Periodo anterior no anotado</SelectItem>
                <SelectItem value="9">9 - Periodo anterior anotado incorrectamente</SelectItem>
                <SelectItem value="0">0 - Cierre o anulación de serie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voucherSeries">
              Serie del Comprobante <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voucherSeries"
              {...register('voucherSeries', { required: 'Serie requerida' })}
              maxLength={4}
              onClick={(e) => e.currentTarget.select()}
            />
            {errors.voucherSeries && <p className="text-xs text-destructive">{errors.voucherSeries.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="voucherNumberStart">
              Número del Comprobante <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voucherNumberStart"
              onClick={(e) => e.currentTarget.select()}
              {...register('voucherNumberStart', { required: 'Número requerido' })}
              maxLength={20}
            />
            {errors.voucherNumberStart && (
              <p className="text-xs text-destructive">{errors.voucherNumberStart.message}</p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Datos del Proveedor</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="supplierDocType">
              Tipo de Documento <span className="text-destructive">*</span>
            </Label>
            <Select value={supplierDocType} onValueChange={(value) => setValue('supplierDocType', value)}>
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
            <Label htmlFor="supplierDocNumber">
              Número de Documento <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="supplierDocNumber"
                onClick={(e) => e.currentTarget.select()}
                {...register('supplierDocNumber', { required: 'Documento requerido' })}
                placeholder={supplierDocType === '6' ? '11 dígitos (RUC)' : '8 dígitos (DNI)'}
                maxLength={supplierDocType === '6' ? 11 : 8}
                onChange={(e) => setValue('supplierDocNumber', e.target.value.replace(/\D/g, ''))}
              />
              <Button
                type="button"
                onClick={handleLookup}
                disabled={isLookingUp || !supplierDocNumber}
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
            {errors.supplierDocNumber && <p className="text-xs text-destructive">{errors.supplierDocNumber.message}</p>}
          </div>
        </div>
        {lookupError && (
          <Alert variant="destructive">
            <AlertDescription>{lookupError}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="supplierName">
            Razón Social del Proveedor <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supplierName"
            onClick={(e) => e.currentTarget.select()}
            {...register('supplierName', { required: 'Razón Social requerida' })}
            placeholder="Razón social o nombre completo del proveedor"
          />
          <p className="text-xs text-muted-foreground">Se auto-completa al buscar RUC/DNI, pero puede editarse</p>
          {errors.supplierName && <p className="text-xs text-destructive">{errors.supplierName.message}</p>}
        </div>
      </div>
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
            <Label htmlFor="taxableBaseTaxed">Base Imponible Gravada</Label>
            <Input
              id="taxableBaseTaxed"
              {...register('taxableBaseTaxed')}
              disabled
              className="bg-muted font-semibold"
            />
            <p className="text-xs text-muted-foreground">Calculado: Total / (1 + IGV/100)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatAmountTaxed">Monto IGV</Label>
            <Input id="vatAmountTaxed" {...register('vatAmountTaxed')} disabled className="bg-muted font-semibold" />
            <p className="text-xs text-muted-foreground">Calculado: Total - Base</p>
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
                <Label htmlFor="taxableBaseMixed">BI Gravado DGNG</Label>
                <Input
                  id="taxableBaseMixed"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('taxableBaseMixed')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatAmountMixed">IGV / IPM DGNG</Label>
                <Input
                  id="vatAmountMixed"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('vatAmountMixed')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxableBaseUntaxed">BI Gravado DNG</Label>
                <Input
                  id="taxableBaseUntaxed"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('taxableBaseUntaxed')}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatAmountUntaxed">IGV / IPM DNG</Label>
                <Input
                  id="vatAmountUntaxed"
                  type="number"
                  step="0.01"
                  title="Ingresa un número"
                  onClick={(e) => e.currentTarget.select()}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa un número válido')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  {...register('vatAmountUntaxed')}
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
