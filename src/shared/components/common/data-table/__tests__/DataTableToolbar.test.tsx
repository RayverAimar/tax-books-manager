import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { DataTableToolbar } from '../DataTableToolbar';

function makeTable(filteredCount = 0) {
  return {
    getFilteredRowModel: () => ({ rows: new Array(filteredCount) })
  } as unknown as Parameters<typeof DataTableToolbar>[0]['table'];
}

describe('DataTableToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('actualiza globalFilter tras debounce de 300ms', () => {
    const setFilter = vi.fn();
    render(<DataTableToolbar table={makeTable()} globalFilter="" setGlobalFilter={setFilter} selectedRows={0} />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: 'abc' } });
    // No llamó todavía
    expect(setFilter).not.toHaveBeenCalledWith('abc');
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(setFilter).toHaveBeenCalledWith('abc');
  });

  it('botón limpiar aparece y resetea de inmediato', () => {
    const setFilter = vi.fn();
    render(<DataTableToolbar table={makeTable(2)} globalFilter="x" setGlobalFilter={setFilter} selectedRows={0} />);
    expect(screen.getByText(/2 resultados/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Limpiar filtro'));
    expect(setFilter).toHaveBeenCalledWith('');
  });

  it('muestra botón Descartar cuando hay selección', () => {
    const onDiscard = vi.fn();
    render(
      <DataTableToolbar
        table={makeTable()}
        globalFilter=""
        setGlobalFilter={() => undefined}
        selectedRows={3}
        onDiscardSelected={onDiscard}
      />
    );
    fireEvent.click(screen.getByText(/Descartar 3/));
    expect(onDiscard).toHaveBeenCalled();
  });
});
