import { describe, it, expect, vi } from 'vitest';

vi.mock('../CompanyInfo', () => ({
  CompanyInfo: () => <div data-testid="company-info" />
}));

import { render, screen } from '@testing-library/react';
import { DashboardHeader } from '../DashboardHeader';

describe('DashboardHeader', () => {
  it('renderiza título y CompanyInfo', () => {
    render(<DashboardHeader />);
    expect(screen.getByText('Libros Electrónicos')).toBeInTheDocument();
    expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    expect(screen.getByTestId('company-info')).toBeInTheDocument();
  });
});
