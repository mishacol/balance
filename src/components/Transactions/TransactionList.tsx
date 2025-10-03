import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';
import { ArrowUpRightIcon, ArrowDownLeftIcon, EditIcon, TrashIcon, MoreVerticalIcon, CopyIcon } from 'lucide-react';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
interface TransactionListProps {
  transactions: Transaction[];
  compact?: boolean;
  typeFilter?: string;
  categoryFilter?: string;
  selectedTimeRange?: string;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
}
export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  compact = false,
  typeFilter = '',
  categoryFilter = '',
  selectedTimeRange = 'this-month',
  customStartDate = null,
  customEndDate = null
}) => {
  const navigate = useNavigate();
  const { deleteTransaction, addTransaction, baseCurrency } = useTransactionStore();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [averageType, setAverageType] = useState<'per-transaction' | 'per-day'>('per-transaction');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [convertedTotal, setConvertedTotal] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  // Pagination logic - only for non-compact mode
  const totalPages = compact ? 1 : Math.ceil(transactions.length / itemsPerPage);
  const startIndex = compact ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = compact ? transactions.length : startIndex + itemsPerPage;
  const paginatedTransactions = compact ? transactions : transactions.slice(startIndex, endIndex);

  // Reset to first page when transactions change
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  // Calculate converted total when transactions or base currency changes
  useEffect(() => {
    const calculateConvertedTotal = async () => {
      if (transactions.length === 0) {
        setConvertedTotal(0);
        return;
      }

      setIsConverting(true);
      try {
        // Check if we need currency conversion
        const needsConversion = transactions.some(t => t.currency !== baseCurrency);
        
        if (!needsConversion) {
          // All transactions are in base currency, just sum them
          const total = transactions.reduce((sum, t) => sum + t.amount, 0);
          setConvertedTotal(total);
          return;
        }

        // Convert all amounts to base currency
        const amountsToConvert = transactions.map(t => ({
          amount: t.amount,
          currency: t.currency
        }));

        const convertedAmounts = await currencyService.convertAmounts(amountsToConvert, baseCurrency);
        const total = convertedAmounts.reduce((sum, item) => sum + item.convertedAmount, 0);
        setConvertedTotal(total);
      } catch (error) {
        console.error('Failed to convert currencies:', error);
        // Fallback to simple sum if conversion fails
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        setConvertedTotal(total);
      } finally {
        setIsConverting(false);
      }
    };

    calculateConvertedTotal();
  }, [transactions, baseCurrency]);

  // DEBUG: Log currency conversion info
  React.useEffect(() => {
    console.log(`🔍 [TRANSACTION LIST] Base currency: ${baseCurrency}`);
    console.log(`🔍 [TRANSACTION LIST] Converted total: ${convertedTotal}`);
    console.log(`🔍 [TRANSACTION LIST] Sample transactions:`, transactions.slice(0, 3).map(t => ({ amount: t.amount, currency: t.currency })));
  }, [transactions, baseCurrency, convertedTotal]);

  const handleEdit = (transaction: Transaction) => {
    navigate(`/edit-transaction/${transaction.id}`);
  };

  const handleDelete = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(transactionId);
      setOpenDropdown(null);
    }
  };

  const handleDuplicate = (transaction: Transaction) => {
    const duplicatedTransaction = {
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date // Keep the original date!
    };
    addTransaction(duplicatedTransaction);
    setOpenDropdown(null);
  };

  const toggleDropdown = (transactionId: string) => {
    setOpenDropdown(openDropdown === transactionId ? null : transactionId);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  // Get the most common currency from transactions
  const getPrimaryCurrency = () => {
    if (transactions.length === 0) return 'USD';
    
    const currencyCount: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      currencyCount[transaction.currency] = (currencyCount[transaction.currency] || 0) + 1;
    });
    
    return Object.entries(currencyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'USD';
  };

  const primaryCurrency = getPrimaryCurrency();

  // Calculate number of days for per-day average
  const getDaysInPeriod = () => {
    const now = new Date();
    
    switch (selectedTimeRange) {
      case 'this-month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      case 'last-month':
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return new Date(lastMonthYear, lastMonth + 1, 0).getDate();
      case 'this-year':
        return new Date(now.getFullYear(), 2, 0).getDate() === 29 ? 366 : 365; // Leap year check
      case 'custom':
        if (customStartDate && customEndDate) {
          const diffTime = Math.abs(customEndDate.getTime() - customStartDate.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        }
        return 30; // Default fallback
      default:
        return 30; // Default fallback
    }
  };

  const daysInPeriod = getDaysInPeriod();

  // Determine if summary should be shown
  const shouldShowSummary = () => {
    // Show if type filter is selected
    if (typeFilter) {
      console.log('🔍 Summary shown: type filter selected');
      return true;
    }
    
    // Show if category filter is selected (even without type filter)
    if (categoryFilter) {
      console.log('🔍 Summary shown: category filter selected');
      return true;
    }
    
    console.log('🔍 Summary hidden: no filters selected');
    return false;
  };

  // Get the effective type for calculations when only category is selected
  const getEffectiveType = () => {
    if (typeFilter) return typeFilter;
    
    if (categoryFilter) {
      console.log('🔍 Category filter detected:', categoryFilter);
      // Define all income categories
      const incomeCategories = [
        // Employment Income
        'bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities',
        // Business & Self-Employment
        'affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties',
        // Investment Income
        'capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income',
        // Passive Income
        'ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue',
        // Government & Benefits
        'grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits',
        // Other Income
        'gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'
      ];
      
      // Check if it's a parent category (contains '-')
      if (categoryFilter.includes('-')) {
        // Parent categories - determine based on the category group
        if (categoryFilter.includes('income') || categoryFilter.includes('employment') || 
            categoryFilter.includes('business') || categoryFilter.includes('investment') || 
            categoryFilter.includes('passive') || categoryFilter.includes('government') || 
            categoryFilter.includes('other-income')) {
          return 'income';
        } else {
          return 'expense';
        }
      } else {
        // Specific category - if it's in income categories, it's income, otherwise it's expense
        const isIncome = incomeCategories.includes(categoryFilter);
        const result = isIncome ? 'income' : 'expense';
        console.log(`🔍 Category "${categoryFilter}" → Type: ${result}`);
        return result;
      }
    }
    
    return '';
  };

  return <div className="w-full">
      {/* Summary Bar - moved to top */}
      {shouldShowSummary() && (() => {
        const effectiveType = getEffectiveType();
        console.log('🔍 Effective type for calculations:', effectiveType);
        
        // Filter transactions by effective type if needed
        const filteredForSummary = effectiveType 
          ? transactions.filter(t => t.type === effectiveType)
          : transactions;
        
        console.log('🔍 Transactions for summary:', filteredForSummary.length, 'out of', transactions.length);
        
        return (
          <div className="mb-4 p-3 bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <span>Total Transactions: {filteredForSummary.length}</span>
              <span>
                Total: {isConverting ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                    Converting...
                  </span>
                ) : (
                  formatCurrency(convertedTotal, baseCurrency)
                )}
              </span>
              <div className="flex items-center space-x-2">
                <span>
                  Average: {isConverting ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      Converting...
                    </span>
                  ) : (
                    formatCurrency(
                      filteredForSummary.length > 0 
                        ? averageType === 'per-transaction'
                          ? convertedTotal / filteredForSummary.length
                          : convertedTotal / daysInPeriod
                        : 0,
                      baseCurrency
                    )
                  )}
                </span>
                <select
                  value={averageType}
                  onChange={(e) => setAverageType(e.target.value as 'per-transaction' | 'per-day')}
                  className="bg-background border border-border text-white rounded px-2 py-1 text-xs"
                >
                  <option value="per-transaction">per transaction</option>
                  <option value="per-day">per day</option>
                </select>
              </div>
            </div>
          </div>
        );
      })()}
      <div className={compact ? "overflow-y-auto max-h-72 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500" : ""}>
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border text-gray-400 text-xs">
              <th className="pb-2 font-normal w-20 text-center">Type</th>
              <th className="pb-2 font-normal w-28">Date</th>
              <th className="pb-2 font-normal w-40 text-center">Category</th>
              <th className="pb-2 font-normal">Description</th>
              <th className="pb-2 font-normal text-right w-28">Amount</th>
              {!compact && <th className="pb-2 font-normal text-center w-20">Actions</th>}
            </tr>
          </thead>
        <tbody className="font-mono">
          {paginatedTransactions.map(transaction => <tr key={transaction.id} className="border-b border-border hover:bg-border/30 transition-colors">
              <td className="py-3 text-center">
                {transaction.type === 'income' ? <div className="flex items-center justify-center">
                    <span className="bg-income/10 p-1 rounded">
                      <ArrowUpRightIcon size={16} className="text-income" />
                    </span>
                  </div> : transaction.type === 'expense' ? <div className="flex items-center justify-center">
                    <span className="bg-expense/10 p-1 rounded">
                      <ArrowDownLeftIcon size={16} className="text-expense" />
                    </span>
                  </div> : <div className="flex items-center justify-center">
                    <span className="bg-highlight/10 p-1 rounded">
                      <ArrowUpRightIcon size={16} className="text-highlight" />
                    </span>
                  </div>}
              </td>
              <td className="py-3 text-xs px-2">
                {compact ? formatShortDate(transaction.date) : formatDate(transaction.date)}
              </td>
              <td className="py-3 text-xs text-center px-2">
                <span className="bg-surface px-2 py-1 rounded text-xs">
                  {transaction.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </td>
              <td className="py-3 text-xs">{transaction.description}</td>
              <td className={`py-3 text-right text-xs ${transaction.type === 'income' ? 'text-income' : transaction.type === 'expense' ? 'text-expense' : 'text-highlight'}`}>
                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '→'}
                {formatCurrency(transaction.amount, transaction.currency)}
              </td>
              {!compact && <td className="py-3 text-center">
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown(transaction.id)}
                    className="p-1 rounded hover:bg-highlight/20 transition-colors group"
                    title="More actions"
                  >
                    <MoreVerticalIcon size={14} className="text-gray-400 group-hover:text-highlight" />
                  </button>
                  
                  {openDropdown === transaction.id && (
                    <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[120px]">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-highlight/20 transition-colors flex items-center"
                      >
                        <EditIcon size={14} className="mr-2 text-gray-400" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(transaction)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-highlight/20 transition-colors flex items-center"
                      >
                        <CopyIcon size={14} className="mr-2 text-gray-400" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-expense/20 transition-colors flex items-center text-expense"
                      >
                        <TrashIcon size={14} className="mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </td>}
            </tr>)}
        </tbody>
      </table>
      </div>

      {/* Transaction counter for compact mode */}
      {compact && transactions.length > 0 && (
        <div className="mt-2 text-sm text-gray-400 text-center">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Pagination Controls - only show in non-compact mode */}
      {!compact && transactions.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, transactions.length)} of {transactions.length} transactions
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-surface border border-border text-white rounded px-2 py-1 text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={90}>90 per page</option>
            </select>
          </div>
          
          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>;
};