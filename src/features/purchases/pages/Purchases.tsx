import { InvoiceListPage } from '@/shared/components/common/templates/InvoiceListPage';
import { PurchaseInvoiceForm } from '@/shared/components/common/forms/PurchaseInvoiceForm';
import { transformPurchaseFormData } from '@/features/purchases/lib/purchases-transform';

export function Purchases() {
  return (
    <InvoiceListPage
      type="purchases"
      title="Registro de Compras"
      singularLabel="registro"
      pluralLabel="registros"
      addButtonLabel="Agregar Compra"
      dialogTitle="Nuevo Comprobante de Compra"
      dialogDescription="Complete los datos del comprobante. Los campos marcados con * son obligatorios."
      successMessage={{
        added: 'Compra agregada',
        addedDescription: 'El comprobante se agregó correctamente al registro.'
      }}
      FormComponent={PurchaseInvoiceForm}
      transformFormData={transformPurchaseFormData}
    />
  );
}
