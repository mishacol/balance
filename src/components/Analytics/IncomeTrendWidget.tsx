import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TrendingUp, Calendar } from 'lucide-react';

interface IncomeTrendData {
  [key: string]: string | number | Record<string, number>;
  income: number;
  monthlyAverage?: number;
  sources?: Record<string, number>;
}

interface IncomeTrendWidgetProps {
  initialPeriod?: string;
  initialCustomStartDate?: Date | null;
  initialCustomEndDate?: Date | null;
}

export const IncomeTrendWidget: React.FC<IncomeTrendWidgetProps> = ({ 
  initialPeriod = 'this-year',
  initialCustomStartDate = null,
  initialCustomEndDate = null
}) => {
  const { transactions, baseCurrency } = useTransactionStore();
  
  // Period selection state
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(initialCustomStartDate);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(initialCustomEndDate);
  
  // Source filter state
  const [selectedSource, setSelectedSource] = useState<string>('');
  
  // Chart data state
  const [chartData, setChartData] = useState<IncomeTrendData[]>([]);
  const [dataKey, setDataKey] = useState('month');
  const [isLoading, setIsLoading] = useState(false);
  const [monthsWithRecords, setMonthsWithRecords] = useState(0);

  // Get available income sources from transactions
  const availableSources = useMemo(() => {
    const sourceSet = new Set<string>();
    transactions.forEach(transaction => {
      if (transaction.type === 'income' && transaction.category) {
        sourceSet.add(transaction.category);
      }
    });
    return Array.from(sourceSet).sort();
  }, [transactions]);

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'this-month':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: thisMonthStart, end: thisMonthEnd };
      
      case 'last-month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };
      
      case 'this-year':
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        const thisYearEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: thisYearStart, end: thisYearEnd };
      
      case 'last-year':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return { start: lastYearStart, end: lastYearEnd };
      
      case 'all-time':
        const allTimeStart = new Date(2013, 3, 1); // April 1, 2013
        const allTimeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: allTimeStart, end: allTimeEnd };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        const fallbackYearStart = new Date(now.getFullYear(), 0, 1);
        return { start: fallbackYearStart, end: today };
      
      default:
        const defaultYearStart = new Date(now.getFullYear(), 0, 1);
        return { start: defaultYearStart, end: today };
    }
  };

  // Generate chart data with dynamic aggregation
  const generateChartData = async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = getDateRange();
      const startStr = start.toLocaleDateString('en-CA');
      const endStr = end.toLocaleDateString('en-CA');
      
      // Filter income transactions for the selected period and source
      const periodIncome = transactions.filter(transaction => {
        const transactionDate = transaction.date;
        const matchesType = transaction.type === 'income';
        const matchesDate = transactionDate >= startStr && transactionDate <= endStr;
        const matchesSource = !selectedSource || transaction.category === selectedSource;
        
        return matchesType && matchesDate && matchesSource;
      });

      if (periodIncome.length === 0) {
        setChartData([]);
        setMonthsWithRecords(0);
        setIsLoading(false);
        return;
      }

      // Calculate date range in days
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine aggregation level based on date range
      // Always use monthly for periods > 31 days (never use yearly)
      let aggregationLevel: 'daily' | 'weekly' | 'monthly';
      let groupKey: string;
      
      if (daysDiff <= 31) {
        aggregationLevel = 'daily';
        groupKey = 'date';
      } else if (daysDiff <= 93) {
        aggregationLevel = 'weekly';
        groupKey = 'week';
      } else {
        // For periods > 93 days, always use monthly aggregation
        aggregationLevel = 'monthly';
        groupKey = 'month';
      }
      
      setDataKey(groupKey);
      
      // Group transactions by aggregation level and track sources
      const groupedData: Record<string, { total: number; sources: Record<string, number> }> = {};
      
      // Track unique months with records
      const uniqueMonths = new Set<string>();
      
      // Convert all transactions to base currency and group them
      for (const transaction of periodIncome) {
        const date = new Date(transaction.date);
        let groupKeyValue: string;
        
        switch (aggregationLevel) {
          case 'daily':
            groupKeyValue = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            groupKeyValue = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            groupKeyValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            groupKeyValue = date.toISOString().split('T')[0];
        }
        
        if (!groupedData[groupKeyValue]) {
          groupedData[groupKeyValue] = { total: 0, sources: {} };
        }
        
        const convertedAmount = await currencyService.convertAmount(
          transaction.amount,
          transaction.currency,
          baseCurrency
        );
        
        groupedData[groupKeyValue].total += convertedAmount;
        
        // Track unique months (YYYY-MM format)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        uniqueMonths.add(monthKey);
        
        // Track source (only if showing general trend, not when filtering by source)
        if (!selectedSource) {
          const source = transaction.category || 'other';
          if (!groupedData[groupKeyValue].sources[source]) {
            groupedData[groupKeyValue].sources[source] = 0;
          }
          groupedData[groupKeyValue].sources[source] += convertedAmount;
        }
      }
      
      // Store the count of months with records
      setMonthsWithRecords(uniqueMonths.size);
      
      // Convert to array format for recharts
      const chartDataArray = Object.entries(groupedData)
        .map(([key, data]) => {
          let label = key;
          
          // Format labels for better readability
          if (aggregationLevel === 'monthly') {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } else if (aggregationLevel === 'weekly') {
            const date = new Date(key);
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (aggregationLevel === 'daily') {
            const date = new Date(key);
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          
          return {
            [groupKey]: label,
            income: data.total,
            sources: data.sources,
            _sortKey: key // Keep original key for sorting
          };
        })
        .sort((a, b) => {
          // For monthly aggregation, sort by original key
          if (aggregationLevel === 'monthly') {
            const aKey = String(a._sortKey);
            const bKey = String(b._sortKey);
            const [aYear, aMonth] = aKey.split('-');
            const [bYear, bMonth] = bKey.split('-');
            const aDate = new Date(parseInt(aYear), parseInt(aMonth) - 1);
            const bDate = new Date(parseInt(bYear), parseInt(bMonth) - 1);
            return aDate.getTime() - bDate.getTime();
          }
          // For other aggregations, sort by original key (date string)
          return new Date(String(a._sortKey)).getTime() - new Date(String(b._sortKey)).getTime();
        })
        .map(({ _sortKey, ...rest }) => rest); // Remove _sortKey from final data
      
      setChartData(chartDataArray);
    } catch (error) {
      console.error('Error generating income trend chart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update chart when period or source changes
  useEffect(() => {
    generateChartData();
  }, [selectedPeriod, customStartDate, customEndDate, selectedSource, transactions, baseCurrency]);

  // Handle custom date changes
  const handleCustomDateChange = (start: Date | null, end: Date | null) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (start && end) {
      setSelectedPeriod('custom');
    }
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

  // Custom tooltip for line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const incomePayload = payload.find((p: any) => p.dataKey === 'income');
      const dataPoint = incomePayload?.payload;
      const sources = dataPoint?.sources as Record<string, number> | undefined;
      
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-white font-medium mb-2">{label}</p>
          {incomePayload && (
            <p className="text-income font-bold text-lg mb-2">
              Total: {formatCurrency(incomePayload.value, baseCurrency)}
            </p>
          )}
          {sources && Object.keys(sources).length > 0 && (
            <div className="border-t border-gray-600 pt-2 mt-2">
              <p className="text-gray-400 text-xs mb-1">Sources:</p>
              <div className="space-y-1">
                {Object.entries(sources)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, amount]) => (
                    <div key={source} className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">{formatIncomeSourceName(source)}:</span>
                      <span className="text-income font-semibold ml-2">
                        {formatCurrency(amount as number, baseCurrency)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate total income and period info
  const totalIncome = chartData.reduce((sum, item) => sum + (item.income as number), 0);
  
  // Calculate period duration in years and months
  const getPeriodDuration = () => {
    const { start, end } = getDateRange();
    const startDate = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
    
    // Calculate total months between dates (inclusive of both start and end)
    const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth()) + 1;
    
    const finalYears = Math.floor(totalMonths / 12);
    const finalMonths = totalMonths % 12;
    
    return { years: finalYears, months: finalMonths, totalMonths };
  };
  
  const periodDuration = getPeriodDuration();
  // Calculate monthly average based on months that actually have records
  const monthlyAverage = monthsWithRecords > 0 ? totalIncome / monthsWithRecords : 0;
  
  // Format period duration string
  const formatPeriodDuration = () => {
    const parts: string[] = [];
    if (periodDuration.years > 0) {
      parts.push(`${periodDuration.years} ${periodDuration.years === 1 ? 'year' : 'years'}`);
    }
    if (periodDuration.months > 0) {
      parts.push(`${periodDuration.months} ${periodDuration.months === 1 ? 'month' : 'months'}`);
    }
    if (parts.length === 0) {
      return '1 month';
    }
    return parts.join(' ');
  };
  
  // Add monthly average to chart data
  const chartDataWithAverage = chartData.map(item => ({
    ...item,
    monthlyAverage: monthlyAverage
  }));

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-income/10 rounded-lg border border-income/20">
            <TrendingUp className="w-6 h-6 text-income" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Income</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            {availableSources.map(source => (
              <option key={source} value={source}>
                {formatIncomeSourceName(source)}
              </option>
            ))}
          </select>
          
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
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
            <option value="all-time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>
      
      {/* Custom Date Range */}
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-surface to-background border border-income/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-income rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Total Income</div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(totalIncome, baseCurrency)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-surface to-background border border-highlight/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-highlight rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">
                  Monthly Average
                </div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(monthlyAverage, baseCurrency)}
              </div>
            </div>
          </div>

          {/* Chart - Always visible */}
          <div className="bg-gradient-to-br from-surface via-background to-surface/80 rounded-xl border border-income/20 p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartDataWithAverage} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis 
                    dataKey={dataKey} 
                    axisLine={{ stroke: '#1f1f1f' }}
                    tick={{ fill: '#888888', fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888888', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value, baseCurrency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#00ff41" 
                    strokeWidth={3}
                    dot={{ fill: '#00ff41', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="monthlyAverage" 
                    stroke="#00d9ff" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-gray-400 text-sm">No income data to display</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

