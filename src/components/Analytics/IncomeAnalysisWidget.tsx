import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TrendingUp, TrendingDown, Wallet, Calendar, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface IncomeSourceData {
  source: string;
  amount: number;
  percentage: number;
  count: number;
}

interface IncomeStats {
  totalIncome: number;
  averageDaily: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  periodDays: number;
}

const INCOME_COLORS = [
  '#00ff41', // Green - Salary
  '#00d4ff', // Cyan - Freelance
  '#ff6b35', // Orange - Investments
  '#ffd700', // Gold - Business
  '#ff69b4', // Pink - Rental
  '#9370db', // Purple - Other
  '#20b2aa', // Teal - Bonuses
  '#ffa500', // Orange - Commissions
];

export const IncomeAnalysisWidget: React.FC = () => {
  const { transactions, baseCurrency } = useTransactionStore();
  
  // Period selection state
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  
  // Analysis data state
  const [incomeSourceData, setIncomeSourceData] = useState<IncomeSourceData[]>([]);
  const [incomeStats, setIncomeStats] = useState<IncomeStats>({
    totalIncome: 0,
    averageDaily: 0,
    trend: 'stable',
    trendPercentage: 0,
    periodDays: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Expandable sections state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'this-month':
        const thisMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const thisMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)); // Last day of current month
        return { start: thisMonthStart, end: thisMonthEnd };
      
      case 'last-month':
        const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
        return { start: lastMonthStart, end: lastMonthEnd };
      
      case 'this-year':
        const thisYearStart = new Date(Date.UTC(now.getFullYear(), 0, 1));
        const thisYearEnd = new Date(Date.UTC(now.getFullYear(), 11, 31));
        return { start: thisYearStart, end: thisYearEnd };
      
      case 'last-year':
        const lastYearStart = new Date(Date.UTC(now.getFullYear() - 1, 0, 1));
        const lastYearEnd = new Date(Date.UTC(now.getFullYear() - 1, 11, 31));
        return { start: lastYearStart, end: lastYearEnd };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: thisMonthStart, end: today };
      
      default:
        return { start: thisMonthStart, end: today };
    }
  };

  // Calculate income analysis
  const calculateIncomeAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      // Filter income transactions for the selected period
      const periodIncome = transactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transaction.type === 'income' && 
               transactionDate >= startStr && 
               transactionDate <= endStr;
      });

      console.log('🔍 Income Analysis Debug:');
      console.log('📅 Date range:', startStr, 'to', endStr);
      console.log('💰 Income in period:', periodIncome.length);
      console.log('💰 Total income transactions:', transactions.filter(t => t.type === 'income').length);

      // Use only period income, don't fallback to all transactions
      const transactionsToUse = periodIncome;

      // If no income in current period, show empty state
      if (periodIncome.length === 0) {
        setIncomeSourceData([]);
        setIncomeStats({
          totalIncome: 0,
          averageDaily: 0,
          trend: 'stable',
          trendPercentage: 0,
          periodDays: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        });
        setIsLoading(false);
        return;
      }

      // Convert amounts to base currency
      const convertedIncome = await Promise.all(
        transactionsToUse.map(async (transaction) => {
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          return {
            ...transaction,
            convertedAmount
          };
        })
      );

      // Group by income source
      const sourceMap = new Map<string, { amount: number; count: number }>();
      
      convertedIncome.forEach(transaction => {
        const existing = sourceMap.get(transaction.category) || { amount: 0, count: 0 };
        sourceMap.set(transaction.category, {
          amount: existing.amount + transaction.convertedAmount,
          count: existing.count + 1
        });
      });

      // Calculate total income
      const totalIncome = convertedIncome.reduce((sum, t) => sum + t.convertedAmount, 0);
      
      // Calculate period days (inclusive of both start and end dates)
      const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      // Calculate average daily
      const averageDaily = totalIncome / periodDays;
      
      // Calculate trend (compare with previous period)
      const previousPeriod = await calculatePreviousPeriodTrend(start, end, totalIncome);
      
      // Prepare income source data for pie chart
      const incomeSourceDataArray: IncomeSourceData[] = Array.from(sourceMap.entries())
        .map(([source, data]) => ({
          source,
          amount: data.amount,
          percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      setIncomeSourceData(incomeSourceDataArray);
      setIncomeStats({
        totalIncome,
        averageDaily,
        trend: previousPeriod.trend,
        trendPercentage: previousPeriod.percentage,
        periodDays
      });
      
    } catch (error) {
      console.error('Error calculating income analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate trend by comparing with previous period
  const calculatePreviousPeriodTrend = async (start: Date, end: Date, currentTotal: number) => {
    try {
      const periodLength = end.getTime() - start.getTime();
      const previousStart = new Date(start.getTime() - periodLength);
      const previousEnd = new Date(end.getTime() - periodLength);
      
      const previousIncome = transactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transaction.type === 'income' && 
               transactionDate >= previousStart.toISOString().split('T')[0] && 
               transactionDate <= previousEnd.toISOString().split('T')[0];
      });

      const previousConverted = await Promise.all(
        previousIncome.map(async (transaction) => {
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          return convertedAmount;
        })
      );

      const previousTotal = previousConverted.reduce((sum, amount) => sum + amount, 0);
      
      if (previousTotal === 0) {
        return { trend: 'stable' as const, percentage: 0 };
      }
      
      const percentage = ((currentTotal - previousTotal) / previousTotal) * 100;
      
      if (Math.abs(percentage) < 5) {
        return { trend: 'stable' as const, percentage };
      }
      
      return {
        trend: percentage > 0 ? 'up' as const : 'down' as const,
        percentage: Math.abs(percentage)
      };
    } catch (error) {
      console.error('Error calculating trend:', error);
      return { trend: 'stable' as const, percentage: 0 };
    }
  };

  // Update analysis when period changes
  useEffect(() => {
    calculateIncomeAnalysis();
  }, [selectedPeriod, customStartDate, customEndDate, transactions, baseCurrency]);

  // Handle custom date changes
  const handleCustomDateChange = (start: Date | null, end: Date | null) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (start && end) {
      setSelectedPeriod('custom');
    }
  };

  // Toggle source expansion
  const toggleSourceExpansion = (source: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(source)) {
      newExpanded.delete(source);
    } else {
      newExpanded.add(source);
    }
    setExpandedSources(newExpanded);
  };

  // Get transactions for a specific income source
  const getSourceTransactions = async (source: string) => {
    const { start, end } = getDateRange();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    const sourceIncome = transactions.filter(transaction => {
      const transactionDate = transaction.date;
      return transaction.type === 'income' && 
             transaction.category === source &&
             transactionDate >= startStr && 
             transactionDate <= endStr;
    });

    // Convert amounts to base currency
    const convertedIncome = await Promise.all(
      sourceIncome.map(async (transaction) => {
        const convertedAmount = await currencyService.convertAmount(
          transaction.amount,
          transaction.currency,
          baseCurrency
        );
        return {
          ...transaction,
          convertedAmount
        };
      })
    );

    return convertedIncome.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{formatIncomeSourceName(data.source)}</p>
          <p className="text-gray-300">
            {formatCurrency(data.amount, baseCurrency)}
          </p>
          <p className="text-gray-400 text-sm">
            {data.percentage.toFixed(1)}% • {data.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  // Format income source names to be human-readable
  const formatIncomeSourceName = (source: string): string => {
    const sourceMap: { [key: string]: string } = {
      'freelance-income': 'Freelance Income',
      'salary': 'Salary',
      'interest': 'Interest',
      'other': 'Other Income',
      'sold-items': 'Sold Items',
      'business': 'Business Income',
      'rental': 'Rental Income',
      'bonus': 'Bonuses',
      'commission': 'Commissions',
      'investment': 'Investment Returns'
    };

    // Return mapped name or format the source name
    if (sourceMap[source]) {
      return sourceMap[source];
    }

    // Default formatting: capitalize first letter of each word, replace dashes with spaces
    return source
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Component for displaying source transactions
  const SourceTransactions = ({ source }: { source: string }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (expandedSources.has(source)) {
        setLoading(true);
        getSourceTransactions(source).then(data => {
          setTransactions(data);
          setLoading(false);
        });
      }
    }, [source, expandedSources]);

    if (!expandedSources.has(source)) return null;

    return (
      <div className="mt-4 ml-8 bg-gradient-to-r from-surface/80 to-background/80 rounded-xl p-4 border border-border-light">
        <div className="text-sm text-highlight mb-3 font-medium">Transactions in {formatIncomeSourceName(source)}:</div>
        {loading ? (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-highlight"></div>
            Loading...
          </div>
        ) : (
          <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center text-sm bg-background/50 rounded-lg p-3 border border-border">
                <div>
                  <div className="text-white font-medium">{transaction.description}</div>
                  <div className="text-gray-400 text-xs">{new Date(transaction.date).toLocaleDateString()}</div>
                </div>
                <div className="text-income font-bold">
                  {formatCurrency(transaction.convertedAmount, baseCurrency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-income/10 rounded-lg border border-income/20">
            <Wallet className="w-6 h-6 text-income" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Income Analysis</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              // Clear custom dates when selecting predefined periods
              if (e.target.value !== 'custom') {
                setCustomStartDate(null);
                setCustomEndDate(null);
              }
            }}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm transition-colors flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Custom Date Range - Only show when custom is selected */}
      {selectedPeriod === 'custom' && (
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-400" />
          <DatePicker
            selected={customStartDate}
            onChange={(date) => handleCustomDateChange(date, customEndDate)}
            selectsStart
            startDate={customStartDate}
            endDate={customEndDate}
            placeholderText="Start Date"
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm w-40"
            dateFormat="MMM dd, yyyy"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={50}
            scrollableYearDropdown
          />
          <span className="text-gray-400">to</span>
          <DatePicker
            selected={customEndDate}
            onChange={(date) => handleCustomDateChange(customStartDate, date)}
            selectsEnd
            startDate={customStartDate}
            endDate={customEndDate}
            placeholderText="End Date"
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm w-40"
            dateFormat="MMM dd, yyyy"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={50}
            scrollableYearDropdown
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats - Always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-surface to-background border border-income/30 rounded-xl p-5 hover:border-income/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-income rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Total Income</div>
              </div>
              <div className="text-white text-xl font-bold">
                {formatCurrency(incomeStats.totalIncome, baseCurrency)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-highlight/30 rounded-xl p-5 hover:border-highlight/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-highlight rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Daily Average</div>
              </div>
              <div className="text-white text-xl font-bold">
                {formatCurrency(incomeStats.averageDaily, baseCurrency)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-income/30 rounded-xl p-5 hover:border-income/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-income rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Trend</div>
              </div>
              <div className="flex items-center gap-2">
                {incomeStats.trend === 'up' && (
                  <TrendingUp className="w-5 h-5 text-income" />
                )}
                {incomeStats.trend === 'down' && (
                  <TrendingDown className="w-5 h-5 text-expense" />
                )}
                {incomeStats.trend === 'stable' && (
                  <div className="w-5 h-5 bg-income rounded-full"></div>
                )}
                <span className={`text-xl font-bold ${incomeStats.trend === 'up' ? 'text-income' : 'text-expense'}`}>
                  {incomeStats.trendPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-warning/30 rounded-xl p-5 hover:border-warning/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Period</div>
              </div>
              <div className="text-white text-xl font-bold">{incomeStats.periodDays} days</div>
            </div>
          </div>

          {/* Expandable Content */}
          {isExpanded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Pie Chart */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-income rounded-full"></div>
                  <h3 className="text-xl font-semibold text-white">Income Sources</h3>
                </div>
                <div className="h-[28rem] bg-gradient-to-br from-surface via-background to-surface/80 rounded-xl border border-income/20 p-6 relative overflow-hidden shadow-2xl">
                  {/* Enhanced Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-6 left-6 w-40 h-40 bg-gradient-to-br from-income to-income/50 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-6 right-6 w-32 h-32 bg-gradient-to-br from-highlight to-highlight/50 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-warning to-warning/50 rounded-full blur-3xl"></div>
                  </div>
                  
                  {/* Subtle Grid Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full" style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                  
                  {incomeSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* 3D Gradient Definitions */}
                        <defs>
                          {incomeSourceData.map((entry, index) => {
                            const baseColor = INCOME_COLORS[index % INCOME_COLORS.length];
                            return (
                              <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                                <stop offset="30%" stopColor={baseColor} stopOpacity={0.9} />
                                <stop offset="70%" stopColor={baseColor} stopOpacity={0.7} />
                                <stop offset="100%" stopColor={baseColor} stopOpacity={0.5} />
                              </linearGradient>
                            );
                          })}
                        </defs>
                        <Pie
                          data={incomeSourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="amount"
                          label={false}
                          stroke="none"
                          strokeWidth={0}
                        >
                          {incomeSourceData.map((entry, index) => {
                            const baseColor = INCOME_COLORS[index % INCOME_COLORS.length];
                            const isActive = activeIndex === index;
                            
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#gradient-${index})`}
                                style={{
                                  filter: `
                                    drop-shadow(0 16px 32px rgba(0, 0, 0, 0.7)) 
                                    drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))
                                    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))
                                    drop-shadow(0 0 0 2px rgba(255, 255, 255, 0.15))
                                    drop-shadow(inset 0 2px 4px rgba(255, 255, 255, 0.1))
                                  `,
                                  transform: isActive ? 'scale(1.25) translateZ(10px)' : 'scale(1) translateZ(0px)',
                                  transformOrigin: 'center',
                                  transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                  cursor: 'pointer',
                                  perspective: '1000px',
                                  transformStyle: 'preserve-3d'
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-gray-400 text-sm">No income breakdown to show yet</div>
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>

              {/* Right Column: All Income Sources */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-income rounded-full"></div>
                    <h3 className="text-xl font-semibold text-white">Income Overview</h3>
                  </div>
                  <button
                    onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                    className="text-highlight hover:text-highlight/80 text-sm transition-colors flex items-center gap-1 bg-highlight/10 hover:bg-highlight/20 px-3 py-1 rounded-lg border border-highlight/20"
                  >
                    {isSourcesExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show All
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[28rem] overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
                  {incomeSourceData.length > 0 ? (
                    (isSourcesExpanded ? incomeSourceData : incomeSourceData.slice(0, 5)).map((source, index) => (
                      <div key={source.source}>
                        <div 
                          className="flex items-center justify-between bg-gradient-to-r from-surface to-background border border-border-light rounded-xl p-4 cursor-pointer hover:border-highlight/30 hover:bg-gradient-to-r hover:from-surface/80 hover:to-background/80 transition-all duration-300 group"
                          onClick={() => toggleSourceExpansion(source.source)}
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-4 h-4 rounded-full shadow-lg"
                              style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}
                            ></div>
                            <div>
                              <div className="text-white font-semibold group-hover:text-highlight transition-colors">{formatIncomeSourceName(source.source)}</div>
                              <div className="text-gray-400 text-sm">{source.count} transactions</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-white font-bold text-lg">
                                {formatCurrency(source.amount, baseCurrency)}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {source.percentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-highlight group-hover:text-highlight/80 transition-colors">
                              {expandedSources.has(source.source) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>
                        <SourceTransactions source={source.source} />
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="text-gray-400 text-sm">Your transactions list is empty</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
