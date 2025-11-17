import React, { useState, useEffect, useMemo } from 'react';
import { SummaryCard } from './SummaryCard';
import { Card } from '../ui/Card';
import { TransactionList } from '../Transactions/TransactionList';
import { ExpenseChart } from '../Charts/ExpenseChart';
import { EmojiReaction } from '../ui/EmojiReaction';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { calculateTotalsByType } from '../../utils/currencyUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const DashboardPage: React.FC = () => {
  const { transactions, baseCurrency, monthlyIncomeTarget } = useTransactionStore();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(() => {
    return localStorage.getItem('dashboard-time-range') || 'this-month';
  });
  const [customStartDate, setCustomStartDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('dashboard-custom-start-date');
    return saved ? new Date(saved + 'T00:00:00') : null; // local midnight
  });
  const [customEndDate, setCustomEndDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('dashboard-custom-end-date');
    return saved ? new Date(saved + 'T00:00:00') : null; // local midnight
  });
  const [summary, setSummary] = useState({ 
    income: 0, 
    expenses: 0, 
    investments: 0,
    cash: 0,
    totalWealth: 0
  });
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  
  // Pagination state for Dashboard transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Save dashboard state to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-time-range', selectedTimeRange);
  }, [selectedTimeRange]);

  useEffect(() => {
    if (customStartDate) {
      // Store as plain YYYY-MM-DD (local date)
      const localDateStr = customStartDate.toLocaleDateString('en-CA'); // outputs "YYYY-MM-DD"
      localStorage.setItem('dashboard-custom-start-date', localDateStr);
    } else {
      localStorage.removeItem('dashboard-custom-start-date');
    }
  }, [customStartDate]);

  useEffect(() => {
    if (customEndDate) {
      // Store as plain YYYY-MM-DD (local date)
      const localDateStr = customEndDate.toLocaleDateString('en-CA'); // outputs "YYYY-MM-DD"
      localStorage.setItem('dashboard-custom-end-date', localDateStr);
    } else {
      localStorage.removeItem('dashboard-custom-end-date');
    }
  }, [customEndDate]);

  // Reset page when time range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTimeRange, customStartDate, customEndDate]);
  
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
        case 'all-time':
          // Include all records starting from April 1, 2013 (when tracking started)
          const allTimeStart = new Date(2013, 3, 1); // April 1, 2013
          const allTimeEnd = new Date(new Date().getFullYear() + 1, 11, 31); // December 31, next year
          return transactionDate >= allTimeStart && transactionDate <= allTimeEnd;
        case 'custom':
          if (customStartDate && customEndDate) {
            // Use local date comparison
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
      case 'all-time':
        // Include all records starting from April 1, 2013 (when tracking started)
        cutoffDate = new Date(new Date().getFullYear() + 1, 11, 31); // December 31, next year
        break;
      case 'custom':
        cutoffDate = customEndDate || new Date('1900-01-01'); // Show no transactions if no custom date
        break;
      default:
        cutoffDate = new Date();
    }
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= cutoffDate;
    });
  }, [transactions, selectedTimeRange, customEndDate]);
  
  // Calculate summary with proper currency conversion
  useEffect(() => {
    const calculateSummary = async () => {
      setIsConvertingCurrency(true);
      
      try {
        // Calculate period totals (Income, Expenses) with currency conversion
        const periodTotals = await calculateTotalsByType(filteredTransactions, baseCurrency);
        const periodIncome = periodTotals.income;
        const periodExpenses = periodTotals.expenses;

        // Calculate cumulative investments with currency conversion
        const cumulativeTotals = await calculateTotalsByType(cumulativeTransactions, baseCurrency);
        const cumulativeInvestments = cumulativeTotals.investments;
        
        // Calculate cash balance (Income - Expenses - Investments)
        const cash = periodIncome - periodExpenses - cumulativeInvestments;
        
        // Total wealth = cash + investments
        const totalWealth = cash + cumulativeInvestments;
        
        setSummary({
          income: periodIncome,
          expenses: periodExpenses,
          investments: cumulativeInvestments,
          cash: cash,
          totalWealth: totalWealth
        });
        
      } catch (error) {
        console.error('Currency conversion failed:', error);
        // Fallback to raw amounts
        const periodIncome = filteredTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const periodExpenses = filteredTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const cumulativeInvestments = cumulativeTransactions
          .filter(t => t.type === 'investment')
          .reduce((sum, t) => sum + t.amount, 0);
        
        setSummary({
          income: periodIncome,
          expenses: periodExpenses,
          investments: cumulativeInvestments,
          cash: periodIncome - periodExpenses - cumulativeInvestments,
          totalWealth: (periodIncome - periodExpenses - cumulativeInvestments) + cumulativeInvestments
        });
      } finally {
        setIsConvertingCurrency(false);
      }
    };
    
    calculateSummary();
  }, [filteredTransactions, cumulativeTransactions, baseCurrency]);
  
  // Paginated transactions for Dashboard display
  const paginatedTransactions = useMemo(() => {
    const sorted = filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sorted.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

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
        const lastMonthDate = new Date(lastMonthYear, lastMonth, 1);
        return lastMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'this-year':
        return currentYear.toString();
      case 'last-year':
        return (currentYear - 1).toString();
      case 'all-time':
        return 'All Time';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return 'Custom Range';
      default:
        return 'This Month';
    }
  };

  // Helper function to get date range for selected time range
  const getDateRangeForPeriod = (period: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (period) {
      case 'this-month':
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: new Date(currentYear, currentMonth + 1, 0)
        };
      case 'last-month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return {
          start: new Date(lastMonthYear, lastMonth, 1),
          end: new Date(lastMonthYear, lastMonth + 1, 0)
        };
      case 'this-year':
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        };
      case 'all-time':
        return {
          start: new Date(2013, 3, 1), // April 1, 2013
          end: new Date(currentYear + 1, 11, 31) // December 31, next year
        };
      case 'custom':
        return {
          start: customStartDate || new Date(),
          end: customEndDate || new Date()
        };
      default:
        return {
          start: new Date(),
          end: new Date()
        };
    }
  };

  // Calculate average per month or week based on date range
  const calculateAverage = (amount: number) => {
    const { start, end } = getDateRangeForPeriod(selectedTimeRange);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // If more than 30 days, show monthly average; otherwise show weekly average
    if (daysDiff > 30) {
      const months = daysDiff / 30.44; // Average days per month
      return {
        value: amount / months,
        period: 'month'
      };
    } else {
      const weeks = daysDiff / 7;
      return {
        value: amount / Math.max(weeks, 1), // Avoid division by zero
        period: 'week'
      };
    }
  };

  // Navigation handlers for dashboard widgets
  const handleIncomeClick = () => {
    const urlParams = new URLSearchParams();
    urlParams.set('period', selectedTimeRange);
    if (customStartDate) urlParams.set('start', customStartDate.toLocaleDateString('en-CA'));
    if (customEndDate) urlParams.set('end', customEndDate.toLocaleDateString('en-CA'));
    window.open(`/analytics/income?${urlParams.toString()}`, '_blank');
  };

  const handleExpensesClick = () => {
    const urlParams = new URLSearchParams();
    urlParams.set('period', selectedTimeRange);
    if (customStartDate) urlParams.set('start', customStartDate.toLocaleDateString('en-CA'));
    if (customEndDate) urlParams.set('end', customEndDate.toLocaleDateString('en-CA'));
    window.open(`/analytics/expenses?${urlParams.toString()}`, '_blank');
  };

  const handleInvestmentsClick = () => {
    const urlParams = new URLSearchParams();
    urlParams.set('period', selectedTimeRange);
    if (customStartDate) urlParams.set('start', customStartDate.toLocaleDateString('en-CA'));
    if (customEndDate) urlParams.set('end', customEndDate.toLocaleDateString('en-CA'));
    window.open(`/analytics/investments?${urlParams.toString()}`, '_blank');
  };

  // Generate chart data with dynamic aggregation based on date range
  const generateChartData = async () => {
    if (filteredTransactions.length === 0) return { data: [], dataKey: 'month' };
    
    // Calculate actual date range based on selected time range
    const { start: startDate, end: endDate } = getDateRangeForPeriod(selectedTimeRange);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine aggregation level based on date range
    let aggregationLevel: 'daily' | 'weekly' | 'monthly' | 'yearly';
    let groupKey: string;
    
    if (daysDiff <= 31) {
      // ≤ 1 month: Show individual days
      aggregationLevel = 'daily';
      groupKey = 'date';
    } else if (daysDiff <= 93) {
      // ≤ 3 months: Show weeks
      aggregationLevel = 'weekly';
      groupKey = 'week';
    } else if (daysDiff <= 365) {
      // ≤ 1 year: Show months
      aggregationLevel = 'monthly';
      groupKey = 'month';
    } else {
      // > 1 year: Show years
      aggregationLevel = 'yearly';
      groupKey = 'year';
    }
    
    // Group transactions by aggregation level
    const groupedData: Record<string, { income: number; expenses: number; investments: number }> = {};
    
    // Convert all transactions to base currency and group them
    for (const transaction of filteredTransactions) {
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
        case 'yearly':
          groupKeyValue = date.getFullYear().toString();
          break;
        default:
          groupKeyValue = date.toISOString().split('T')[0];
      }
      
      if (!groupedData[groupKeyValue]) {
        groupedData[groupKeyValue] = { income: 0, expenses: 0, investments: 0 };
      }
      
      const convertedAmount = await currencyService.convertAmount(
        transaction.amount,
        transaction.currency,
        baseCurrency
      );
      
      if (transaction.type === 'income') {
        groupedData[groupKeyValue].income += convertedAmount;
      } else if (transaction.type === 'expense') {
        groupedData[groupKeyValue].expenses += convertedAmount;
      } else if (transaction.type === 'investment') {
        groupedData[groupKeyValue].investments += convertedAmount;
      }
    }
    
    // Convert to array format for recharts
    const chartData = Object.entries(groupedData)
      .map(([key, data]) => {
        let label = key;
        
        // Format labels for better readability
        if (aggregationLevel === 'yearly') {
          label = key; // Already formatted as year string
        } else if (aggregationLevel === 'monthly') {
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
          income: data.income,
          expenses: data.expenses,
          investments: data.investments
        };
      })
      .sort((a, b) => {
        if (aggregationLevel === 'yearly') {
          return parseInt(String(a[groupKey])) - parseInt(String(b[groupKey]));
        }
        return new Date(String(a[groupKey])).getTime() - new Date(String(b[groupKey])).getTime();
      });
    
    return { data: chartData, dataKey: groupKey };
  };

  const [chartData, setChartData] = useState<any[]>([]);
  const [chartTitle, setChartTitle] = useState('Monthly Overview');
  const [chartDataKey, setChartDataKey] = useState('month');

  // Generate chart data when dependencies change
  useEffect(() => {
    generateChartData().then(({ data, dataKey }) => {
      setChartData(data);
      setChartDataKey(dataKey);
      
      // Update chart title based on aggregation level
      const { start: startDate, end: endDate } = getDateRangeForPeriod(selectedTimeRange);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 31) {
        setChartTitle('Daily Overview');
      } else if (daysDiff <= 93) {
        setChartTitle('Weekly Overview');
      } else if (daysDiff <= 365) {
        setChartTitle('Monthly Overview');
      } else {
        setChartTitle('Yearly Overview');
      }
    });
  }, [filteredTransactions, baseCurrency, selectedTimeRange, customStartDate, customEndDate]);

  return (
    <div>
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
            <option value="all-time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {selectedTimeRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <DatePicker
                selected={customStartDate}
                onChange={(date) => setCustomStartDate(date || null)}
                selectsStart
                startDate={customStartDate}
                endDate={customEndDate}
                placeholderText="Start Date"
                dateFormat="yyyy-MM-dd"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={15}
                scrollableYearDropdown
                className="bg-surface border border-border text-white rounded px-3 py-2 text-sm w-32"
                wrapperClassName="w-auto"
                calendarClassName="bg-surface border border-border text-white"
                dayClassName={() => "text-white hover:bg-highlight/20"}
                monthClassName={() => "text-white"}
                yearClassName={() => "text-white"}
                popperContainer={({ children }) => <div style={{ zIndex: 9999 }}>{children}</div>}
              />
              <span className="text-gray-400">to</span>
              <DatePicker
                selected={customEndDate}
                onChange={(date) => setCustomEndDate(date || null)}
                selectsEnd
                startDate={customStartDate}
                endDate={customEndDate}
                minDate={customStartDate || undefined}
                placeholderText="End Date"
                dateFormat="yyyy-MM-dd"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={15}
                scrollableYearDropdown
                className="bg-surface border border-border text-white rounded px-3 py-2 text-sm w-32"
                wrapperClassName="w-auto"
                calendarClassName="bg-surface border border-border text-white"
                dayClassName={() => "text-white hover:bg-highlight/20"}
                monthClassName={() => "text-white"}
                yearClassName={() => "text-white"}
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
          amount={summary.income} 
          type="income" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Earned this period"
          isLoading={isConvertingCurrency}
          onClick={handleIncomeClick}
          averagePerPeriod={calculateAverage(summary.income)}
        />
        
        <SummaryCard 
          title="Expenses" 
          amount={summary.expenses} 
          type="expense" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Spent this period"
          isLoading={isConvertingCurrency}
          onClick={handleExpensesClick}
          averagePerPeriod={calculateAverage(summary.expenses)}
        />
        
        <SummaryCard 
          title="Investments" 
          amount={summary.investments} 
          type="investment" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Total investments"
          isLoading={isConvertingCurrency}
          onClick={handleInvestmentsClick}
          averagePerPeriod={calculateAverage(summary.investments)}
        />
        
        <SummaryCard 
          title="Cash" 
          amount={summary.cash} 
          type="balance" 
          currency={baseCurrency} 
          date={getPeriodName()} 
          explanation="Available money"
          isLoading={isConvertingCurrency}
          averagePerPeriod={calculateAverage(summary.cash)}
        />
        
        <SummaryCard 
          title="Total Wealth" 
          amount={summary.totalWealth} 
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
                    summary.income > monthlyIncomeTarget ? 'happy' :
                    summary.income === monthlyIncomeTarget ? 'neutral' : 'sad'
                  } 
                  size={48} 
                />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">
                  {summary.income.toLocaleString()} / {monthlyIncomeTarget.toLocaleString()} {baseCurrency}
                </div>
                <div className="text-sm text-gray-400">
                  {summary.income > monthlyIncomeTarget ? (
                    <span className="text-income">🎉 Exceeded target by {(summary.income - monthlyIncomeTarget).toLocaleString()} {baseCurrency}!</span>
                  ) : summary.income === monthlyIncomeTarget ? (
                    <span className="text-gray-300">🎯 Target achieved!</span>
                  ) : (
                    <span className="text-expense">📈 {(monthlyIncomeTarget - summary.income).toLocaleString()} {baseCurrency} to go</span>
                  )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      summary.income > monthlyIncomeTarget ? 'bg-income' :
                      summary.income === monthlyIncomeTarget ? 'bg-highlight' : 'bg-expense'
                    }`}
                    style={{ 
                      width: `${Math.min((summary.income / monthlyIncomeTarget) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((summary.income / monthlyIncomeTarget) * 100)}% of target
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title={chartTitle} className="min-h-[400px]">
          <ExpenseChart data={chartData} dataKey={chartDataKey} />
        </Card>
        <Card title="Transactions" className="min-h-[400px]">
          <TransactionList 
            transactions={paginatedTransactions} 
            compact={true} 
            onRefresh={() => window.location.reload()}
            onSilentRefresh={() => window.location.reload()}
            totalCount={filteredTransactions.length}
            totalAmount={filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}
          />
          
          {/* Pagination Controls */}
          {filteredTransactions.length > pageSize && (
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-surface border border-border text-white rounded text-sm hover:bg-border/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-surface border border-border text-white rounded text-sm hover:bg-border/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};