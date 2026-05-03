import { InvoiceListPage } from '@/shared/components/common/templates/InvoiceListPage';
import { SalesInvoiceForm } from '@/shared/components/common/forms/SalesInvoiceForm';
import { transformSalesFormData } from '@/features/sales/lib/sales-transform';

export function Sales() {
  return (
    <InvoiceListPage
      type="sales"
      title="Registro de Ventas"
      singularLabel="registro"
      pluralLabel="registros"
      addButtonLabel="Agregar Venta"
      dialogTitle="Nuevo Comprobante de Venta"
      dialogDescription="Complete los datos del comprobante. Los campos marcados con * son obligatorios."
      successMessage={{
        added: 'Venta agregada',
        addedDescription: 'La venta se agregó correctamente al registro.'
      }}
      FormComponent={SalesInvoiceForm}
      transformFormData={transformSalesFormData}
    />
  );
}
