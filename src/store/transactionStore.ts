import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, FinancialSummary, CategoryTotal } from '../types';
import { dataBackupService } from '../services/dataBackupService';
import { supabaseService } from '../services/supabaseService';

interface TransactionStore {
  transactions: Transaction[];
  backupMode: 'manual' | 'automatic';
  baseCurrency: string;
  monthlyIncomeTarget: number;
  isUsingSupabase: boolean;
  setBackupMode: (mode: 'manual' | 'automatic') => void;
  setBaseCurrency: (currency: string) => void;
  setMonthlyIncomeTarget: (target: number) => void;
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
  importData: (jsonData: string) => Promise<void>;
  downloadBackup: () => void;
  clearBackups: () => void;
  getBackupInfo: () => { count: number; latest: Date | null; totalSize: number };
  // Supabase methods
  loadTransactionsFromSupabase: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;
  switchToSupabase: () => void;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      backupMode: 'manual',
      baseCurrency: 'EUR',
      monthlyIncomeTarget: 0,
      isUsingSupabase: false,

      addTransaction: async (transaction) => {
        const state = get();
        
        if (state.isUsingSupabase) {
          try {
            const { error } = await supabaseService.addTransaction(transaction);
            if (error) throw error;
            
            // Reload transactions from Supabase
            await get().loadTransactionsFromSupabase();
          } catch (error) {
            console.error('Failed to add transaction to Supabase:', error);
            // Fallback to localStorage
            const newTransaction: Transaction = {
              ...transaction,
              id: Date.now().toString(),
            };
            set((state) => ({
              transactions: [...state.transactions, newTransaction]
            }));
          }
        } else {
          const newTransaction: Transaction = {
            ...transaction,
            id: Date.now().toString(),
          };
          set((state) => {
            const newTransactions = [...state.transactions, newTransaction];
            // Manual mode: NO automatic backups - user must create backups manually
            // Automatic mode: backups are handled by the timer in useAutoBackup hook
            return { transactions: newTransactions };
          });
        }
      },

      updateTransaction: (id, updatedTransaction) => {
        set((state) => {
          const newTransactions = state.transactions.map((transaction) =>
            transaction.id === id
              ? { ...transaction, ...updatedTransaction }
              : transaction
          );
          // Manual mode: NO automatic backups - user must create backups manually
          // Automatic mode: backups are handled by the timer in useAutoBackup hook
          return { transactions: newTransactions };
        });
      },

