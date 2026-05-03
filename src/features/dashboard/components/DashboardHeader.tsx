import React from 'react';
import { BookOpen } from 'lucide-react';
import { CompanyInfo } from './CompanyInfo';

/**
 * Dashboard Header Component
 * Displays dashboard title with company info and action buttons
 */
export const DashboardHeader: React.FC = () => {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: App Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Libros Electrónicos</h1>
            <p className="text-xs text-muted-foreground">Panel de Control</p>
          </div>
        </div>

        {/* Right: Company Info */}
        <div className="flex items-center gap-4">
          <CompanyInfo showActions={true} />
        </div>
      </div>
    </header>
  );
};
