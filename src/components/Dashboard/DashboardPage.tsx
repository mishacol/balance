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
  const [summary, setSummary] = useState({ 
    totalIncome: 0, 
    totalExpenses: 0, 
    totalInvestments: 0, 
    monthlyAvailable: 0,
    cumulativeAvailable: 0,
    cumulativeInvestments: 0,
    netBalance: 0 
  });
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
            // Normalize dates to only compare date parts (remove time components)
            const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
            const startDateOnly = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate());
            const endDateOnly = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate());
            
            return transactionDateOnly >= startDateOnly && transactionDateOnly <= endDateOnly;
          }
          return false; // Don't show any transactions if custom range not properly set
        default:
          return true;
      }
    });
  }, [transactions, selectedTimeRange, customStartDate, customEndDate]);

  // Filter transactions for cumulative calculations (Investments & Balance cards)
  // CRITICAL FIX: For custom dates, only include transactions up to the selected end date
  const cumulativeTransactions = useMemo(() => {
    let cutoffDate: Date;
    
    switch (selectedTimeRange) {
      case 'this-month':
        const now = new Date();
        cutoffDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
        break;
      case 'last-month':
        const now2 = new Date();
        const lastMonth = now2.getMonth() === 0 ? 11 : now2.getMonth() - 1;
        const lastMonthYear = now2.getMonth() === 0 ? now2.getFullYear() - 1 : now2.getFullYear();
        cutoffDate = new Date(lastMonthYear, lastMonth + 1, 0); // End of last month
        break;
      case 'this-year':
        const now3 = new Date();
        cutoffDate = new Date(now3.getFullYear(), 11, 31); // End of current year
        break;
      case 'custom':
        // CRITICAL: For custom ranges, only include up to custom end date
        cutoffDate = customEndDate || new Date('1900-01-01'); // Show no transactions if no custom date
        break;
      default:
        cutoffDate = new Date();
    }
    
    console.log(`📊 [CUMULATIVE] Selected range: ${selectedTimeRange}, Cutoff date: ${cutoffDate.toISOString().split('T')[0]}`);
    
    const cumulativeFilteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= cutoffDate;
    });
    
    console.log(`📊 [CUMULATIVE] Filtered ${transactions.length} → ${cumulativeFilteredTransactions.length} transactions`);
    console.log(`📊 [CUMULATIVE] Transaction date range: ${cumulativeFilteredTransactions.length > 0 ? `${Math.min(...cumulativeFilteredTransactions.map(t => t.date))} to ${Math.max(...cumulativeFilteredTransactions.map(t => t.date))}` : 'No transactions'}`);
    
    return cumulativeFilteredTransactions;
  }, [transactions, selectedTimeRange, customEndDate]);
  
  // Calculate summary based on filtered transactions using proper accounting logic
  const getFilteredSummary = useMemo(() => {
    console.log(`📊 [DASHBOARD] Period transactions: ${filteredTransactions.length}, Cumulative transactions: ${cumulativeTransactions.length}`);
    console.log(`📊 [DASHBOARD] Base currency: ${baseCurrency}`);
    
    // ===== PERIOD CALCULATIONS (Income, Expenses) =====
    // 1. Calculate in original currencies first
    const periodIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const periodExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`📊 [PERIOD] Income: ${periodIncome}, Expenses: ${periodExpenses}`);
    console.log(`📊 [PERIOD] Selected range: ${selectedTimeRange}, Start: ${customStartDate?.toISOString()}, End: ${customEndDate?.toISOString()}`);
    console.log(`📊 [PERIOD] Filtered transactions:`, filteredTransactions.map(t => ({ date: t.date, type: t.type, amount: t.amount, currency: t.currency })));
    
    // ===== CUMULATIVE CALCULATIONS (Investments, Cash, Total Wealth) =====
    // 2. Calculate cumulative investments (ALL investments up to end date)
    const cumulativeInvestments = cumulativeTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`📊 [CUMULATIVE] Total Investments up to end date: ${cumulativeInvestments}`);
    
    // 3. Calculate cumulative cash using correct formula:
    // Cash = Cumulative Cash + Current Period Income - Current Period Expenses - Cumulative Investments
    
    // First, group cumulative transactions by month to calculate running cash balance
    const monthlyData = new Map<string, { income: number; expenses: number; investments: number }>();
    
    cumulativeTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0, investments: 0 });
      }
      
      const monthData = monthlyData.get(monthKey)!;
      if (transaction.type === 'income') {
        monthData.income += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthData.expenses += transaction.amount;
      } else if (transaction.type === 'investment') {
        monthData.investments += transaction.amount;
      }
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b));

    // Calculate cumulative cash balance FROM PREVIOUS PERIODS ONLY
    // For April 2013 (first period), this should be 0
    let cumulativeCashFromPreviousPeriods = 0;
    
    // Get the start date of the selected period
    let periodStartDate: Date;
    switch (selectedTimeRange) {
      case 'custom':
        periodStartDate = customStartDate || new Date();
        break;
      default:
        periodStartDate = new Date(); // Fallback
    }
    
    sortedMonths.forEach(([month, data]) => {
      const monthDate = new Date(month + '-01');
      // Only include months BEFORE the selected period
      if (monthDate < periodStartDate) {
        const monthlyAvailableForMonth = data.income - data.expenses;
        cumulativeCashFromPreviousPeriods += monthlyAvailableForMonth;
      }
    });
    
    // Apply correct Cash formula: Previous Cumulative Cash + Current Period Income - Current Period Expenses - Cumulative Investments
    const finalCash = cumulativeCashFromPreviousPeriods + periodIncome - periodExpenses - cumulativeInvestments;
    
    // Total Wealth = Cash + Total Cumulative Investments
    const totalWealth = finalCash + cumulativeInvestments;
    
    console.log(`📊 [CALCULATION] Previous Cumulative Cash: ${cumulativeCashFromPreviousPeriods}, Final Cash: ${finalCash}, Total Wealth: ${totalWealth}`);
    
    // Return the calculated values
    const summary = {
      totalIncome: periodIncome,
      totalExpenses: periodExpenses,
      totalInvestments: cumulativeInvestments, // Show cumulative investments on dashboard
      monthlyAvailable: periodIncome - periodExpenses, // For compatibility, but not used in cards
      cumulativeAvailable: finalCash, // This is actually the final cash value
      cumulativeInvestments: cumulativeInvestments,
      netBalance: totalWealth // Renamed from netBalance to totalWealth for clarity
    };
    
    console.log(`📊 [DASHBOARD] Final summary:`, summary);
    console.log(`🔍 [DEBUG] Calculation breakdown:`, {
      periodIncome,
      periodExpenses,
      cumulativeCashFromPreviousPeriods,
      finalCash,
      cumulativeInvestments,
      totalWealth,
      sortedMonths: sortedMonths.map(([month, data]) => ({ month, ...data }))
    });
    
    return summary;
  }, [filteredTransactions, cumulativeTransactions, selectedTimeRange, customStartDate, customEndDate, baseCurrency]);
  
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
        
        console.log(`🔍 [CURRENCY DEBUG] Base currency: ${baseCurrency}`);
        console.log(`🔍 [CURRENCY DEBUG] Filtered transactions currencies:`, filteredTransactions.map(t => t.currency));
        console.log(`🔍 [CURRENCY DEBUG] Cumulative transactions currencies:`, cumulativeTransactions.map(t => t.currency));
        console.log(`🔍 [CURRENCY DEBUG] Needs conversion: ${needsConversion}`);
        
        if (!needsConversion) {
          console.log(`⚠️ [DASHBOARD] NO CONVERSION NEEDED - all transactions in ${baseCurrency}`);
          console.log(`⚠️ [DASHBOARD] Using base summary (NO CURRENCY CONVERSION):`, baseSummary);
          setSummary(baseSummary);
          return;
        }
        
        console.log(`💰 [DASHBOARD] Converting currencies to ${baseCurrency}`);
        
        // Convert period transactions (for Income/Expenses)
        const periodAmountsToConvert = filteredTransactions.map(t => ({
          amount: t.amount,
          currency: t.currency
        }));
        
        console.log(`🔍 [CONVERSION DEBUG] Period transactions to convert:`, periodAmountsToConvert);
        const convertedPeriodAmounts = await currencyService.convertAmounts(periodAmountsToConvert, baseCurrency);
        console.log(`🔍 [CONVERSION DEBUG] Period amounts after conversion:`, convertedPeriodAmounts);
        
        // Convert cumulative transactions (for Investments/Balance)
        const cumulativeAmountsToConvert = cumulativeTransactions.map(t => ({
          amount: t.amount,
          currency: t.currency
        }));
        
        console.log(`🔍 [CONVERSION DEBUG] Cumulative transactions to convert:`, cumulativeAmountsToConvert);
        const convertedCumulativeAmounts = await currencyService.convertAmounts(cumulativeAmountsToConvert, baseCurrency);
        console.log(`🔍 [CONVERSION DEBUG] Cumulative amounts after conversion:`, convertedCumulativeAmounts);
        
        console.log(`✅ [DASHBOARD] Conversion completed`);
        
        // Calculate converted summary using proper accounting logic
        let convertedIncome = 0;
        let convertedExpenses = 0;
        let convertedInvestments = 0;
        
        filteredTransactions.forEach((transaction, index) => {
          const convertedAmount = convertedPeriodAmounts[index].convertedAmount;
          
          if (transaction.type === 'income') {
            convertedIncome += convertedAmount;
          } else if (transaction.type === 'expense') {
            convertedExpenses += convertedAmount;
          } else if (transaction.type === 'investment') {
            convertedInvestments += convertedAmount;
          }
        });

        // Monthly available balance = income - expenses - investments (for the selected period)
        const convertedMonthlyAvailable = convertedIncome - convertedExpenses - convertedInvestments;
        
        // For cumulative calculations, group all transactions by month and calculate running totals
        const monthlyData = new Map<string, { income: number; expenses: number; investments: number }>();
        
        cumulativeTransactions.forEach((transaction, index) => {
          const convertedAmount = convertedCumulativeAmounts[index].convertedAmount;
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { income: 0, expenses: 0, investments: 0 });
          }
          
          const monthData = monthlyData.get(monthKey)!;
          if (transaction.type === 'income') {
            monthData.income += convertedAmount;
          } else if (transaction.type === 'expense') {
            monthData.expenses += convertedAmount;
          } else if (transaction.type === 'investment') {
            monthData.investments += convertedAmount;
          }
        });

        // Sort months chronologically
        const sortedMonths = Array.from(monthlyData.entries()).sort(([a], [b]) => a.localeCompare(b));

        // Calculate cumulative values
        let convertedCumulativeAvailable = 0;
        let convertedCumulativeInvestments = 0;

        sortedMonths.forEach(([, data]) => {
          const monthlyAvailableForMonth = data.income - data.expenses - data.investments;
          convertedCumulativeAvailable += monthlyAvailableForMonth;
          convertedCumulativeInvestments += data.investments;
        });

        // Net balance = cumulative available + cumulative investments
        const convertedNetBalance = convertedCumulativeAvailable + convertedCumulativeInvestments;
        
        const convertedSummary = {
          totalIncome: convertedIncome,
          totalExpenses: convertedExpenses,
          totalInvestments: convertedInvestments,
          monthlyAvailable: convertedMonthlyAvailable,
          cumulativeAvailable: convertedCumulativeAvailable,
          cumulativeInvestments: convertedCumulativeInvestments,
          netBalance: convertedNetBalance
        };
        
        console.log(`✅ [DASHBOARD] Final converted summary:`, convertedSummary);
        console.log(`🔍 [DEBUG] July vs August check - Selected range: ${selectedTimeRange}, Cutoff: ${customEndDate?.toISOString().split('T')[0]}, Cumulative Available: ${convertedCumulativeAvailable}`);
        console.log(`🔍 [DEBUG] Currency breakdown:`, {
          rawCumulativeAvailable: baseSummary.cumulativeAvailable,
          convertedCumulativeAvailable: convertedCumulativeAvailable,
          conversionDifference: convertedCumulativeAvailable - baseSummary.cumulativeAvailable,
          filteredCount: filteredTransactions.length,
          cumulativeCount: cumulativeTransactions.length
        });
        setSummary(convertedSummary);
        
      } catch (error) {
        console.error(`❌ [DASHBOARD] Currency conversion failed:`, error);
        console.error(`❌ [ERROR DETAILS]:`, {
          errorMessage: error.message,
          errorStack: error.stack,
          baseCurrency,
          filteredTransactionsLength: filteredTransactions.length,
          cumulativeTransactionsLength: cumulativeTransactions.length
        });
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard 
          title="Income" 
          amount={summary.totalIncome} 
          type="income" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Earned this period"
          isLoading={isConvertingCurrency} 
        />
        
        <SummaryCard 
          title="Expenses" 
          amount={summary.totalExpenses} 
          type="expense" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Spent this period"
          isLoading={isConvertingCurrency} 
        />
        
        <SummaryCard 
          title="Investments" 
          amount={summary.cumulativeInvestments} 
          type="investment" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Total investments"
          isLoading={isConvertingCurrency} 
        />
        
        <SummaryCard 
          title="Cash" 
          amount={summary.cumulativeAvailable} 
          type="balance" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Available money"
          isLoading={isConvertingCurrency} 
        />
        
        <SummaryCard 
          title="Total Wealth" 
          amount={summary.netBalance} 
          type="net-balance" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Net worth"
          isLoading={isConvertingCurrency} 
        />
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