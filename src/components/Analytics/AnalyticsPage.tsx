import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SpendingAnalysisWidget } from './SpendingAnalysisWidget';
import { IncomeAnalysisWidget } from './IncomeAnalysisWidget';
import { InvestmentAnalysisWidget } from './InvestmentAnalysisWidget';

export const AnalyticsPage: React.FC = () => {
  const { widget } = useParams<{ widget?: string }>();
  const [searchParams] = useSearchParams();
  
  // Extract date range parameters from URL
  const period = searchParams.get('period') || 'this-month';
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  
  const customStartDate = startDate ? new Date(startDate + 'T00:00:00') : null;
  const customEndDate = endDate ? new Date(endDate + 'T00:00:00') : null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
      </div>
      
      <SpendingAnalysisWidget 
        autoExpand={widget === 'expenses'} 
        initialPeriod={period}
        initialCustomStartDate={customStartDate}
        initialCustomEndDate={customEndDate}
      />
      <IncomeAnalysisWidget 
        autoExpand={widget === 'income'} 
        initialPeriod={period}
        initialCustomStartDate={customStartDate}
        initialCustomEndDate={customEndDate}
      />
      <InvestmentAnalysisWidget 
        autoExpand={widget === 'investments'} 
        initialPeriod={period}
        initialCustomStartDate={customStartDate}
        initialCustomEndDate={customEndDate}
      />
    </div>
  );
};
