import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeStep } from '../WelcomeStep';

describe('WelcomeStep', () => {
  it('renderiza título y botón comenzar', () => {
    const onNext = vi.fn();
    render(<WelcomeStep onNext={onNext} />);
    expect(screen.getByText(/¡Bienvenido/)).toBeInTheDocument();
    expect(screen.getByText('Comenzar')).toBeInTheDocument();
  });

  it('click en Comenzar llama onNext', () => {
    const onNext = vi.fn();
    render(<WelcomeStep onNext={onNext} />);
    fireEvent.click(screen.getByText('Comenzar'));
    expect(onNext).toHaveBeenCalled();
  });
});
