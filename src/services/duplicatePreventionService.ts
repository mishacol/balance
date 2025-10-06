import { supabase } from '../lib/supabase';

export interface DuplicateCheckResult {
  isAccidentalDuplicate: boolean;
  existingTransactionId?: string;
  timeDiffMinutes?: number;
  message: string;
}

export interface IntentionalDuplicateOptions {
  isIntentional?: boolean;
  source?: 'form' | 'duplicate-action' | 'import';
}

export interface SafeTransactionInsert {
  id?: string;
  action: 'inserted' | 'duplicate' | 'error';
  message: string;
}

export class DuplicatePreventionService {
  private static instance: DuplicatePreventionService;
  private pendingTransactions = new Set<string>();
  private duplicateCache = new Map<string, boolean>();

  static getInstance(): DuplicatePreventionService {
    if (!DuplicatePreventionService.instance) {
      DuplicatePreventionService.instance = new DuplicatePreventionService();
    }
    return DuplicatePreventionService.instance;
  }

  /**
   * Generate a unique key for transaction content
   */
  private generateTransactionKey(transaction: {
    type: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    date: string;
  }): string {
    return JSON.stringify({
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date,
    });
  }

  /**
   * Check if a transaction is an accidental duplicate (within time window)
   */
  async checkForAccidentalDuplicate(transaction: {
    type: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    date: string;
  }, options: IntentionalDuplicateOptions = {}): Promise<DuplicateCheckResult> {
    try {
      // If this is an intentional duplicate (from duplicate action), allow it
      if (options.isIntentional || options.source === 'duplicate-action') {
        return {
          isAccidentalDuplicate: false,
          message: 'Intentional duplicate - allowed'
        };
      }

      const key = this.generateTransactionKey(transaction);
      
      // Check if this transaction is currently being processed (accidental double-click)
      if (this.pendingTransactions.has(key)) {
        return {
          isAccidentalDuplicate: true,
          message: 'Transaction is currently being processed (possible double-click)'
        };
      }

      // Mark as pending
      this.pendingTransactions.add(key);

      // Check database for accidental duplicates (within 5 minutes)
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        this.pendingTransactions.delete(key);
        return {
          isAccidentalDuplicate: false,
          message: 'User not authenticated'
        };
      }

      // Check for identical transactions created within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('type', transaction.type)
        .eq('amount', transaction.amount)
        .eq('currency', transaction.currency)
        .eq('category', transaction.category)
        .eq('description', transaction.description)
        .eq('date', transaction.date)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        this.pendingTransactions.delete(key);
        return {
          isAccidentalDuplicate: false,
          message: `Error checking for accidental duplicates: ${error.message}`
        };
      }

      const isAccidentalDuplicate = data && data.length > 0;
      let timeDiffMinutes = 0;
      
      if (isAccidentalDuplicate) {
        const timeDiff = Date.now() - new Date(data[0].created_at).getTime();
        timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
      }
      
      // Remove from pending
      this.pendingTransactions.delete(key);

      return {
        isAccidentalDuplicate,
        existingTransactionId: isAccidentalDuplicate ? data[0].id : undefined,
        timeDiffMinutes,
        message: isAccidentalDuplicate 
          ? `Accidental duplicate detected (created ${timeDiffMinutes} minutes ago)`
          : 'No accidental duplicate found'
      };

    } catch (error) {
      this.pendingTransactions.delete(key);
      console.error('❌ [ACCIDENTAL DUPLICATE CHECK] Error:', error);
      return {
        isAccidentalDuplicate: false,
        message: `Error checking for accidental duplicates: ${error}`
      };
    }
  }

  /**
   * Safely insert a transaction using regular Supabase insert
   */
  async safeInsertTransaction(transaction: {
    type: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    date: string;
  }): Promise<SafeTransactionInsert> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        return {
          action: 'error',
          message: 'User not authenticated'
        };
      }

      // Use regular Supabase insert instead of custom function
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [SAFE INSERT] Error:', error);
        return {
          action: 'error',
          message: `Failed to insert transaction: ${error.message}`
        };
      }

      return {
        id: data.id,
        action: 'inserted',
        message: 'Transaction created successfully'
      };

    } catch (error) {
      console.error('❌ [SAFE INSERT] Unexpected error:', error);
      return {
        action: 'error',
        message: `Unexpected error: ${error}`
      };
    }
  }

  /**
   * Clear cache (useful for testing or manual cleanup)
   */
  clearCache(): void {
    this.duplicateCache.clear();
    this.pendingTransactions.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cacheSize: number; pendingCount: number } {
    return {
      cacheSize: this.duplicateCache.size,
      pendingCount: this.pendingTransactions.size
    };
  }
}

export const duplicatePreventionService = DuplicatePreventionService.getInstance();
