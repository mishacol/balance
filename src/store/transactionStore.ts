import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, FinancialSummary, CategoryTotal } from '../types';
import { dataBackupService } from '../services/dataBackupService';

interface TransactionStore {
  transactions: Transaction[];
  backupMode: 'manual' | 'automatic';
  setBackupMode: (mode: 'manual' | 'automatic') => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByType: (type: 'income' | 'expense') => Transaction[];
  getTransactionsByCategory: (category: string) => Transaction[];
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getFinancialSummary: () => FinancialSummary;
  getCategoryTotals: () => CategoryTotal[];
  searchTransactions: (query: string) => Transaction[];
  // Backup and recovery methods
  createBackup: () => void;
  restoreFromBackup: (backupIndex: number) => void;
  exportData: () => string;
  importData: (jsonData: string) => void;
  downloadBackup: () => void;
  getBackupInfo: () => { count: number; latest: Date | null; totalSize: number };
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      backupMode: 'manual',

      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
        };
        set((state) => {
          const newTransactions = [...state.transactions, newTransaction];
          // Create backup only if in manual mode (automatic backups are handled by timer)
          if (state.backupMode === 'manual') {
            setTimeout(() => dataBackupService.createBackup(newTransactions), 100);
          }
          return { transactions: newTransactions };
        });
      },

      updateTransaction: (id, updatedTransaction) => {
        set((state) => {
          const newTransactions = state.transactions.map((transaction) =>
            transaction.id === id
              ? { ...transaction, ...updatedTransaction }
              : transaction
          );
          // Create backup only if in manual mode (automatic backups are handled by timer)
          if (state.backupMode === 'manual') {
            setTimeout(() => dataBackupService.createBackup(newTransactions), 100);
          }
          return { transactions: newTransactions };
        });
      },

      deleteTransaction: (id) => {
        set((state) => {
          const newTransactions = state.transactions.filter(
            (transaction) => transaction.id !== id
          );
          // Create backup only if in manual mode (automatic backups are handled by timer)
          if (state.backupMode === 'manual') {
            setTimeout(() => dataBackupService.createBackup(newTransactions), 100);
          }
          return { transactions: newTransactions };
        });
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

      setBackupMode: (mode) => {
        set({ backupMode: mode });
      },

      // Backup and recovery methods
      createBackup: () => {
        const transactions = get().transactions;
        dataBackupService.createBackup(transactions);
      },

      restoreFromBackup: (backupIndex) => {
        const restoredTransactions = dataBackupService.restoreFromBackup(backupIndex);
        if (restoredTransactions.length > 0) {
          set({ transactions: restoredTransactions });
        }
      },

      exportData: () => {
        const transactions = get().transactions;
        return dataBackupService.exportData(transactions);
      },

      importData: (jsonData) => {
        try {
          const importedTransactions = dataBackupService.importData(jsonData);
          set({ transactions: importedTransactions });
          // Create backup after import
          setTimeout(() => dataBackupService.createBackup(importedTransactions), 100);
        } catch (error) {
          console.error('Failed to import data:', error);
          throw error;
        }
      },

      downloadBackup: () => {
        const transactions = get().transactions;
        dataBackupService.downloadBackup(transactions);
      },

      getBackupInfo: () => {
        return dataBackupService.getBackupInfo();
      },
    }),
    {
      name: 'transaction-storage',
    }
  )
);
