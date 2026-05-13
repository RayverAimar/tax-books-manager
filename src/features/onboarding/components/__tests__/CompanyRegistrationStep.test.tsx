import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyRegistrationStep } from '../CompanyRegistrationStep';

describe('CompanyRegistrationStep', () => {
  it('valida RUC vacío', async () => {
    const onSubmit = vi.fn();
    render(<CompanyRegistrationStep onSubmit={onSubmit} onBack={() => undefined} isLoading={false} />);
    fireEvent.click(screen.getByText('Registrar Empresa'));
    expect(await screen.findByText(/RUC es obligatorio/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida RUC no numérico', async () => {
    render(<CompanyRegistrationStep onSubmit={() => Promise.resolve()} onBack={() => undefined} isLoading={false} />);
    fireEvent.change(screen.getByPlaceholderText(/12345678901/), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText(/Nombre/), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Registrar Empresa'));
    expect(await screen.findByText(/dígitos numéricos/)).toBeInTheDocument();
  });

  it('valida razón social corta', async () => {
    render(<CompanyRegistrationStep onSubmit={() => Promise.resolve()} onBack={() => undefined} isLoading={false} />);
    fireEvent.change(screen.getByPlaceholderText(/12345678901/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText(/Nombre/), { target: { value: 'AB' } });
    fireEvent.click(screen.getByText('Registrar Empresa'));
    expect(await screen.findByText(/al menos 3/)).toBeInTheDocument();
  });

  it('submit con datos válidos', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<CompanyRegistrationStep onSubmit={onSubmit} onBack={() => undefined} isLoading={false} />);
    fireEvent.change(screen.getByPlaceholderText(/12345678901/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText(/Nombre/), { target: { value: 'ACME SAC' } });
    fireEvent.click(screen.getByText('Registrar Empresa'));
    expect(onSubmit).toHaveBeenCalledWith({ ruc: '12345678901', businessName: 'ACME SAC' });
  });

  it('botón Atrás llama onBack', () => {
    const onBack = vi.fn();
    render(<CompanyRegistrationStep onSubmit={() => Promise.resolve()} onBack={onBack} isLoading={false} />);
    fireEvent.click(screen.getByText('Atrás'));
    expect(onBack).toHaveBeenCalled();
  });

  it('muestra "Registrando..." cuando isLoading', () => {
    render(<CompanyRegistrationStep onSubmit={() => Promise.resolve()} onBack={() => undefined} isLoading />);
    expect(screen.getByText(/Registrando/)).toBeInTheDocument();
  });
});
