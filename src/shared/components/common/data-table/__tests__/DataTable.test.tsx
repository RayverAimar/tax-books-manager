import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Nombre' },
  { id: 'amount', accessorKey: 'amount', header: 'Monto' }
];

describe('DataTable (smoke)', () => {
  it('renderiza headers y filas básicas', () => {
    render(<DataTable columns={columns} data={[{ id: 1, name: 'A', amount: 100 }]} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Monto')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('muestra mensaje "No hay datos" cuando data está vacío', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText(/No hay registros para mostrar/)).toBeInTheDocument();
  });

  it('renderiza con totalsConfig sin crash', () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: 1, name: 'A', amount: 100 }]}
        totalsConfig={[
          {
            columnId: 'amount',
            calculate: (d) => (d as Row[]).reduce((s, r) => s + r.amount, 0)
          }
        ]}
      />
    );
    expect(screen.getByText(/TOTAL/i)).toBeInTheDocument();
  });

  it('enableSelection=false oculta checkboxes', () => {
    render(<DataTable columns={columns} data={[{ id: 1, name: 'A', amount: 100 }]} enableSelection={false} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('renderiza muchas filas (virtualization)', () => {
    const big = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, name: `R${i}`, amount: i }));
    render(<DataTable columns={columns} data={big} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });
});
