import React, { useState, useEffect, useMemo } from 'react';
import { SummaryCard } from './SummaryCard';
import { Card } from '../ui/Card';
import { TransactionList } from '../Transactions/TransactionList';
import { ExpenseChart } from '../Charts/ExpenseChart';
import { EmojiReaction } from '../ui/EmojiReaction';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export const DashboardPage: React.FC = () => {
  const { transactions, getFinancialSummary, baseCurrency, monthlyIncomeTarget } = useTransactionStore();
  
  // Debug: Log all transactions to see what we have
  console.log(`🔍 [DEBUG] Total transactions in store: ${transactions.length}`);
  if (transactions.length > 0) {
    console.log(`🔍 [DEBUG] Transaction dates:`, transactions.map(t => ({ id: t.id, date: t.date, type: t.type, amount: t.amount })));
    console.log(`🔍 [DEBUG] Sample dates:`, transactions.slice(0, 5).map(t => t.date));
    console.log(`🔍 [DEBUG] Current date:`, new Date().toISOString().split('T')[0]);
    console.log(`🔍 [DEBUG] Current month/year:`, new Date().getMonth() + 1, new Date().getFullYear());
  }
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, totalInvestments: 0, balance: 0, netBalance: 0 });
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  
  // Filter transactions based on selected time range - memoized to prevent infinite loops
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      
      switch (selectedTimeRange) {
        case 'this-month':
          return transactionYear === currentYear && transactionMonth === currentMonth;
        case 'last-month':
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return transactionYear === lastMonthYear && transactionMonth === lastMonth;
        case 'this-year':
          return transactionYear === currentYear;
        case 'custom':
          if (customStartDate && customEndDate) {
            return transactionDate >= customStartDate && transactionDate <= customEndDate;
          }
          return true;
        default:
          return true;
      }
    });
  }, [transactions, selectedTimeRange, customStartDate, customEndDate]);

  // Filter transactions for cumulative calculations (Investments & Balance cards)
  const cumulativeTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let cutoffDate: Date;
    switch (selectedTimeRange) {
      case 'this-month':
        cutoffDate = new Date(currentYear, currentMonth + 1, 0); // End of current month
        break;
      case 'last-month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        cutoffDate = new Date(lastMonthYear, lastMonth + 1, 0); // End of last month
        break;
      case 'this-year':
        cutoffDate = new Date(currentYear, 11, 31); // End of current year
        break;
      case 'custom':
        cutoffDate = customEndDate || new Date();
        break;
      default:
        cutoffDate = new Date();
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= cutoffDate;
    });
  }, [transactions, selectedTimeRange, customEndDate]);
  
  // Calculate summary based on filtered transactions - WITH CURRENCY CONVERSION AND LOGS
  const getFilteredSummary = useMemo(() => {
    console.log(`📊 [DASHBOARD] Period transactions: ${filteredTransactions.length}, Cumulative transactions: ${cumulativeTransactions.length}`);
    console.log(`📊 [DASHBOARD] Base currency: ${baseCurrency}`);
    
    // Income and Expenses: only from selected period
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Investments and Balance: cumulative up to selected period
    const totalInvestments = cumulativeTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`📊 [DASHBOARD] Original amounts - Income: ${totalIncome}, Expenses: ${totalExpenses}, Investments: ${totalInvestments}`);
    
    // Calculate cumulative balance up to and including the selected period
    const balance = cumulativeTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) -
      cumulativeTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) -
      cumulativeTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`📊 [DASHBOARD] Final summary - Income: ${totalIncome}, Expenses: ${totalExpenses}, Investments: ${totalInvestments}, Available Balance: ${balance}, Net Balance: ${balance + totalInvestments}`);

    return { totalIncome, totalExpenses, totalInvestments, balance, netBalance: balance + totalInvestments };
  }, [filteredTransactions, cumulativeTransactions, selectedTimeRange, customEndDate, baseCurrency]);
  
  // Update summary when transactions or base currency changes - WITH ASYNC CURRENCY CONVERSION
  useEffect(() => {
    const updateSummaryWithConversion = async () => {
      console.log(`🔄 [DASHBOARD] Starting currency conversion process`);
      setIsConvertingCurrency(true);
      
      try {
        // Get base summary first
        const baseSummary = getFilteredSummary;
        console.log(`📊 [DASHBOARD] Base summary:`, baseSummary);
        
        // Check if we need currency conversion
        const needsConversion = filteredTransactions.some(t => t.currency !== baseCurrency) || 
                               cumulativeTransactions.some(t => t.currency !== baseCurrency);
        
        if (!needsConversion) {
          console.log(`✅ [DASHBOARD] No conversion needed - all transactions in ${baseCurrency}`);
          setSummary(baseSummary);
          return;
        }
        
        console.log(`💰 [DASHBOARD] Converting currencies to ${baseCurrency}`);
        
        // Convert period transactions (for Income/Expenses)
        const periodAmountsToConvert = filteredTransactions.map(t => ({
          amount: t.amount,
          currency: t.currency
        }));
        
        const convertedPeriodAmounts = await currencyService.convertAmounts(periodAmountsToConvert, baseCurrency);
        
        // Convert cumulative transactions (for Investments/Balance)
        const cumulativeAmountsToConvert = cumulativeTransactions.map(t => ({
          amount: t.amount,
          currency: t.currency
        }));
        
        const convertedCumulativeAmounts = await currencyService.convertAmounts(cumulativeAmountsToConvert, baseCurrency);
        
        console.log(`✅ [DASHBOARD] Conversion completed`);
        
        // Calculate converted summary
        let convertedIncome = 0;
        let convertedExpenses = 0;
        
        filteredTransactions.forEach((transaction, index) => {
          const convertedAmount = convertedPeriodAmounts[index].convertedAmount;
          
          if (transaction.type === 'income') {
            convertedIncome += convertedAmount;
          } else if (transaction.type === 'expense') {
            convertedExpenses += convertedAmount;
          }
        });
        
        let convertedInvestments = 0;
        let convertedBalance = 0;
        
        cumulativeTransactions.forEach((transaction, index) => {
          const convertedAmount = convertedCumulativeAmounts[index].convertedAmount;
          
          if (transaction.type === 'investment') {
            convertedInvestments += convertedAmount;
          }
          
          if (transaction.type === 'income') {
            convertedBalance += convertedAmount;
          } else if (transaction.type === 'expense') {
            convertedBalance -= convertedAmount;
          } else if (transaction.type === 'investment') {
            convertedBalance -= convertedAmount;
          }
        });
        
        const convertedSummary = {
          totalIncome: convertedIncome,
          totalExpenses: convertedExpenses,
          totalInvestments: convertedInvestments, // Use converted cumulative investments
          balance: convertedBalance,
          netBalance: convertedBalance + convertedInvestments
        };
        
        console.log(`✅ [DASHBOARD] Final converted summary:`, convertedSummary);
        setSummary(convertedSummary);
        
      } catch (error) {
        console.error(`❌ [DASHBOARD] Currency conversion failed:`, error);
        // Fallback to base summary
        const fallbackSummary = getFilteredSummary;
        console.log(`🔄 [DASHBOARD] Using fallback summary:`, fallbackSummary);
        setSummary(fallbackSummary);
      } finally {
        setIsConvertingCurrency(false);
        console.log(`🏁 [DASHBOARD] Currency conversion process completed`);
      }
    };
    
    updateSummaryWithConversion();
  }, [getFilteredSummary, baseCurrency, filteredTransactions, cumulativeTransactions, selectedTimeRange, customEndDate]);
  const allTransactions = useMemo(() => 
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredTransactions]
  );

  // Get period name for display
  const getPeriodName = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (selectedTimeRange) {
      case 'this-month':
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'last-month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return new Date(lastMonthYear, lastMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'this-year':
        return currentYear.toString();
      case 'custom':
        if (customEndDate) {
          return customEndDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  // Get the most common currency from transactions
  const getPrimaryCurrency = () => {
    if (filteredTransactions.length === 0) return 'USD';
    
    const currencyCount: { [key: string]: number } = {};
    filteredTransactions.forEach(transaction => {
      currencyCount[transaction.currency] = (currencyCount[transaction.currency] || 0) + 1;
    });
    
    return Object.entries(currencyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'USD';
  };

  const primaryCurrency = getPrimaryCurrency();

  // Generate daily data for chart based on selected time range
  const generateDailyData = () => {
    const dailyData = [];
    
    // Group transactions by date
    const transactionsByDate: Record<string, { income: number; expenses: number }> = {};
    
    filteredTransactions.forEach(transaction => {
      const dateKey = transaction.date;
      if (!transactionsByDate[dateKey]) {
        transactionsByDate[dateKey] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        transactionsByDate[dateKey].income += transaction.amount;
      } else {
        transactionsByDate[dateKey].expenses += transaction.amount;
      }
    });
    
    // Convert to array and sort by date
    Object.entries(transactionsByDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(([dateStr, amounts]) => {
        const date = new Date(dateStr);
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyData.push({ 
          month: dateLabel, 
          income: amounts.income, 
          expenses: amounts.expenses 
        });
      });
    
    return dailyData;
  };

  const chartData = generateDailyData();


  return <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Financial Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select 
            className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          
          {selectedTimeRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <DatePicker
                selected={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                selectsStart
                startDate={customStartDate}
                endDate={customEndDate}
                placeholderText="Start Date"
                className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
                wrapperClassName="w-auto"
                calendarClassName="bg-surface border border-border text-white"
                popperContainer={({ children }) => <div style={{ zIndex: 9999 }}>{children}</div>}
              />
              <span className="text-gray-400">to</span>
              <DatePicker
                selected={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                selectsEnd
                startDate={customStartDate}
                endDate={customEndDate}
                minDate={customStartDate}
                placeholderText="End Date"
                className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
                wrapperClassName="w-auto"
                calendarClassName="bg-surface border border-border text-white"
                popperContainer={({ children }) => <div style={{ zIndex: 9999 }}>{children}</div>}
              />
            </div>
          )}
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <SummaryCard title="Income" amount={summary.totalIncome} type="income" currency={baseCurrency} date={getPeriodName()} isLoading={isConvertingCurrency} />
        <SummaryCard title="Expenses" amount={summary.totalExpenses} type="expense" currency={baseCurrency} date={getPeriodName()} isLoading={isConvertingCurrency} />
        <SummaryCard title="Investments" amount={summary.totalInvestments} type="investment" currency={baseCurrency} date={getPeriodName()} isLoading={isConvertingCurrency} />
        <SummaryCard title="Available Balance" amount={summary.balance} type="balance" currency={baseCurrency} date={getPeriodName()} isLoading={isConvertingCurrency} />
        <SummaryCard title="Net Balance" amount={summary.netBalance} type="net-balance" currency={baseCurrency} date={getPeriodName()} isLoading={isConvertingCurrency} />
      </div>

      {/* Monthly Income Target Card */}
      {monthlyIncomeTarget > 0 && (
        <div className="mb-8">
          <Card title="Monthly Income Target" className="max-w-md mx-auto">
            <div className="text-center">
              <div className="mb-4">
                <EmojiReaction 
                  type={
                    summary.totalIncome > monthlyIncomeTarget ? 'happy' :
                    summary.totalIncome === monthlyIncomeTarget ? 'neutral' : 'sad'
                  } 
                  size={48} 
                />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">
                  {summary.totalIncome.toLocaleString()} / {monthlyIncomeTarget.toLocaleString()} {baseCurrency}
                </div>
                <div className="text-sm text-gray-400">
                  {summary.totalIncome > monthlyIncomeTarget ? (
                    <span className="text-income">🎉 Exceeded target by {(summary.totalIncome - monthlyIncomeTarget).toLocaleString()} {baseCurrency}!</span>
                  ) : summary.totalIncome === monthlyIncomeTarget ? (
                    <span className="text-gray-300">🎯 Target achieved!</span>
                  ) : (
                    <span className="text-expense">📈 {(monthlyIncomeTarget - summary.totalIncome).toLocaleString()} {baseCurrency} to go</span>
                  )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      summary.totalIncome > monthlyIncomeTarget ? 'bg-income' :
                      summary.totalIncome === monthlyIncomeTarget ? 'bg-highlight' : 'bg-expense'
                    }`}
                    style={{ 
                      width: `${Math.min((summary.totalIncome / monthlyIncomeTarget) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((summary.totalIncome / monthlyIncomeTarget) * 100)}% of target
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Monthly Overview" className="min-h-[400px]">
          <ExpenseChart data={chartData} />
        </Card>
        <Card title="Transactions" className="min-h-[400px]">
          <TransactionList transactions={allTransactions} compact={true} />
        </Card>
      </div>
    </div>;
};