import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, FinancialSummary, CategoryTotal } from '../types';

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByType: (type: 'income' | 'expense') => Transaction[];
  getTransactionsByCategory: (category: string) => Transaction[];
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getFinancialSummary: () => FinancialSummary;
  getCategoryTotals: () => CategoryTotal[];
  searchTransactions: (query: string) => Transaction[];
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
        };
        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));
      },

      updateTransaction: (id, updatedTransaction) => {
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id
              ? { ...transaction, ...updatedTransaction }
              : transaction
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter(
            (transaction) => transaction.id !== id
          ),
        }));
      },

      getTransactionsByType: (type) => {
        return get().transactions.filter(
          (transaction) => transaction.type === type
        );
      },

      getTransactionsByCategory: (category) => {
        return get().transactions.filter(
          (transaction) => transaction.category === category
        );
      },

      getTransactionsByDateRange: (startDate, endDate) => {
        return get().transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return transactionDate >= start && transactionDate <= end;
        });
      },

      getFinancialSummary: () => {
        const transactions = get().transactions;
        const totalIncome = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;

        const incomeByCurrency: Record<string, number> = {};
        const expensesByCurrency: Record<string, number> = {};

        transactions.forEach((transaction) => {
          if (transaction.type === 'income') {
            incomeByCurrency[transaction.currency] =
              (incomeByCurrency[transaction.currency] || 0) + transaction.amount;
          } else {
            expensesByCurrency[transaction.currency] =
              (expensesByCurrency[transaction.currency] || 0) + transaction.amount;
          }
        });

        return {
          totalIncome,
          totalExpenses,
          balance,
          incomeByCurrency,
          expensesByCurrency,
        };
      },

      getCategoryTotals: () => {
        const transactions = get().transactions;
        const categoryMap: Record<string, number> = {};

        transactions.forEach((transaction) => {
          categoryMap[transaction.category] =
            (categoryMap[transaction.category] || 0) + transaction.amount;
        });

        return Object.entries(categoryMap).map(([category, amount]) => ({
          category,
          amount,
        }));
      },

      searchTransactions: (query) => {
        const transactions = get().transactions;
        const lowercaseQuery = query.toLowerCase();
        return transactions.filter(
          (transaction) =>
            transaction.description.toLowerCase().includes(lowercaseQuery) ||
            transaction.category.toLowerCase().includes(lowercaseQuery)
        );
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);
