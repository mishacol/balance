import { create } from 'zustand';
import { Transaction, FinancialSummary, CategoryTotal } from '../types';
import { dataBackupService } from '../services/dataBackupService';
import { supabaseService } from '../services/supabaseService';
import { duplicatePreventionService } from '../services/duplicatePreventionService';
import { databaseBackupService } from '../services/databaseBackupService';
import { dataIntegrityService } from '../services/dataIntegrityService';
import { calculateTotalsByType } from '../utils/currencyUtils';

interface TransactionStore {
  transactions: Transaction[];
  backupMode: 'manual' | 'automatic';
  baseCurrency: string;
  monthlyIncomeTarget: number;
  isUsingSupabase: boolean;
  setBackupMode: (mode: 'manual' | 'automatic') => void;
  setBaseCurrency: (currency: string) => void;
  setMonthlyIncomeTarget: (target: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>, options?: { isIntentional?: boolean; source?: 'form' | 'duplicate-action' | 'import' }) => Promise<{ success: boolean; message: string; duplicateId?: string }>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionsByType: (type: 'income' | 'expense') => Transaction[];
  getTransactionsByCategory: (category: string) => Transaction[];
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getFinancialSummary: () => FinancialSummary;
  getFinancialSummaryAsync: () => Promise<FinancialSummary>;
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
  loadUserProfile: () => Promise<void>;
  // Data protection methods
  createDatabaseBackup: (description?: string) => Promise<any>;
  restoreFromDatabaseBackup: (backupId: string, options?: any) => Promise<any>;
  listDatabaseBackups: () => Promise<any[]>;
  performIntegrityCheck: () => Promise<any>;
  getDataLossAlerts: () => any[];
}

