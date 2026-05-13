import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/presentation/contexts/company.context', () => ({
  useCompany: () => ({ createCompany: vi.fn().mockResolvedValue({ id: 1 }) })
}));
vi.mock('@/features/onboarding/components/WelcomeStep', () => ({
  WelcomeStep: ({ onNext }: { onNext: () => void }) => <button onClick={onNext}>welcome-next</button>
}));
vi.mock('@/features/onboarding/components/CompanyRegistrationStep', () => ({
  CompanyRegistrationStep: () => <div data-testid="registration" />
}));
// framer-motion is heavy; stub it
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingFlow } from '../OnboardingFlow';

describe('OnboardingFlow', () => {
  it('avanza de WelcomeStep a registración', () => {
    render(<OnboardingFlow onComplete={() => undefined} />);
    expect(screen.getByText('welcome-next')).toBeInTheDocument();
    fireEvent.click(screen.getByText('welcome-next'));
    expect(screen.getByTestId('registration')).toBeInTheDocument();
  });
});
