import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface CategoryForecast {
  category: string;
  projectedAmount: number;
  averageAmount: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface ExpenseForecastWidgetProps {
  forecastPeriod?: 'next-month' | 'next-quarter';
}

export const ExpenseForecastWidget: React.FC<ExpenseForecastWidgetProps> = ({ 
  forecastPeriod = 'next-month'
}) => {
  const { transactions, baseCurrency } = useTransactionStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'next-month' | 'next-quarter'>(forecastPeriod);
  const [forecastData, setForecastData] = useState<CategoryForecast[]>([]);
  const [totalProjected, setTotalProjected] = useState(0);
  const [totalAverage, setTotalAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate forecast based on historical data
  useEffect(() => {
    let isMounted = true;
    
    const calculateForecast = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Look back 6 months for historical data
        const lookbackMonths = 6;
        const historicalStart = new Date(now.getFullYear(), now.getMonth() - lookbackMonths, 1);
        const historicalEnd = new Date(now.getFullYear(), now.getMonth(), 0); // End of last month
        
        const historicalStartStr = historicalStart.toLocaleDateString('en-CA');
        const historicalEndStr = historicalEnd.toLocaleDateString('en-CA');
        
        // Filter expense transactions from historical period
        const historicalExpenses = transactions.filter(transaction => {
          const transactionDate = transaction.date;
          return transaction.type === 'expense' && 
                 transactionDate >= historicalStartStr && 
                 transactionDate <= historicalEndStr;
        });

        if (historicalExpenses.length === 0) {
          if (!isMounted) return;
          setForecastData([]);
          setTotalProjected(0);
          setTotalAverage(0);
          setIsLoading(false);
          return;
        }

        // Group expenses by category and month
        const categoryMonthlyData: Record<string, Record<string, number>> = {};
        
        for (const transaction of historicalExpenses) {
          if (!isMounted) return;
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!categoryMonthlyData[transaction.category]) {
            categoryMonthlyData[transaction.category] = {};
          }
          
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          
          if (!categoryMonthlyData[transaction.category][monthKey]) {
            categoryMonthlyData[transaction.category][monthKey] = 0;
          }
          categoryMonthlyData[transaction.category][monthKey] += convertedAmount;
        }

        // Calculate average per month for each category
        const categoryAverages: Record<string, number> = {};
        const categoryProjections: Record<string, number> = {};
        
        for (const [category, monthlyData] of Object.entries(categoryMonthlyData)) {
          const monthlyAmounts = Object.values(monthlyData).filter(amount => amount > 0);
          if (monthlyAmounts.length > 0) {
            const average = monthlyAmounts.reduce((sum, amount) => sum + amount, 0) / monthlyAmounts.length;
            categoryAverages[category] = average;
            
            // Project based on recent trend (weight recent months more)
            // Sort months chronologically and take last 3
            const sortedMonths = Object.keys(monthlyData).sort();
            const recentMonths = sortedMonths.slice(-3).map(month => monthlyData[month]).filter(amount => amount > 0);
            if (recentMonths.length > 0) {
              const recentAverage = recentMonths.reduce((sum, amount) => sum + amount, 0) / recentMonths.length;
              // Use 70% recent average + 30% overall average for projection
              categoryProjections[category] = recentAverage * 0.7 + average * 0.3;
            } else {
              categoryProjections[category] = average;
            }
          }
        }

        // Convert to array and calculate trends
        const forecastArray: CategoryForecast[] = Object.keys(categoryAverages).map(category => {
          const average = categoryAverages[category];
          const projected = categoryProjections[category];
          const changePercentage = average > 0 ? ((projected - average) / average) * 100 : 0;
          
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (changePercentage > 5) trend = 'up';
          else if (changePercentage < -5) trend = 'down';
          
          return {
            category,
            projectedAmount: projected,
            averageAmount: average,
            changePercentage,
            trend
          };
        }).sort((a, b) => b.projectedAmount - a.projectedAmount);

        // Calculate totals
        const projectedTotal = forecastArray.reduce((sum, item) => sum + item.projectedAmount, 0);
        const averageTotal = forecastArray.reduce((sum, item) => sum + item.averageAmount, 0);
        
        // Multiply by period (1 for month, 3 for quarter)
        const multiplier = selectedPeriod === 'next-quarter' ? 3 : 1;
        
        if (isMounted) {
          setForecastData(forecastArray.map(item => ({
            ...item,
            projectedAmount: item.projectedAmount * multiplier,
            averageAmount: item.averageAmount * multiplier
          })));
          setTotalProjected(projectedTotal * multiplier);
          setTotalAverage(averageTotal * multiplier);
        }
      } catch (error) {
        console.error('Error calculating expense forecast:', error);
        if (isMounted) {
          setForecastData([]);
          setTotalProjected(0);
          setTotalAverage(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    calculateForecast();
    
    return () => {
      isMounted = false;
    };
  }, [transactions, baseCurrency, selectedPeriod]);

  // Format category names
  const formatCategoryName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'rent-mortgage': 'Rent & Mortgage',
      'groceries': 'Groceries',
      'transportation': 'Transportation',
      'utilities': 'Utilities',
      'entertainment': 'Entertainment',
      'dining-out': 'Dining Out',
      'shopping': 'Shopping',
      'healthcare': 'Healthcare',
      'education': 'Education',
      'insurance': 'Insurance'
    };

    return categoryMap[category] || category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      
      const changePercentage = data.changePercentage ?? 0;
      const projected = data.projected ?? 0;
      const average = data.average ?? 0;
      
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{data.categoryName || formatCategoryName(data.category || '')}</p>
          <p className="text-expense text-sm">
            Projected: {formatCurrency(projected, baseCurrency)}
          </p>
          <p className="text-gray-400 text-sm">
            Average: {formatCurrency(average, baseCurrency)}
          </p>
          {changePercentage !== 0 && changePercentage !== undefined && changePercentage !== null && (
            <p className={`text-sm ${changePercentage > 0 ? 'text-expense' : 'text-green-400'}`}>
              {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}% vs average
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Chart colors
  const getBarColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '#ff004d';
    if (trend === 'down') return '#00ff41';
    return '#888888';
  };

  const chartData = forecastData.map(item => ({
    category: item.category,
    categoryName: formatCategoryName(item.category),
    projected: item.projectedAmount,
    average: item.averageAmount,
    changePercentage: item.changePercentage,
    trend: item.trend
  }));

  const overallChange = totalAverage > 0 ? ((totalProjected - totalAverage) / totalAverage) * 100 : 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-expense/10 rounded-lg border border-expense/20">
            <TrendingUp className="w-6 h-6 text-expense" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Expense Forecast</h2>
            <p className="text-gray-400 text-sm">Based on historical patterns</p>
          </div>
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as 'next-month' | 'next-quarter')}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="next-month">Next Month</option>
          <option value="next-quarter">Next Quarter</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : forecastData.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-surface to-background border border-expense/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-expense rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">
                  Projected {selectedPeriod === 'next-quarter' ? 'Quarter' : 'Month'}
                </div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(totalProjected, baseCurrency)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-surface to-background border border-highlight/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-highlight rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Average {selectedPeriod === 'next-quarter' ? 'Quarter' : 'Month'}</div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(totalAverage, baseCurrency)}
              </div>
              {overallChange !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${overallChange > 0 ? 'text-expense' : 'text-green-400'}`}>
                  {overallChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}% vs average</span>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gradient-to-br from-surface via-background to-surface/80 rounded-xl border border-expense/20 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis 
                  dataKey="categoryName" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  axisLine={{ stroke: '#1f1f1f' }}
                  tick={{ fill: '#888888', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888888', fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value, baseCurrency)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="projected" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.trend)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category List */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-3">Category Breakdown</h3>
            {forecastData.map((item) => (
              <div 
                key={item.category}
                className="bg-gradient-to-br from-surface to-background border border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{formatCategoryName(item.category)}</span>
                    {item.trend === 'up' && (
                      <div className="flex items-center gap-1 text-expense text-xs">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{item.changePercentage.toFixed(1)}%</span>
                      </div>
                    )}
                    {item.trend === 'down' && (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <TrendingDown className="w-3 h-3" />
                        <span>{item.changePercentage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Avg: {formatCurrency(item.averageAmount, baseCurrency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-lg font-bold">
                    {formatCurrency(item.projectedAmount, baseCurrency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <div className="text-gray-400 text-sm">Not enough historical data for forecasting</div>
            <div className="text-gray-500 text-xs mt-1">Need at least 1 month of expense data</div>
          </div>
        </div>
      )}
    </Card>
  );
};