export const useTransactionStore = create<TransactionStore>()(
    (set, get) => ({
      transactions: [],
      backupMode: 'manual',
      baseCurrency: 'EUR',
      monthlyIncomeTarget: 0,
    isUsingSupabase: false,

    addTransaction: async (transaction, options = {}) => {
        const state = get();
        
        try {
          if (state.isUsingSupabase) {
            // Skip duplicate prevention for duplicates - just add it directly
            if (options.isIntentional || options.source === 'duplicate-action') {
              console.log('✅ [STORE] Adding intentional duplicate directly...');
              const insertResult = await duplicatePreventionService.safeInsertTransaction(transaction);
              
              if (insertResult.action === 'error') {
                console.error('❌ [STORE] Error during insert:', insertResult.message);
                return {
                  success: false,
                  message: `Failed to add transaction: ${insertResult.message}`
                };
              }

              // ✅ SUCCESS: Reload transactions from Supabase
              console.log('✅ [STORE] Duplicate added successfully, reloading...');
              await get().loadTransactionsFromSupabase();
              
              return {
                success: true,
                message: 'Transaction duplicated successfully'
              };
            }

            // 🛡️ ACCIDENTAL DUPLICATE PREVENTION: Check for accidental duplicates only
            console.log('🔍 [STORE] Checking for accidental duplicates before adding transaction...');
            const duplicateCheck = await duplicatePreventionService.checkForAccidentalDuplicate(transaction, options);
            
            if (duplicateCheck.isAccidentalDuplicate) {
              console.log('⚠️ [STORE] Accidental duplicate detected:', duplicateCheck.message);
              return {
                success: false,
                message: `Accidental duplicate detected. ${duplicateCheck.message}`,
                duplicateId: duplicateCheck.existingTransactionId
              };
            }

            // 🛡️ SAFE INSERT: Always insert (intentional duplicates are allowed)
            console.log('✅ [STORE] No accidental duplicates found, proceeding with insert...');
            const insertResult = await duplicatePreventionService.safeInsertTransaction(transaction);
            
            if (insertResult.action === 'error') {
              console.error('❌ [STORE] Error during insert:', insertResult.message);
              return {
                success: false,
                message: `Failed to add transaction: ${insertResult.message}`
              };
            }

            // ✅ SUCCESS: Reload transactions from Supabase
            console.log('✅ [STORE] Transaction added successfully, reloading...');
            await get().loadTransactionsFromSupabase();
            
            return {
              success: true,
              message: 'Transaction added successfully'
            };
            
          } else {
            // 🛡️ LOCAL STORAGE: Check for accidental duplicates only
            if (!options.isIntentional && options.source !== 'duplicate-action') {
              const recentTransaction = state.transactions.find(t => 
                t.type === transaction.type &&
                t.amount === transaction.amount &&
                t.currency === transaction.currency &&
                t.category === transaction.category &&
                t.description === transaction.description &&
                t.date === transaction.date &&
                // Check if created within last 5 minutes (accidental duplicate)
                (Date.now() - parseInt(t.id)) < 5 * 60 * 1000
              );

              if (recentTransaction) {
                console.log('⚠️ [STORE] Accidental duplicate detected in localStorage:', recentTransaction.id);
                return {
                  success: false,
                  message: 'Accidental duplicate detected in local storage (created within 5 minutes)',
                  duplicateId: recentTransaction.id
                };
              }
            }

            // 🚨 DEBUG: Log transaction before local storage save
            console.log(`💾 [STORE] Adding transaction to localStorage:`, {
              originalTransaction: transaction,
              dateString: transaction.date,
              dateType: typeof transaction.date,
              dateParse: new Date(transaction.date).toDateString(),
              isIntentional: options.isIntentional,
              source: options.source
            });
            
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
        };
              
            console.log(`💾 [STORE] Final transaction object:`, newTransaction);
              
        set((state) => {
          const newTransactions = [...state.transactions, newTransaction];
                // Manual mode: NO automatic backups - user must create backups manually
                // Automatic mode: backups are handled by the timer in useAutoBackup hook
          return { transactions: newTransactions };
        });

            return {
              success: true,
              message: 'Transaction added to local storage successfully'
            };
          }
        } catch (error) {
          console.error('❌ [STORE] Unexpected error adding transaction:', error);
          return {
            success: false,
            message: `Unexpected error: ${error}`
          };
        }
      },

      updateTransaction: async (id, updatedTransaction) => {
        const state = get();
        
        if (state.isUsingSupabase) {
          try {
            const { error } = await supabaseService.updateTransaction(id, updatedTransaction);
            if (error) throw error;
            
            // Reload transactions from Supabase to get the updated data
            await get().loadTransactionsFromSupabase();
          } catch (error) {
            console.error('Failed to update transaction in Supabase:', error);
            // Fallback to local update
        set((state) => {
          const newTransactions = state.transactions.map((transaction) =>
            transaction.id === id
              ? { ...transaction, ...updatedTransaction }
              : transaction
          );
              return { transactions: newTransactions };
            });
          }
        } else {
          // Local storage update
          set((state) => {
            const newTransactions = state.transactions.map((transaction) =>
              transaction.id === id
                ? { ...transaction, ...updatedTransaction }
                : transaction
            );
          return { transactions: newTransactions };
        });
        }
      },

      deleteTransaction: async (id) => {
        const state = get();
        
        console.log(`🗑️ [STORE] Attempting to delete transaction:`, id);
        
        if (state.isUsingSupabase) {
          try {
            console.log(`🗑️ [STORE] Deleting from Supabase...`);
            const { error } = await supabaseService.deleteTransaction(id);
            if (error) throw error;
            
            console.log(`✅ [STORE] Successfully deleted from Supabase, reloading...`);
            // Reload transactions from Supabase to get the updated data
            await get().loadTransactionsFromSupabase();
            console.log(`✅ [STORE] Delete completed successfully`);
          } catch (error) {
            console.error('❌ [STORE] Failed to delete transaction from Supabase:', error);
            // Fallback to local delete
        set((state) => {
          const newTransactions = state.transactions.filter(
            (transaction) => transaction.id !== id
          );
              return { transactions: newTransactions };
            });
          }
        } else {
          console.log(`🗑️ [STORE] Deleting from localStorage...`);
          // Local storage delete
          set((state) => {
            const newTransactions = state.transactions.filter(
              (transaction) => transaction.id !== id
            );
          return { transactions: newTransactions };
        });
        }
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
        const baseCurrency = get().baseCurrency;
        
        // Calculate totals by type (raw amounts without conversion for backward compatibility)
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

      // New async version with proper currency conversion
      getFinancialSummaryAsync: async () => {
        const transactions = get().transactions;
        const baseCurrency = get().baseCurrency;
        
        // Use centralized currency conversion utility
        const totals = await calculateTotalsByType(transactions, baseCurrency);
        
        // For cumulative calculations, we need to group by month and calculate running totals
        const monthlyData = new Map<string, { income: number; expenses: number; investments: number }>();
        
        // Convert each transaction and group by month
        for (const transaction of transactions) {
          const convertedAmount = await calculateTotalsByType([transaction], baseCurrency);
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { income: 0, expenses: 0, investments: 0 });
          }
          
          const monthData = monthlyData.get(monthKey)!;
          if (transaction.type === 'income') {
            monthData.income += convertedAmount.income;
          } else if (transaction.type === 'expense') {
            monthData.expenses += convertedAmount.expenses;
          } else if (transaction.type === 'investment') {
            monthData.investments += convertedAmount.investments;
          }
        }

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

        return {
          totalIncome: totals.income,
          totalExpenses: totals.expenses,
          totalInvestments: totals.investments,
          monthlyAvailable: totals.netBalance,
          cumulativeAvailable,
          cumulativeInvestments,
          netBalance,
          incomeByCurrency: {}, // Will be populated by components that need it
          expensesByCurrency: {},
          investmentsByCurrency: {},
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
          console.log(`🔄 [STORE] Loading transactions from Supabase...`);
          const transactions = await supabaseService.getAllTransactions();
          
          // 🚨 DEBUG: Check if dates are corrupted during reload
          const prevTransactions = get().transactions;
          const augustBeforeReload = prevTransactions.filter(t => t.date.includes('2013-08-'));
          const augustAfterReload = transactions.filter(t => t.date.includes('2013-08-'));
          
          if (augustBeforeReload.length > 0 || augustAfterReload.length > 0) {
            console.log(`🔍 [STORE] BEFORE RELOAD August 2013:`, augustBeforeReload.map(t => ({ id: t.id, date: t.date })));
            console.log(`🔍 [STORE] AFTER RELOAD August 2013:`, augustAfterReload.map(t => ({ id: t.id, date: t.date })));
          }
          
          // 🚨 DUPLICATE PREVENTION: Remove duplicates based on ID first
          const uniqueById = transactions.filter((transaction, index, self) => 
            index === self.findIndex(t => t.id === transaction.id)
          );

          // 🚨 DUPLICATE PREVENTION: Remove duplicates based on content (same data, different IDs)
          const uniqueTransactions = uniqueById.filter((transaction, index, self) => 
            index === self.findIndex(t => 
              t.type === transaction.type &&
              t.amount === transaction.amount &&
              t.currency === transaction.currency &&
              t.category === transaction.category &&
              t.description === transaction.description &&
              t.date === transaction.date
            )
          );
          
          // 🚨 DEBUG: Check Mobile Phone transactions specifically
          const mobilePhoneTransactions = uniqueTransactions.filter(t => 
            t.category === 'mobile-phone' || 
            t.category === 'Mobile Phone' ||
            t.description?.toLowerCase().includes('mobile') ||
            t.description?.toLowerCase().includes('phone')
          );
          if (mobilePhoneTransactions.length > 0) {
            console.log(`🔍 [STORE] Mobile Phone transactions loaded:`, mobilePhoneTransactions.map(t => ({ 
              id: t.id, 
              date: t.date, 
              amount: t.amount, 
              category: t.category,
              description: t.description 
            })));
          }
          
          if (uniqueById.length !== transactions.length) {
            console.log(`🚨 [STORE] Removed ${transactions.length - uniqueById.length} duplicate transactions (same ID)`);
          }
          
          // 🚨 REMOVED CONTENT-BASED DUPLICATE REMOVAL
          // The user explicitly needs duplicates for their workflow.
          // We will no longer automatically remove content-based duplicates
          // when loading from Supabase.
          
          set({ transactions: uniqueById }); // Use uniqueById instead of uniqueTransactions
          console.log(`✅ [STORE] Loaded ${uniqueById.length} transactions from Supabase (duplicates preserved)`);
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

      loadUserProfile: async () => {
        try {
          const userId = await supabaseService.getUserId();
          if (!userId) {
            console.log('ℹ️ [STORE] No user ID, skipping profile load');
            return;
          }

          const { data: profile, error } = await supabaseService.getUserProfile(userId);
          if (error) {
            console.error('❌ [STORE] Failed to load user profile:', error);
            return;
          }

          if (profile) {
            console.log('✅ [STORE] Loaded user profile:', profile);
            set({
              baseCurrency: profile.base_currency || 'EUR',
              backupMode: profile.backup_mode || 'manual',
              monthlyIncomeTarget: profile.monthly_income_target || 0,
            });
            console.log('✅ [STORE] Updated store with profile settings:', {
              baseCurrency: profile.base_currency || 'EUR',
              backupMode: profile.backup_mode || 'manual',
              monthlyIncomeTarget: profile.monthly_income_target || 0,
            });
          }
        } catch (error) {
          console.error('❌ [STORE] Failed to load user profile:', error);
        }
      },

      removeDuplicates: () => {
        const state = get();
        const originalCount = state.transactions.length;
        
        // Remove duplicates based on ID first
        const uniqueById = state.transactions.filter((transaction, index, self) => 
          index === self.findIndex(t => t.id === transaction.id)
        );
        
        // Remove duplicates based on content (same data, different IDs)
        const uniqueTransactions = uniqueById.filter((transaction, index, self) => 
          index === self.findIndex(t => 
            t.type === transaction.type &&
            t.amount === transaction.amount &&
            t.currency === transaction.currency &&
            t.category === transaction.category &&
            t.description === transaction.description &&
            t.date === transaction.date
          )
        );
        
        // Find near-duplicates (same date, amount, type, but different descriptions/categories)
        const nearDuplicates: { original: any; duplicate: any }[] = [];
        const finalTransactions = uniqueTransactions.filter((transaction, index, self) => {
          const duplicate = self.find((t, i) => 
            i !== index &&
            t.type === transaction.type &&
            t.amount === transaction.amount &&
            t.currency === transaction.currency &&
            t.date === transaction.date &&
            // Allow some variation in description/category
            (t.description === transaction.description || 
             t.category === transaction.category ||
             Math.abs(new Date(t.date).getTime() - new Date(transaction.date).getTime()) < 24 * 60 * 60 * 1000) // Within 24 hours
          );
          
          if (duplicate) {
            nearDuplicates.push({ original: transaction, duplicate });
            return false; // Remove the duplicate
          }
          return true;
        });
        
        if (uniqueById.length !== originalCount) {
          console.log(`🚨 [STORE] Removed ${originalCount - uniqueById.length} duplicate transactions (same ID)`);
        }
        
        if (uniqueTransactions.length !== uniqueById.length) {
          console.log(`🚨 [STORE] Removed ${uniqueById.length - uniqueTransactions.length} duplicate transactions (same content, different IDs)`);
        }
        
        if (finalTransactions.length !== uniqueTransactions.length) {
          console.log(`🚨 [STORE] Removed ${uniqueTransactions.length - finalTransactions.length} near-duplicate transactions`);
          console.log(`🔍 [STORE] Near-duplicates found:`, nearDuplicates.slice(0, 3).map(d => ({
            original: { id: d.original.id, date: d.original.date, amount: d.original.amount, description: d.original.description },
            duplicate: { id: d.duplicate.id, date: d.duplicate.date, amount: d.duplicate.amount, description: d.duplicate.description }
          })));
        }
        
        if (finalTransactions.length !== originalCount) {
          console.log(`🚨 [STORE] Total duplicates removed: ${originalCount - finalTransactions.length}`);
          set({ transactions: finalTransactions });
        } else {
          console.log('✅ [STORE] No duplicates found');
        }
      },

      // Data protection methods
      createDatabaseBackup: async (description) => {
        try {
          console.log('🔄 [STORE] Creating database backup...');
          const result = await databaseBackupService.createBackup(description);
          if (result) {
            console.log('✅ [STORE] Database backup created successfully');
          } else {
            console.log('❌ [STORE] Database backup failed');
          }
          return result;
        } catch (error) {
          console.error('❌ [STORE] Database backup error:', error);
          return null;
        }
      },

      restoreFromDatabaseBackup: async (backupId, options = {}) => {
        try {
          console.log(`🔄 [STORE] Restoring from database backup ${backupId}...`);
          const result = await databaseBackupService.restoreFromBackup(backupId, {
            createBackupBeforeRestore: true,
            mergeMode: 'merge',
            ...options
          });
          
          if (result.success) {
            console.log('✅ [STORE] Database restore completed successfully');
            // Reload transactions after restore
            await get().loadTransactionsFromSupabase();
          } else {
            console.log('❌ [STORE] Database restore failed:', result.message);
          }
          
          return result;
        } catch (error) {
          console.error('❌ [STORE] Database restore error:', error);
          return {
            success: false,
            message: `Restore error: ${error}`
          };
        }
      },

      listDatabaseBackups: async () => {
        try {
          return await databaseBackupService.listBackups();
        } catch (error) {
          console.error('❌ [STORE] Failed to list database backups:', error);
          return [];
        }
      },

      performIntegrityCheck: async () => {
        try {
          console.log('🔍 [STORE] Performing integrity check...');
          const result = await dataIntegrityService.performIntegrityCheck();
          
          if (result.passed) {
            console.log('✅ [STORE] Integrity check passed');
          } else {
            console.log('❌ [STORE] Integrity check failed:', result.issues);
          }
          
          return result;
        } catch (error) {
          console.error('❌ [STORE] Integrity check error:', error);
          return {
            passed: false,
            issues: [`Integrity check error: ${error}`],
            transactionCount: 0,
            dateRange: { start: '', end: '' },
            checksum: ''
          };
        }
      },

      getDataLossAlerts: () => {
        return dataIntegrityService.getAlerts();
      },
    })
);
