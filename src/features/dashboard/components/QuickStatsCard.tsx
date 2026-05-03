import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';

/**
 * Quick Stats Card Props
 */
interface QuickStatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
  comparisonText?: string;
}

/**
 * Quick Stats Card Component
 * Shows a single statistic with trend comparison
 */
export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  comparisonText
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                {trend.isPositive ? '↑' : '↓'} {trend.percentage >= 0 ? '+' : ''}{trend.percentage.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">
                vs {comparisonText || 'periodo anterior'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};