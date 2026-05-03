import React, { useState } from 'react';
import { Building, Settings, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { CompanySettingsDialog } from './CompanySettingsDialog';

interface CompanyInfoProps {
  showActions?: boolean;
}

/**
 * Company Info Component
 * Displays current company information with optional action buttons
 * - Read-only in Sales/Purchases pages
 * - With Settings and Logout buttons in Dashboard
 */
export const CompanyInfo: React.FC<CompanyInfoProps> = ({ showActions = false }) => {
  const { company, isLoading } = useCompany();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const handleLogout = () => {
    // Clear active company and reload to show company selection page
    localStorage.removeItem('active_company_id');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  // Read-only version (Sales/Purchases pages)
  if (!showActions) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background min-h-[56px]">
        <Building className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium leading-tight">{company.businessName}</p>
          <p className="text-xs text-muted-foreground">RUC: {company.ruc}</p>
        </div>
      </div>
    );
  }

  // Dashboard version with action buttons
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Company Info (read-only) */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background min-h-[56px]">
          <Building className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium leading-tight">{company.businessName}</p>
            <p className="text-xs text-muted-foreground">RUC: {company.ruc}</p>
          </div>
        </div>

        {/* Settings Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-[56px] w-[56px] flex-shrink-0 [&_svg]:h-5 [&_svg]:w-5"
          onClick={() => setShowSettingsDialog(true)}
          title="Configuración de empresa"
        >
          <Settings />
        </Button>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-[56px] w-[56px] flex-shrink-0 [&_svg]:h-5 [&_svg]:w-5"
          onClick={handleLogout}
          title="Cambiar de empresa"
        >
          <LogOut />
        </Button>
      </div>

      {/* Settings Dialog */}
      <CompanySettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        showBulkActions={showActions}
      />
    </>
  );
};
