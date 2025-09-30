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
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, balance };
  };
  
  const summary = getFilteredSummary();
  const recentTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
              />
            </div>
          )}
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard title="Total Income" amount={summary.totalIncome} type="income" />
        <SummaryCard title="Total Expenses" amount={summary.totalExpenses} type="expense" />
        <SummaryCard title="Balance" amount={summary.balance} type="balance" />
      </div>
      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Daily Overview" className="min-h-[400px]">
          <ExpenseChart data={chartData} />
        </Card>
        <Card title="Recent Transactions" className="min-h-[400px]">
          <TransactionList transactions={recentTransactions} />
        </Card>
      </div>
    </div>;
};