import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SpendingAnalysisWidget } from './SpendingAnalysisWidget';
import { IncomeAnalysisWidget } from './IncomeAnalysisWidget';
import { InvestmentAnalysisWidget } from './InvestmentAnalysisWidget';
import { IncomeTrendWidget } from './IncomeTrendWidget';
import { ExpenseTrendWidget } from './ExpenseTrendWidget';
import { ExpenseForecastWidget } from './ExpenseForecastWidget';
import { SavingsProjectionWidget } from './SavingsProjectionWidget';
import { FactsWidget } from './FactsWidget';

type TabType = 'overview' | 'trends' | 'forecasts' | 'facts';

export const AnalyticsPage: React.FC = () => {
  const { widget } = useParams<{ widget?: string }>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
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
      
      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'overview'
                  ? 'border-highlight text-highlight'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }
            `}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'trends'
                  ? 'border-highlight text-highlight'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }
            `}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'forecasts'
                  ? 'border-highlight text-highlight'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }
            `}
          >
            Forecasts
          </button>
          <button
            onClick={() => setActiveTab('facts')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'facts'
                  ? 'border-highlight text-highlight'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }
            `}
          >
            Facts
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
      )}
      
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <IncomeTrendWidget 
            initialPeriod={period}
            initialCustomStartDate={customStartDate}
            initialCustomEndDate={customEndDate}
          />
          <ExpenseTrendWidget 
            initialPeriod={period}
            initialCustomStartDate={customStartDate}
            initialCustomEndDate={customEndDate}
          />
        </div>
      )}
      
      {activeTab === 'forecasts' && (
        <div className="space-y-6">
          <ExpenseForecastWidget />
          <SavingsProjectionWidget />
        </div>
      )}
      
      {activeTab === 'facts' && (
        <div className="space-y-6">
          <FactsWidget />
        </div>
      )}
    </div>
  );
};
