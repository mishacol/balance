import { supabase } from '../lib/supabase';

export interface BackupInfo {
  id: string;
  timestamp: number;
  transactionCount: number;
  dateRange: { start: string; end: string };
  size: number;
  checksum: string;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  transactionsRestored?: number;
  conflictsResolved?: number;
}

export class DatabaseBackupService {
  private static instance: DatabaseBackupService;
  private isBackingUp = false;

  static getInstance(): DatabaseBackupService {
    if (!DatabaseBackupService.instance) {
      DatabaseBackupService.instance = new DatabaseBackupService();
    }
    return DatabaseBackupService.instance;
  }

  /**
   * Create a comprehensive backup with integrity checks
   */
  async createBackup(description?: string): Promise<BackupInfo | null> {
    if (this.isBackingUp) {
      console.log('⚠️ [BACKUP] Backup already in progress');
      return null;
    }

    this.isBackingUp = true;

    try {
      console.log('🔄 [BACKUP] Starting comprehensive backup...');
      
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Fetch all transactions with pagination
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

        if (error) throw error;

        if (data && data.length > 0) {
          allTransactions = allTransactions.concat(data);
          offset += data.length;
          console.log(`📄 [BACKUP] Fetched ${allTransactions.length} transactions so far...`);
        } else {
          hasMore = false;
        }
      }

      console.log(`📊 [BACKUP] Total transactions to backup: ${allTransactions.length}`);

      // Calculate backup metadata
      const timestamp = Date.now();
      const transactionCount = allTransactions.length;
      const dateRange = this.calculateDateRange(allTransactions);
      const backupData = JSON.stringify(allTransactions);
      const size = new Blob([backupData]).size;
      const checksum = await this.calculateChecksum(backupData);

      // Store backup in Supabase
      const { data: backupRecord, error: backupError } = await supabase
        .from('backups')
        .insert({
          user_id: userId,
          transactions: allTransactions,
          timestamp: timestamp,
          version: '2.0',
          description: description || `Automatic backup - ${transactionCount} transactions`
        })
        .select()
        .single();

      if (backupError) throw backupError;

      const backupInfo: BackupInfo = {
        id: backupRecord.id,
        timestamp,
        transactionCount,
        dateRange,
        size,
        checksum
      };

      console.log('✅ [BACKUP] Backup created successfully:', backupInfo);
      
      // Also store in localStorage as fallback
      localStorage.setItem(`backup-${timestamp}`, backupData);
      localStorage.setItem(`backup-info-${timestamp}`, JSON.stringify(backupInfo));

      return backupInfo;

    } catch (error) {
      console.error('❌ [BACKUP] Backup failed:', error);
      return null;
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Restore from backup with conflict resolution
   */
  async restoreFromBackup(backupId: string, options: {
    mergeMode?: 'replace' | 'merge' | 'merge-newer';
    createBackupBeforeRestore?: boolean;
  } = {}): Promise<RecoveryResult> {
    try {
      console.log(`🔄 [RESTORE] Starting restore from backup ${backupId}...`);

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Create backup before restore if requested
      if (options.createBackupBeforeRestore) {
        console.log('🔄 [RESTORE] Creating backup before restore...');
        await this.createBackup('Pre-restore backup');
      }

      // Fetch backup data
      const { data: backup, error: backupError } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backupId)
        .eq('user_id', userId)
        .single();

      if (backupError) {
        return {
          success: false,
          message: `Backup not found: ${backupError.message}`
        };
      }

      const backupTransactions = backup.transactions;
      console.log(`📊 [RESTORE] Backup contains ${backupTransactions.length} transactions`);

      // Get current transactions for comparison
      const { data: currentTransactions, error: currentError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (currentError) {
        return {
          success: false,
          message: `Failed to fetch current transactions: ${currentError.message}`
        };
      }

      console.log(`📊 [RESTORE] Current database has ${currentTransactions.length} transactions`);

      let transactionsToInsert = backupTransactions;
      let conflictsResolved = 0;

      if (options.mergeMode === 'merge' || options.mergeMode === 'merge-newer') {
        // Merge mode: only insert transactions that don't exist
        const existingIds = new Set(currentTransactions.map(t => t.id));
        const existingContent = new Set(
          currentTransactions.map(t => JSON.stringify({
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            category: t.category,
            description: t.description,
            date: t.date
          }))
        );

        transactionsToInsert = backupTransactions.filter(backupT => {
          // Check by ID first
          if (existingIds.has(backupT.id)) {
            conflictsResolved++;
            return false;
          }

          // Check by content
          const contentKey = JSON.stringify({
            type: backupT.type,
            amount: backupT.amount,
            currency: backupT.currency,
            category: backupT.category,
            description: backupT.description,
            date: backupT.date
          });

          if (existingContent.has(contentKey)) {
            conflictsResolved++;
            return false;
          }

          return true;
        });

        console.log(`🔄 [RESTORE] Merge mode: ${transactionsToInsert.length} new transactions, ${conflictsResolved} conflicts resolved`);
      } else if (options.mergeMode === 'replace') {
        // Replace mode: delete all current transactions first
        console.log('🔄 [RESTORE] Replace mode: clearing current transactions...');
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          return {
            success: false,
            message: `Failed to clear current transactions: ${deleteError.message}`
          };
        }
      }

      // Insert transactions in batches
      if (transactionsToInsert.length > 0) {
        console.log(`🔄 [RESTORE] Inserting ${transactionsToInsert.length} transactions...`);
        
        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
          const batch = transactionsToInsert.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(batch.map(t => ({
              id: t.id,
              user_id: userId,
              type: t.type,
              amount: t.amount,
              currency: t.currency,
              category: t.category,
              description: t.description,
              date: t.date,
              created_at: t.created_at,
              updated_at: t.updated_at
            })));

          if (insertError) {
            console.error(`❌ [RESTORE] Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError);
            return {
              success: false,
              message: `Failed to insert transactions: ${insertError.message}`
            };
          }

          insertedCount += batch.length;
          console.log(`✅ [RESTORE] Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(transactionsToInsert.length/batchSize)}`);
        }

        console.log(`✅ [RESTORE] Successfully restored ${insertedCount} transactions`);
      }

      return {
        success: true,
        message: `Restore completed successfully`,
        transactionsRestored: transactionsToInsert.length,
        conflictsResolved
      };

    } catch (error) {
      console.error('❌ [RESTORE] Restore failed:', error);
      return {
        success: false,
        message: `Restore failed: ${error}`
      };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return [];

      const { data: backups, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      return backups.map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        transactionCount: backup.transactions.length,
        dateRange: this.calculateDateRange(backup.transactions),
        size: new Blob([JSON.stringify(backup.transactions)]).size,
        checksum: 'calculated-on-demand' // Could calculate if needed
      }));

    } catch (error) {
      console.error('❌ [BACKUP LIST] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<{ valid: boolean; message: string }> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        return { valid: false, message: 'User not authenticated' };
      }

      const { data: backup, error } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backupId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return { valid: false, message: `Backup not found: ${error.message}` };
      }

      const transactions = backup.transactions;
      
      // Basic integrity checks
      if (!Array.isArray(transactions)) {
        return { valid: false, message: 'Backup data is not an array' };
      }

      if (transactions.length === 0) {
        return { valid: false, message: 'Backup contains no transactions' };
      }

      // Check for required fields
      const requiredFields = ['id', 'type', 'amount', 'currency', 'category', 'description', 'date'];
      const invalidTransactions = transactions.filter(t => 
        !requiredFields.every(field => t.hasOwnProperty(field))
      );

      if (invalidTransactions.length > 0) {
        return { valid: false, message: `${invalidTransactions.length} transactions missing required fields` };
      }

      return { valid: true, message: `Backup is valid with ${transactions.length} transactions` };

    } catch (error) {
      return { valid: false, message: `Verification failed: ${error}` };
    }
  }

  /**
   * Calculate date range from transactions
   */
  private calculateDateRange(transactions: any[]): { start: string; end: string } {
    if (transactions.length === 0) {
      return { start: '', end: '' };
    }

    const dates = transactions.map(t => t.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Schedule automatic backups
   */
  scheduleAutomaticBackups(): void {
    // Create backup immediately
    this.createBackup('Automatic backup - app startup');

    // Schedule daily backups
    setInterval(() => {
      this.createBackup('Daily automatic backup');
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Schedule weekly comprehensive backups
    setInterval(() => {
      this.createBackup('Weekly comprehensive backup');
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }
}

export const databaseBackupService = DatabaseBackupService.getInstance();
