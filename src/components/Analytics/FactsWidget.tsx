import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingCart, Target, Award, Zap, Globe, Coffee, Sparkles, Briefcase } from 'lucide-react';

interface Fact {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

export const FactsWidget: React.FC = () => {
  const { transactions, baseCurrency } = useTransactionStore();

  const [factsData, setFactsData] = React.useState<Fact[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [salaryJobsData, setSalaryJobsData] = React.useState<Array<{
    month: string;
    employer: string;
    amount: number;
  }>>([]);

  React.useEffect(() => {
    let isMounted = true;
    
    const calculateFacts = async () => {
      if (transactions.length === 0) {
        if (isMounted) {
          setFactsData([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const factsList: Fact[] = [];
      
      // Total transactions
      factsList.push({
        icon: <ShoppingCart className="w-5 h-5" />,
        label: 'Total Transactions',
        value: transactions.length.toLocaleString(),
        color: 'text-blue-400'
      });

      // Calculate totals (all-time)
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalInvestments = 0;
      
      const categoryCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};
      const largestTransaction = { amount: 0, description: '', type: '' };
      
      // Track specific categories for "what if" scenarios
      let cigarettesTotal = 0;
      let alcoholTotal = 0;
      let coffeeTotal = 0;
      
      // Track income by year for annual average
      const incomeByYear: Record<number, number> = {};
      const transactionDates: Date[] = [];
      
      // Track salary transactions by month and employer
      const salaryJobs: Array<{
        month: string;
        employer: string;
        amount: number;
      }> = [];
      
      for (const transaction of transactions) {
        if (!isMounted) return;
        const date = new Date(transaction.date);
        transactionDates.push(date);
        
        const convertedAmount = await currencyService.convertAmount(
          transaction.amount,
          transaction.currency,
          baseCurrency
        );
        
        if (transaction.type === 'income') {
          totalIncome += convertedAmount;
          const year = date.getFullYear();
          incomeByYear[year] = (incomeByYear[year] || 0) + convertedAmount;
          if (transaction.category) {
            sourceCounts[transaction.category] = (sourceCounts[transaction.category] || 0) + 1;
          }
          
          // Track salary and bonus transactions
          if (transaction.category === 'salary' || transaction.category === 'bonus') {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const employerName = transaction.description?.trim() || 'Unknown Employer';
            salaryJobs.push({
              month: monthKey,
              employer: employerName,
              amount: convertedAmount
            });
          }
        } else if (transaction.type === 'expense') {
          totalExpenses += convertedAmount;
          if (transaction.category) {
            categoryCounts[transaction.category] = (categoryCounts[transaction.category] || 0) + 1;
            
            // Track specific categories for Bitcoin "what if" scenarios
            if (transaction.category === 'cigarettes') {
              cigarettesTotal += convertedAmount;
            } else if (transaction.category === 'alcohol') {
              alcoholTotal += convertedAmount;
            } else if (transaction.category === 'coffee-shops') {
              coffeeTotal += convertedAmount;
            }
          }
        } else if (transaction.type === 'investment') {
          totalInvestments += convertedAmount;
        }
        
        if (convertedAmount > largestTransaction.amount) {
          largestTransaction.amount = convertedAmount;
          largestTransaction.description = transaction.description;
          largestTransaction.type = transaction.type;
        }
      }
      
      if (!isMounted) return;
      
      // Net worth = Cash + Investments, where Cash = Income - Expenses - Investments
      const cash = totalIncome - totalExpenses - totalInvestments;
      const netWorth = cash + totalInvestments;
      factsList.push({
        icon: <DollarSign className="w-5 h-5" />,
        label: 'Net Worth',
        value: formatCurrency(netWorth, baseCurrency),
        color: netWorth >= 0 ? 'text-green-400' : 'text-expense'
      });
      
      // Largest transaction
      if (largestTransaction.amount > 0) {
        factsList.push({
          icon: <TrendingUp className="w-5 h-5" />,
          label: 'Largest Transaction',
          value: formatCurrency(largestTransaction.amount, baseCurrency),
          color: 'text-highlight'
        });
      }
      
      // Average transaction size
      if (transactions.length > 0) {
        const avgTransaction = (totalIncome + totalExpenses + totalInvestments) / transactions.length;
        factsList.push({
          icon: <Target className="w-5 h-5" />,
          label: 'Average Transaction',
          value: formatCurrency(avgTransaction, baseCurrency),
          color: 'text-blue-400'
        });
      }
      
      // Most used category
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        factsList.push({
          icon: <Award className="w-5 h-5" />,
          label: 'Most Used Category',
          value: topCategory[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          color: 'text-purple-400'
        });
      }
      
      // Total income (all-time)
      if (totalIncome > 0) {
        factsList.push({
          icon: <TrendingUp className="w-5 h-5" />,
          label: 'Total Income (All Time)',
          value: formatCurrency(totalIncome, baseCurrency),
          color: 'text-income'
        });
      }
      
      // Total expenses (all-time)
      if (totalExpenses > 0) {
        factsList.push({
          icon: <TrendingDown className="w-5 h-5" />,
          label: 'Total Expenses (All Time)',
          value: formatCurrency(totalExpenses, baseCurrency),
          color: 'text-expense'
        });
      }
      
      // Total investments (all-time)
      if (totalInvestments > 0) {
        factsList.push({
          icon: <Target className="w-5 h-5" />,
          label: 'Total Investments (All Time)',
          value: formatCurrency(totalInvestments, baseCurrency),
          color: 'text-blue-400'
        });
      }
      
      // Savings rate (all-time)
      if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        factsList.push({
          icon: <Target className="w-5 h-5" />,
          label: 'Savings Rate (All Time)',
          value: `${savingsRate.toFixed(1)}%`,
          color: savingsRate >= 0 ? 'text-green-400' : 'text-expense'
        });
      }
      
      // Transaction frequency
      if (transactionDates.length > 1) {
        transactionDates.sort((a, b) => a.getTime() - b.getTime());
        const firstDate = transactionDates[0];
        const lastDate = transactionDates[transactionDates.length - 1];
        const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        const transactionsPerDay = transactions.length / Math.max(1, daysDiff);
        
        factsList.push({
          icon: <Zap className="w-5 h-5" />,
          label: 'Transactions Per Day',
          value: transactionsPerDay.toFixed(2),
          color: 'text-yellow-400'
        });
      }
      
      // Income vs Expenses ratio
      if (totalExpenses > 0 && totalIncome > 0) {
        const ratio = (totalIncome / totalExpenses).toFixed(2);
        factsList.push({
          icon: <TrendingUp className="w-5 h-5" />,
          label: 'Income/Expense Ratio',
          value: `${ratio}x`,
          color: parseFloat(ratio) >= 1 ? 'text-green-400' : 'text-expense'
        });
      }
      
      // Calculate average annual income
      const incomeYears = Object.keys(incomeByYear).map(Number);
      let averageAnnualIncome = 0;
      if (incomeYears.length > 0) {
        const totalIncomeByYear = Object.values(incomeByYear).reduce((sum, val) => sum + val, 0);
        averageAnnualIncome = totalIncomeByYear / incomeYears.length;
      } else if (transactionDates.length > 0) {
        // Fallback: estimate based on total income and date range
        transactionDates.sort((a, b) => a.getTime() - b.getTime());
        const firstDate = transactionDates[0];
        const lastDate = transactionDates[transactionDates.length - 1];
        const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (yearsDiff > 0) {
          averageAnnualIncome = totalIncome / yearsDiff;
        }
      }
      
      // Global income comparison (using approximate 2024 statistics)
      // Global median income: ~$2,500 USD/year
      // Global average income: ~$11,000 USD/year
      // Top 10% globally: ~$20,000+ USD/year
      // Top 1% globally: ~$34,000+ USD/year
      const globalMedianIncome = 2500; // USD
      const globalAverageIncome = 11000; // USD
      const top10PercentThreshold = 20000; // USD
      const top1PercentThreshold = 34000; // USD
      
      // Convert average annual income to USD for comparison (simplified - using base currency as proxy)
      const annualIncomeUSD = averageAnnualIncome; // Assuming base currency is close to USD or already converted
      
      if (annualIncomeUSD > 0) {
        // Calculate percentile
        let percentile = 0;
        let topPercent = 0;
        
        if (annualIncomeUSD >= top1PercentThreshold) {
          percentile = 99;
          topPercent = 1;
        } else if (annualIncomeUSD >= top10PercentThreshold) {
          percentile = 90;
          topPercent = 10;
        } else if (annualIncomeUSD >= globalAverageIncome) {
          percentile = 70; // Rough estimate for above average
          topPercent = 30;
        } else if (annualIncomeUSD >= globalMedianIncome) {
          percentile = 50;
          topPercent = 50;
        } else {
          percentile = 30;
          topPercent = 70;
        }
        
        if (annualIncomeUSD >= top1PercentThreshold) {
          factsList.push({
            icon: <Globe className="w-5 h-5" />,
            label: 'Global Income Ranking',
            value: `Top 1% globally`,
            color: 'text-highlight'
          });
        } else if (annualIncomeUSD >= top10PercentThreshold) {
          factsList.push({
            icon: <Globe className="w-5 h-5" />,
            label: 'Global Income Ranking',
            value: `Top ${topPercent}% globally`,
            color: 'text-green-400'
          });
        } else if (annualIncomeUSD >= globalAverageIncome) {
          factsList.push({
            icon: <Globe className="w-5 h-5" />,
            label: 'Global Income Comparison',
            value: 'Above global average',
            color: 'text-green-400'
          });
        } else {
          factsList.push({
            icon: <Globe className="w-5 h-5" />,
            label: 'Global Income Comparison',
            value: 'Below global average',
            color: 'text-yellow-400'
          });
        }
      }
      
      // Bitcoin "what if" scenarios
      // TODO: Implement historical Bitcoin price lookup based on transaction dates
      // For now, using a placeholder calculation - will be replaced with accurate historical data
      // Using a conservative multiplier as placeholder (actual calculation requires historical BTC prices)
      const bitcoinMultiplier = 25; // Placeholder - to be replaced with date-based calculation
      
      if (cigarettesTotal > 0) {
        const bitcoinValue = cigarettesTotal * bitcoinMultiplier;
        factsList.push({
          icon: <Sparkles className="w-5 h-5" />,
          label: 'If You Invested Cigarette Expenses in Bitcoin',
          value: formatCurrency(bitcoinValue, baseCurrency),
          color: 'text-orange-400'
        });
      }
      
      if (alcoholTotal > 0) {
        const bitcoinValue = alcoholTotal * bitcoinMultiplier;
        factsList.push({
          icon: <Sparkles className="w-5 h-5" />,
          label: 'If You Invested Alcohol Expenses in Bitcoin',
          value: formatCurrency(bitcoinValue, baseCurrency),
          color: 'text-purple-400'
        });
      }
      
      if (coffeeTotal > 0) {
        const bitcoinValue = coffeeTotal * bitcoinMultiplier;
        factsList.push({
          icon: <Coffee className="w-5 h-5" />,
          label: 'If You Invested Coffee Expenses in Bitcoin',
          value: formatCurrency(bitcoinValue, baseCurrency),
          color: 'text-amber-400'
        });
      }
      
      // Set salary jobs data
      if (isMounted) {
        setSalaryJobsData(salaryJobs.length > 0 ? salaryJobs : []);
        setFactsData(factsList);
        setIsLoading(false);
      }
    };
    
    calculateFacts();
    
    return () => {
      isMounted = false;
    };
  }, [transactions, baseCurrency]);

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-highlight/10 rounded-lg border border-highlight/20">
          <Award className="w-6 h-6 text-highlight" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Facts</h2>
          <p className="text-gray-400 text-sm">Interesting insights about your finances</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Top Paying Jobs Card - Special Layout */}
          {salaryJobsData.length > 0 && (
            <div className="mb-6 bg-gradient-to-br from-surface to-background border border-gray-700 rounded-xl p-5 hover:border-highlight/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-blue-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="text-gray-400 text-sm font-medium flex-1">
                  Top Paying Jobs
                </div>
              </div>
              <div className="space-y-2">
                {(() => {
                  // Group by employer and calculate monthly average
                  const employerData: Record<string, { total: number; months: Set<string> }> = {};
                  
                  salaryJobsData.forEach(job => {
                    if (!employerData[job.employer]) {
                      employerData[job.employer] = { total: 0, months: new Set() };
                    }
                    employerData[job.employer].total += job.amount;
                    employerData[job.employer].months.add(job.month);
                  });
                  
                  // Calculate monthly average for each employer
                  const employerAverages = Object.entries(employerData).map(([employer, data]) => ({
                    employer,
                    monthlyAverage: data.total / data.months.size
                  }));
                  
                  // Sort by monthly average (highest first)
                  employerAverages.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
                  
                  return employerAverages.map(({ employer, monthlyAverage }) => (
                    <div key={employer} className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
                      <span className="text-gray-400">{employer}</span>
                      <span className="text-blue-400 font-medium">
                        {formatCurrency(monthlyAverage, baseCurrency)}/month
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          
          {/* Regular Facts Cards */}
          {factsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {factsData.map((fact, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-surface to-background border border-gray-700 rounded-xl p-5 hover:border-highlight/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${fact.color}`}>
                      {fact.icon}
                    </div>
                    <div className="text-gray-400 text-sm font-medium flex-1">
                      {fact.label}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${fact.color}`}>
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-400 text-sm">No transaction data available</div>
                <div className="text-gray-500 text-xs mt-1">Add some transactions to see interesting facts</div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