      deleteTransaction: (id) => {
        set((state) => {
          const newTransactions = state.transactions.filter(
            (transaction) => transaction.id !== id
          );
          // Manual mode: NO automatic backups - user must create backups manually
          // Automatic mode: backups are handled by the timer in useAutoBackup hook
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
        
        // Calculate totals by type
        const totalIncome = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalInvestments = transactions
          .filter((t) => t.type === 'investment')
          .reduce((sum, t) => sum + t.amount, 0);

        // Calculate monthly available balance: income - expenses - investments
        const monthlyAvailable = totalIncome - totalExpenses - totalInvestments;

        // For cumulative calculations, we need to group by month and calculate running totals
        const monthlyData = new Map<string, { income: number; expenses: number; investments: number }>();
        
        transactions.forEach((transaction) => {
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

        // Calculate cumulative values
        let cumulativeAvailable = 0;
        let cumulativeInvestments = 0;

        sortedMonths.forEach(([, data]) => {
          const monthlyAvailableForMonth = data.income - data.expenses - data.investments;
          cumulativeAvailable += monthlyAvailableForMonth;
          cumulativeInvestments += data.investments;
        });

        // Net balance = cumulative available + cumulative investments
        const netBalance = cumulativeAvailable + cumulativeInvestments;

        // Currency breakdowns
        const incomeByCurrency: Record<string, number> = {};
        const expensesByCurrency: Record<string, number> = {};
        const investmentsByCurrency: Record<string, number> = {};

        transactions.forEach((transaction) => {
          if (transaction.type === 'income') {
            incomeByCurrency[transaction.currency] =
              (incomeByCurrency[transaction.currency] || 0) + transaction.amount;
          } else if (transaction.type === 'expense') {
            expensesByCurrency[transaction.currency] =
              (expensesByCurrency[transaction.currency] || 0) + transaction.amount;
          } else if (transaction.type === 'investment') {
            investmentsByCurrency[transaction.currency] =
              (investmentsByCurrency[transaction.currency] || 0) + transaction.amount;
          }
        });

        return {
          totalIncome,
          totalExpenses,
          totalInvestments,
          monthlyAvailable,
          cumulativeAvailable,
          cumulativeInvestments,
          netBalance,
          incomeByCurrency,
          expensesByCurrency,
          investmentsByCurrency,
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

      setBaseCurrency: (currency) => {
        set({ baseCurrency: currency });
      },

      setMonthlyIncomeTarget: (target) => {
        set({ monthlyIncomeTarget: target });
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

      importData: async (jsonData) => {
        try {
 const state = get();
          const currentTransactions = state.transactions;
          
          console.log(`📊 Before import: ${currentTransactions.length} transactions`);
          
          if (state.isUsingSupabase) {
            // Use Supabase import
            console.log('🔄 [STORE] Using Supabase import path');
            const { error } = await supabaseService.importData(jsonData);
            if (error) {
              console.error('❌ [STORE] Supabase import failed:', error);
              throw error;
            }
            
            // Clear localStorage to prevent duplicate migration
            localStorage.removeItem('transaction-storage');
            console.log('🗑️ [STORE] Cleared localStorage to prevent duplicate migration');
            
            // Reload transactions from Supabase
            console.log('🔄 [STORE] Reloading transactions from Supabase');
            await get().loadTransactionsFromSupabase();
            
            console.log(`✅ [STORE] Supabase import completed successfully`);
          } else {
            // Use localStorage import (original logic)
            const importedTransactions = dataBackupService.importData(jsonData);
            console.log(`📥 Importing: ${importedTransactions.length} transactions`);
            
            // Filter out duplicates based on ID to prevent conflicts
            const existingIds = new Set(currentTransactions.map(t => t.id));
            const newTransactions = importedTransactions.filter(t => !existingIds.has(t.id));
            
            console.log(`🆕 New transactions (after deduplication): ${newTransactions.length}`);
            
            const mergedTransactions = [...currentTransactions, ...newTransactions];
            console.log(`📊 After merge: ${mergedTransactions.length} transactions`);
            
            // Force update the store
            set({ transactions: mergedTransactions });
            
            // Verify the update worked
            setTimeout(() => {
              const verifyTransactions = get().transactions;
              console.log(`✅ Verification: ${verifyTransactions.length} transactions in store`);
            }, 100);
            
            // Create backup after import
            setTimeout(() => dataBackupService.createBackup(mergedTransactions), 200);
          }
        } catch (error) {
          console.error('Failed to import data:', error);
          throw error;
        }
      },

      downloadBackup: () => {
        const transactions = get().transactions;
        dataBackupService.downloadBackup(transactions);
      },

      clearBackups: () => {
        dataBackupService.clearBackups();
      },

      getBackupInfo: () => {
        return dataBackupService.getBackupInfo();
      },

      // Supabase methods
      loadTransactionsFromSupabase: async () => {
        try {
          const transactions = await supabaseService.getAllTransactions();
          set({ transactions });
          console.log(`✅ [STORE] Loaded ${transactions.length} transactions from Supabase`);
        } catch (error) {
          console.error('❌ [STORE] Failed to load transactions from Supabase:', error);
        }
      },

      migrateFromLocalStorage: async () => {
        try {
          const state = get();
          
          // Check if we're already using Supabase data
          if (state.isUsingSupabase) {
            console.log('ℹ️ [STORE] Already using Supabase, skipping migration');
            return;
          }
          
          if (state.transactions.length === 0) {
            console.log('ℹ️ [STORE] No transactions to migrate');
            return;
          }

          console.log(`🔄 [STORE] Migrating ${state.transactions.length} transactions to Supabase...`);
          const { error } = await supabaseService.migrateFromLocalStorage(state.transactions);
          
          if (error) {
            console.error('❌ [STORE] Migration failed:', error);
            return;
          }

          // Clear localStorage to prevent duplicate migration
          localStorage.removeItem('transaction-storage');
          console.log('🗑️ [STORE] Cleared localStorage after migration');

          // Switch to Supabase and reload
          await get().loadTransactionsFromSupabase();
          console.log('✅ [STORE] Migration completed successfully');
        } catch (error) {
          console.error('❌ [STORE] Migration failed:', error);
        }
      },

      switchToSupabase: () => {
        set({ isUsingSupabase: true });
        console.log('🔄 [STORE] Switched to Supabase storage');
      },
    }),
    {
      name: 'transaction-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        baseCurrency: state.baseCurrency,
        monthlyIncomeTarget: state.monthlyIncomeTarget,
        backupMode: state.backupMode,
        isUsingSupabase: state.isUsingSupabase,
      }),
    }
  )
);
