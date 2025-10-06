import { supabase } from '../lib/supabase';

export interface CleanupResult {
  duplicatesRemoved: number;
  message: string;
  success: boolean;
}

export class DuplicateCleanupService {
  private static instance: DuplicateCleanupService;
  private isRunning = false;

  static getInstance(): DuplicateCleanupService {
    if (!DuplicateCleanupService.instance) {
      DuplicateCleanupService.instance = new DuplicateCleanupService();
    }
    return DuplicateCleanupService.instance;
  }

  /**
   * Clean up duplicates using regular Supabase queries
   */
  async cleanupDuplicates(): Promise<CleanupResult> {
    if (this.isRunning) {
      return {
        duplicatesRemoved: 0,
        message: 'Cleanup already in progress',
        success: false
      };
    }

    this.isRunning = true;

    try {
      console.log('🧹 [CLEANUP] Starting automatic duplicate cleanup...');
      
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        return {
          duplicatesRemoved: 0,
          message: 'User not authenticated',
          success: false
        };
      }

      // Fetch all transactions
      let allTransactions = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          return {
            duplicatesRemoved: 0,
            message: `Error fetching transactions: ${error.message}`,
            success: false
          };
        }

        if (data && data.length > 0) {
          allTransactions = allTransactions.concat(data);
          offset += data.length;
        } else {
          hasMore = false;
        }
      }

      // Find duplicates based on content (same data, different IDs)
      const transactionsToKeep = [];
      const transactionsToDeleteIds = [];
      const seenTransactionKeys = new Set();

      for (const transaction of allTransactions) {
        // Create a unique key based on content (excluding ID, created_at, updated_at)
        const transactionKey = JSON.stringify({
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
        });

        if (seenTransactionKeys.has(transactionKey)) {
          // This is a duplicate by content, add its ID to the delete list
          transactionsToDeleteIds.push(transaction.id);
        } else {
          // This is the first time we've seen this content, keep it
          seenTransactionKeys.add(transactionKey);
          transactionsToKeep.push(transaction);
        }
      }

      const duplicatesRemoved = transactionsToDeleteIds.length;

      if (duplicatesRemoved > 0) {
        console.log(`🗑️ [CLEANUP] Deleting ${duplicatesRemoved} duplicates...`);
        
        // Delete duplicates in batches
        const batchSize = 50;
        
        for (let i = 0; i < transactionsToDeleteIds.length; i += batchSize) {
          const batch = transactionsToDeleteIds.slice(i, i + batchSize);
          
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .in('id', batch);

          if (deleteError) {
            console.error('❌ [CLEANUP] Error deleting batch:', deleteError);
            return {
              duplicatesRemoved: 0,
              message: `Cleanup failed: ${deleteError.message}`,
              success: false
            };
          }
        }
        
        console.log(`✅ [CLEANUP] Successfully removed ${duplicatesRemoved} duplicates`);
      }

      return {
        duplicatesRemoved,
        message: `Cleaned up ${duplicatesRemoved} duplicate transactions`,
        success: true
      };

    } catch (error) {
      console.error('❌ [CLEANUP] Unexpected error:', error);
      return {
        duplicatesRemoved: 0,
        message: `Unexpected error: ${error}`,
        success: false
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Schedule automatic cleanup (run every 24 hours)
   */
  scheduleAutomaticCleanup(): void {
    // Run cleanup immediately on first load
    this.cleanupDuplicates().then(result => {
      if (result.success && result.duplicatesRemoved > 0) {
        console.log(`🧹 [AUTO-CLEANUP] Removed ${result.duplicatesRemoved} duplicates`);
      }
    });

    // Schedule regular cleanup every 24 hours
    setInterval(() => {
      this.cleanupDuplicates().then(result => {
        if (result.success && result.duplicatesRemoved > 0) {
          console.log(`🧹 [AUTO-CLEANUP] Removed ${result.duplicatesRemoved} duplicates`);
        }
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Check if cleanup is currently running
   */
  isCleanupRunning(): boolean {
    return this.isRunning;
  }
}

export const duplicateCleanupService = DuplicateCleanupService.getInstance();
