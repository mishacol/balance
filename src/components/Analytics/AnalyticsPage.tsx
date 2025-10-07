import React from 'react';
import { SpendingAnalysisWidget } from './SpendingAnalysisWidget';
import { IncomeAnalysisWidget } from './IncomeAnalysisWidget';
import { InvestmentAnalysisWidget } from './InvestmentAnalysisWidget';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
      </div>
      
      <SpendingAnalysisWidget />
      <IncomeAnalysisWidget />
      <InvestmentAnalysisWidget />
    </div>
  );
};
