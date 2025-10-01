import React, { useState, useEffect } from 'react';
import { SummaryCard } from './SummaryCard';
import { Card } from '../ui/Card';
import { TransactionList } from '../Transactions/TransactionList';
import { ExpenseChart } from '../Charts/ExpenseChart';
import { useTransactionStore } from '../../store/transactionStore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export const DashboardPage: React.FC = () => {
  const { transactions, getFinancialSummary } = useTransactionStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  
  // Filter transactions based on selected time range
  const getFilteredTransactions = () => {
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
  };
  
  const filteredTransactions = getFilteredTransactions();
  
  // Calculate summary based on filtered transactions
  const getFilteredSummary = () => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalInvestments = filteredTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate cumulative balance up to and including the selected period
    const getCumulativeBalanceUpToPeriod = () => {
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
      
      // Sum all transactions up to and including the cutoff date
      const transactionsUpToPeriod = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate <= cutoffDate;
      });
      
      const incomeUpToPeriod = transactionsUpToPeriod
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expensesUpToPeriod = transactionsUpToPeriod
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const investmentsUpToPeriod = transactionsUpToPeriod
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Balance = Income - Expenses - Investments (investments reduce available balance)
      return incomeUpToPeriod - expensesUpToPeriod - investmentsUpToPeriod;
    };
    
    const balance = getCumulativeBalanceUpToPeriod();

    return { totalIncome, totalExpenses, totalInvestments, balance };
  };
  
  const summary = getFilteredSummary();
  const allTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard title="Income" amount={summary.totalIncome} type="income" currency={primaryCurrency} date={getPeriodName()} />
        <SummaryCard title="Expenses" amount={summary.totalExpenses} type="expense" currency={primaryCurrency} date={getPeriodName()} />
        <SummaryCard title="Investments" amount={summary.totalInvestments} type="investment" currency={primaryCurrency} date={getPeriodName()} />
        <SummaryCard title="Balance" amount={summary.balance} type="balance" currency={primaryCurrency} date={getPeriodName()} />
      </div>
      {/* Charts and Recent Transactions */}
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