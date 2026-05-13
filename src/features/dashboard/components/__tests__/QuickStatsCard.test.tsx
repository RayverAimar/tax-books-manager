import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStatsCard } from '../QuickStatsCard';

describe('QuickStatsCard', () => {
  it('renderiza título y valor', () => {
    render(<QuickStatsCard title="Total" value="S/ 1,000" />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('S/ 1,000')).toBeInTheDocument();
  });

  it('renderiza subtitle opcional', () => {
    render(<QuickStatsCard title="X" value="1" subtitle="hace 2 meses" />);
    expect(screen.getByText('hace 2 meses')).toBeInTheDocument();
  });

  it('muestra trend positivo', () => {
    render(<QuickStatsCard title="X" value="1" trend={{ value: 100, percentage: 15.5, isPositive: true }} />);
    expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it('trend negativo con flecha abajo', () => {
    render(
      <QuickStatsCard
        title="X"
        value="1"
        trend={{ value: -10, percentage: -5, isPositive: false }}
        comparisonText="año anterior"
      />
    );
    expect(screen.getByText(/↓/)).toBeInTheDocument();
    expect(screen.getByText(/año anterior/)).toBeInTheDocument();
  });
});
