import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface MonthlyProjection {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  netCashFlow: number;
  cumulativeSavings: number;
}

interface SavingsProjectionWidgetProps {
  projectionMonths?: number;
}

export const SavingsProjectionWidget: React.FC<SavingsProjectionWidgetProps> = ({ 
  projectionMonths = 6
}) => {
  const { transactions, baseCurrency } = useTransactionStore();
  
  const [selectedMonths, setSelectedMonths] = useState(projectionMonths);
  const [projectionData, setProjectionData] = useState<MonthlyProjection[]>([]);
  const [averageMonthlyIncome, setAverageMonthlyIncome] = useState(0);
  const [averageMonthlyExpenses, setAverageMonthlyExpenses] = useState(0);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate current savings (income - expenses - investments)
  useEffect(() => {
    let isMounted = true;
    
    const calculateCurrentSavings = async () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startStr = startOfYear.toLocaleDateString('en-CA');
      const endStr = now.toLocaleDateString('en-CA');
      
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalInvestments = 0;
      
      for (const transaction of transactions) {
        if (!isMounted) return;
        if (transaction.date >= startStr && transaction.date <= endStr) {
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          
          if (transaction.type === 'income') {
            totalIncome += convertedAmount;
          } else if (transaction.type === 'expense') {
            totalExpenses += convertedAmount;
          } else if (transaction.type === 'investment') {
            totalInvestments += convertedAmount;
          }
        }
      }
      
      if (isMounted) {
        setCurrentSavings(totalIncome - totalExpenses - totalInvestments);
      }
    };
    
    calculateCurrentSavings();
    
    return () => {
      isMounted = false;
    };
  }, [transactions, baseCurrency]);

  // Calculate projection based on historical data
  useEffect(() => {
    let isMounted = true;
    
    const calculateProjection = async () => {
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
        
        // Filter transactions from historical period
        const historicalTransactions = transactions.filter(transaction => {
          const transactionDate = transaction.date;
          return transactionDate >= historicalStartStr && transactionDate <= historicalEndStr;
        });

        if (historicalTransactions.length === 0) {
          if (!isMounted) return;
          setProjectionData([]);
          setAverageMonthlyIncome(0);
          setAverageMonthlyExpenses(0);
          setIsLoading(false);
          return;
        }

        // Group by month and type
        const monthlyData: Record<string, { income: number; expenses: number; investments: number }> = {};
        
        for (const transaction of historicalTransactions) {
          if (!isMounted) return;
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expenses: 0, investments: 0 };
          }
          
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          
          if (transaction.type === 'income') {
            monthlyData[monthKey].income += convertedAmount;
          } else if (transaction.type === 'expense') {
            monthlyData[monthKey].expenses += convertedAmount;
          } else if (transaction.type === 'investment') {
            monthlyData[monthKey].investments += convertedAmount;
          }
        }

        // Calculate averages
        const monthlyTotals = Object.values(monthlyData);
        const avgIncome = monthlyTotals.reduce((sum, m) => sum + m.income, 0) / monthlyTotals.length;
        const avgExpenses = monthlyTotals.reduce((sum, m) => sum + m.expenses, 0) / monthlyTotals.length;
        
        // Use recent trend (last 3 months) for projection
        const recentMonths = monthlyTotals.slice(-3);
        const recentAvgIncome = recentMonths.length > 0 
          ? recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length 
          : avgIncome;
        const recentAvgExpenses = recentMonths.length > 0 
          ? recentMonths.reduce((sum, m) => sum + m.expenses, 0) / recentMonths.length 
          : avgExpenses;
        
        // Weighted average: 70% recent + 30% overall
        const projectedIncome = recentAvgIncome * 0.7 + avgIncome * 0.3;
        const projectedExpenses = recentAvgExpenses * 0.7 + avgExpenses * 0.3;
        
        if (isMounted) {
          setAverageMonthlyIncome(avgIncome);
          setAverageMonthlyExpenses(avgExpenses);
          
          // Generate projection for next N months
          const projections: MonthlyProjection[] = [];
          let cumulative = currentSavings;
          
          for (let i = 1; i <= selectedMonths; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthLabel = futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            const netFlow = projectedIncome - projectedExpenses;
            cumulative += netFlow;
            
            projections.push({
              month: monthLabel,
              projectedIncome,
              projectedExpenses,
              netCashFlow: netFlow,
              cumulativeSavings: cumulative
            });
          }
          
          setProjectionData(projections);
        }
      } catch (error) {
        console.error('Error calculating savings projection:', error);
        if (isMounted) {
          setProjectionData([]);
          setAverageMonthlyIncome(0);
          setAverageMonthlyExpenses(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    calculateProjection();
    
    return () => {
      isMounted = false;
    };
  }, [transactions, baseCurrency, selectedMonths, currentSavings]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{data.month}</p>
          <p className="text-income text-sm mb-1">
            Income: {formatCurrency(data.projectedIncome, baseCurrency)}
          </p>
          <p className="text-expense text-sm mb-1">
            Expenses: {formatCurrency(data.projectedExpenses, baseCurrency)}
          </p>
          <p className={`text-sm font-semibold ${data.netCashFlow >= 0 ? 'text-green-400' : 'text-expense'}`}>
            Net: {formatCurrency(data.netCashFlow, baseCurrency)}
          </p>
          <div className="border-t border-gray-600 mt-2 pt-2">
            <p className="text-highlight text-sm font-semibold">
              Cumulative: {formatCurrency(data.cumulativeSavings, baseCurrency)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const projectedNetFlow = averageMonthlyIncome - averageMonthlyExpenses;
  const finalSavings = currentSavings + (projectedNetFlow * selectedMonths);

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-highlight/10 rounded-lg border border-highlight/20">
            <DollarSign className="w-6 h-6 text-highlight" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Savings Projection</h2>
            <p className="text-gray-400 text-sm">Based on current trends</p>
          </div>
        </div>
        
        <select
          value={selectedMonths}
          onChange={(e) => setSelectedMonths(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="3">3 Months</option>
          <option value="6">6 Months</option>
          <option value="12">12 Months</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : projectionData.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-surface to-background border border-income/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-income rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Avg. Monthly Income</div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(averageMonthlyIncome, baseCurrency)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-surface to-background border border-expense/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-expense rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Avg. Monthly Expenses</div>
              </div>
              <div className="text-white text-2xl font-bold">
                {formatCurrency(averageMonthlyExpenses, baseCurrency)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-surface to-background border border-highlight/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-highlight rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Projected Savings</div>
              </div>
              <div className={`text-2xl font-bold ${finalSavings >= 0 ? 'text-green-400' : 'text-expense'}`}>
                {formatCurrency(finalSavings, baseCurrency)}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                {projectedNetFlow >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">+{formatCurrency(projectedNetFlow, baseCurrency)}/month</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-expense" />
                    <span className="text-expense">{formatCurrency(projectedNetFlow, baseCurrency)}/month</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gradient-to-br from-surface via-background to-surface/80 rounded-xl border border-highlight/20 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis 
                  dataKey="month" 
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
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeSavings" 
                  stroke="#00d9ff" 
                  strokeWidth={3}
                  dot={{ fill: '#00d9ff', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Breakdown */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-3">Monthly Projection</h3>
            {projectionData.map((item, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-surface to-background border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.month}</span>
                  <span className={`text-lg font-bold ${item.netCashFlow >= 0 ? 'text-green-400' : 'text-expense'}`}>
                    {formatCurrency(item.netCashFlow, baseCurrency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Income: </span>
                    <span className="text-income">{formatCurrency(item.projectedIncome, baseCurrency)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expenses: </span>
                    <span className="text-expense">{formatCurrency(item.projectedExpenses, baseCurrency)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">Cumulative: </span>
                  <span className={`text-sm font-semibold ${item.cumulativeSavings >= 0 ? 'text-highlight' : 'text-expense'}`}>
                    {formatCurrency(item.cumulativeSavings, baseCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Not enough historical data for projection</div>
            <div className="text-gray-500 text-xs mt-1">Need at least 1 month of transaction data</div>
          </div>
        </div>
      )}
    </Card>
  );
};

