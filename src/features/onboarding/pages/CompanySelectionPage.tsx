import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { useCompany } from '@/core/presentation/contexts/company.context';
import { AddCompanyFlow } from '../components/AddCompanyFlow';
import { setActiveCompanyId } from '@/shared/lib/storage/local-storage';
import type { Company } from '@/core/domain/entities/company.entity';

/**
 * Company Selection Page
 * Shows list of companies to select from or add a new one
 */
export const CompanySelectionPage: React.FC = () => {
  const { companies, isLoading } = useCompany();
  const [showAddCompany, setShowAddCompany] = useState(false);

  /**
   * Handle company selection
   */
  const handleSelectCompany = (company: Company) => {
    setActiveCompanyId(company.id);
    window.location.reload();
  };

  /**
   * Handle add company completion
   */
  const handleAddCompanyComplete = () => {
    setShowAddCompany(false);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div
        className={
          'flex h-screen items-center justify-center bg-gradient-to-br ' +
          'from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'
        }
      >
        <div className="text-center">
          <div
            className={
              'mx-auto mb-4 h-8 w-8 animate-spin rounded-full ' + 'border-4 border-primary border-t-transparent'
            }
          />
          <p className="text-sm text-muted-foreground">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg"
          >
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Selecciona una Empresa</CardTitle>
                <CardDescription>Elige una empresa para acceder al sistema o crea una nueva</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Company List */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {companies.map((company, index) => (
                      <motion.div
                        key={company.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Button
                          variant="outline"
                          className={
                            'w-full h-auto py-4 px-4 justify-between ' +
                            'hover:bg-accent hover:border-primary transition-all'
                          }
                          onClick={() => handleSelectCompany(company)}
                        >
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <div
                              className={
                                'flex h-10 w-10 items-center justify-center ' + 'rounded-lg bg-primary/10 flex-shrink-0'
                              }
                            >
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{company.businessName}</p>
                              <p className="text-xs text-muted-foreground mt-1">RUC: {company.ruc}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add New Company Button */}
                <div className="pt-4 border-t">
                  <Button variant="default" className="w-full gap-2" onClick={() => setShowAddCompany(true)}>
                    <Plus className="h-4 w-4" />
                    Agregar Nueva Empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Add Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <AddCompanyFlow onComplete={handleAddCompanyComplete} onCancel={() => setShowAddCompany(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
