import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building, Key, CheckCircle2, AlertTriangle, Database, Upload, Download, LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { BulkImportDialog } from './BulkImportDialog';
import { BulkExportDialog } from './BulkExportDialog';
import { showSuccess, showError } from '@/shared/lib/utils/toast';
import { SettingsRepository } from '@/core/infrastructure/repositories/settings.repository';

interface CompanySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showBulkActions?: boolean;
}

interface CompanyFormData {
  taxId: string;
  businessName: string;
}

/**
 * Reusable Section Header Component
 */
interface SectionHeaderProps {
  title: string;
  description: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => (
  <div>
    <h3 className="text-lg font-medium mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

/**
 * Reusable Action Card Component for Data Management
 */
interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  onAction: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon: Icon, title, description, buttonLabel, onAction }) => (
  <div className="flex items-start gap-3 p-3 border rounded-lg">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <Button onClick={onAction} variant="outline" size="sm" className="gap-2">
        <Icon className="h-4 w-4" />
        {buttonLabel}
      </Button>
    </div>
  </div>
);

/**
 * Company Settings Dialog Component
 * Modal with vertical tabs for company info, SUNAT API key, and data management
 */
export const CompanySettingsDialog: React.FC<CompanySettingsDialogProps> = ({
  open,
  onOpenChange,
  showBulkActions = false
}) => {
  const { company, updateCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Bulk import/export dialogs
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Company form
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany,
    formState: { isDirty: isCompanyDirty }
  } = useForm<CompanyFormData>({
    defaultValues: {
      taxId: company?.ruc || '',
      businessName: company?.businessName || ''
    }
  });

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [initialApiKey, setInitialApiKey] = useState('');
  const [hasUserKey, setHasUserKey] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);

  const isApiKeyDirty = apiKey !== initialApiKey;
  const hasUnsavedChanges = isCompanyDirty || isApiKeyDirty;

  /**
   * Load API Key from database
   */
  const loadApiKey = async () => {
    try {
      setIsLoadingApiKey(true);
      const settingsRepo = new SettingsRepository();
      const userKey = await settingsRepo.getApiKey();
      const keyValue = userKey || '';
      setApiKey(keyValue);
      setInitialApiKey(keyValue);
      setHasUserKey(Boolean(userKey));
    } catch {
      // Ignore errors loading API key
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  /**
   * Load company data when dialog opens
   */
  useEffect(() => {
    if (open && company) {
      resetCompany({
        taxId: company.ruc,
        businessName: company.businessName
      });
      loadApiKey();
    }
  }, [open, company, resetCompany]);

  /**
   * Handle dialog close with unsaved changes check
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(newOpen);
      setActiveTab('company');
    }
  };

  /**
   * Confirm close with unsaved changes
   */
  const confirmClose = () => {
    setShowUnsavedWarning(false);
    onOpenChange(false);
    setActiveTab('company');
  };

  /**
   * Cancel close (stay in dialog)
   */
  const cancelClose = () => {
    setShowUnsavedWarning(false);
  };

  /**
   * Save company information
   */
  const onSubmitCompany = async (data: CompanyFormData) => {
    if (!company) return;

    try {
      setIsSubmitting(true);

      // Update company via context (this will also refresh the company state)
      await updateCompany(company.id, data.businessName);

      showSuccess('Datos de empresa actualizados correctamente');
      resetCompany(data);
    } catch {
      showError('Error al actualizar la empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Save API Key
   */
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      showError('Por favor ingrese una API Key válida');
      return;
    }

    try {
      setIsSubmitting(true);
      const settingsRepo = new SettingsRepository();
      await settingsRepo.setApiKey(apiKey.trim());
      setInitialApiKey(apiKey.trim());
      setHasUserKey(true);
      showSuccess('API Key guardada correctamente');
    } catch {
      showError('Error al guardar la API Key');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!company) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl h-[600px] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Configuración</DialogTitle>
            <DialogDescription>Gestiona la información de tu empresa y configuración de SUNAT</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 overflow-hidden min-h-0">
            {/* Vertical Tabs List */}
            <TabsList className="flex flex-col h-full w-48 bg-muted/30 rounded-none border-r justify-start p-2 gap-1">
              <TabsTrigger value="company" className="w-full justify-start gap-2 data-[state=active]:bg-background">
                <Building className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="api-key" className="w-full justify-start gap-2 data-[state=active]:bg-background">
                <Key className="h-4 w-4" />
                API Key SUNAT
              </TabsTrigger>
              {showBulkActions && (
                <TabsTrigger value="data" className="w-full justify-start gap-2 data-[state=active]:bg-background">
                  <Database className="h-4 w-4" />
                  Datos
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Company Info Tab */}
              <TabsContent value="company" className="m-0 p-6">
                <form onSubmit={handleSubmitCompany(onSubmitCompany)} className="space-y-4">
                  <SectionHeader
                    title="Información de Empresa"
                    description="Estos datos se usan para autocompletar registros de compras y ventas"
                  />

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> El RUC y Razón Social se utilizan por defecto en los registros de
                      compras y ventas. Asegúrese de que los datos sean correctos.
                    </AlertDescription>
                  </Alert>

                  {/* RUC Field (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="taxId">RUC</Label>
                    <Input id="taxId" {...registerCompany('taxId')} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">El RUC no puede ser modificado</p>
                  </div>

                  {/* Razón Social Field */}
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Razón Social</Label>
                    <Input
                      id="businessName"
                      {...registerCompany('businessName')}
                      placeholder="Nombre de la empresa"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este es el nombre oficial de tu empresa que aparecerá en los registros
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetCompany()}
                      disabled={!isCompanyDirty || isSubmitting}
                    >
                      Descartar
                    </Button>
                    <Button type="submit" disabled={!isCompanyDirty || isSubmitting}>
                      {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* API Key Tab */}
              <TabsContent value="api-key" className="m-0 p-6">
                <div className="space-y-4">
                  <SectionHeader
                    title="API Key de SUNAT"
                    description="Configura tu API Key para búsquedas automáticas de RUC"
                  />

                  {/* Status Alert */}
                  {!isLoadingApiKey && (
                    <>
                      {!hasUserKey && (
                        <Alert>
                          <AlertDescription>
                            Actualmente se está utilizando la API Key del desarrollador. Puedes configurar tu propia API
                            Key aquí.
                          </AlertDescription>
                        </Alert>
                      )}

                      {hasUserKey && (
                        <Alert className="border-green-200 bg-green-50/50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-900">
                            API Key personalizada configurada correctamente
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}

                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key de PeruAPI.com</Label>
                    <Input
                      id="apiKey"
                      type="text"
                      placeholder="Ingrese su API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={isSubmitting || isLoadingApiKey}
                      className="font-mono"
                    />
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

                  {/* Info Alert */}
                  <Alert>
                    <AlertDescription>
                      <strong>Nota:</strong> Esta API Key se utiliza para buscar nombres y razones sociales en SUNAT y
                      autocompletar campos. Es compartida entre todas las empresas.
                    </AlertDescription>
                  </Alert>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setApiKey(initialApiKey)}
                      disabled={!isApiKeyDirty || isSubmitting}
                    >
                      Descartar
                    </Button>
                    <Button onClick={handleSaveApiKey} disabled={!isApiKeyDirty || isSubmitting || !apiKey.trim()}>
                      {isSubmitting ? 'Guardando...' : 'Guardar API Key'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Data Management Tab */}
              {showBulkActions && (
                <TabsContent value="data" className="m-0 p-6">
                  <div className="space-y-4">
                    <SectionHeader
                      title="Gestión de Datos"
                      description="Importa o exporta datos históricos de compras y ventas"
                    />

                    {/* Import Section */}
                    <ActionCard
                      icon={Upload}
                      title="Importar Datos Históricos"
                      description={
                        'Carga archivos ZIP con registros de compras y ventas de múltiples periodos. ' +
                        'Útil para migrar datos históricos o restaurar backups.'
                      }
                      buttonLabel="Importar Datos"
                      onAction={() => setShowImportDialog(true)}
                    />

                    {/* Export Section */}
                    <ActionCard
                      icon={Download}
                      title="Exportar Datos Históricos"
                      description={
                        'Descarga todos tus registros en un archivo ZIP organizado por periodos. ' +
                        'Ideal para crear backups o compartir información con tu contador.'
                      }
                      buttonLabel="Exportar Datos"
                      onAction={() => setShowExportDialog(true)}
                    />
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bulk Import/Export Dialogs */}
      {showBulkActions && (
        <>
          <BulkImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
          <BulkExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
        </>
      )}

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si cierras ahora, se perderán estos cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive hover:bg-destructive/90">
              Descartar Cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
