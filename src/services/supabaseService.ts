import { supabase, Database } from '../lib/supabase';
import { Transaction } from '../types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type BackupRow = Database['public']['Tables']['backups']['Row'];
type BackupInsert = Database['public']['Tables']['backups']['Insert'];

export class SupabaseService {
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  // Authentication methods
  async signUp(email: string, password: string, username?: string) {
    try {
      const metadata: Record<string, any> = {};
      if (username) metadata.username = username;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      
      // Create user profile
      if (data.user) {
        await this.createUserProfile(data.user.id, email, username);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Sign up failed:', error);
      return { data: null, error };
    }
  }

  async signIn(emailOrUsername: string, password: string) {
    try {
      // Check if it's an email or username
      const isEmail = emailOrUsername.includes('@');
      
      let email = emailOrUsername;
      
      if (!isEmail) {
        // It's a username, resolve it to email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername)
          .single();
        
        if (profileError || !profile) {
          return { data: null, error: { message: 'Invalid username or password' } };
        }
        
        email = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Sign in failed:', error);
      return { data: null, error };
    }
  }

  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Google sign in failed:', error);
      return { data: null, error };
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Password reset failed:', error);
      return { data: null, error };
    }
  }

  // Change password (for authenticated users)
  async changePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Password updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Password change failed:', error);
      return { data: null, error };
    }
  }

  // Update email with confirmation
  async updateEmail(newEmail: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Email update initiated, check your new email for confirmation');
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Email update failed:', error);
      return { data: null, error };
    }
  }

  // Delete user account permanently
  async deleteAccount(password: string) {
    try {
      // First verify password by attempting to sign in
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('Not authenticated');

      // Get current user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password
      });

      if (signInError) {
        return { data: null, error: { message: 'Invalid password' } };
      }

      // Note: For security reasons, account deletion typically requires admin access
      // This might need to be handled differently in production
      console.log('⚠️ [SUPABASE] Account deletion requested - manual admin action required');
      return { data: null, error: { message: 'Account deletion requires admin assistance. Please contact support.' } };
    } catch (error) {
      console.error('❌ [SUPABASE] Account deletion failed:', error);
      return { data: null, error };
    }
  }

  // Helper: Get user session to check current email
  async getCurrentUserEmail() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      return profile?.email || null;
    } catch (error) {
      console.error('❌ [SUPABASE] Failed to get current email:', error);
      return null;
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Sign out failed:', error);
      return { error };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Get current user failed:', error);
      return { user: null, error };
    }
  }

  // Profile methods
  async createUserProfile(userId: string, email: string, username?: string) {
    try {
      const profile: ProfileInsert = {
        id: userId,
        email,
        username: username || null,
        base_currency: 'EUR',
        monthly_income_target: 0,
        backup_mode: 'automatic',
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profile);

      if (error) throw error;
      console.log('✅ [SUPABASE] User profile created');
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Create profile failed:', error);
      return { data: null, error };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Get profile failed:', error);
      return { data: null, error };
    }
  }

  async updateUserProfile(userId: string, updates: ProfileUpdate) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      console.log('✅ [SUPABASE] Profile updated');
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Update profile failed:', error);
      return { data: null, error };
    }
  }

  // Transaction methods
  async addTransaction(transaction: Omit<Transaction, 'id'>) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const transactionData: TransactionInsert = {
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Transaction added:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Add transaction failed:', error);
      return { data: null, error };
    }
  }

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Transaction updated:', id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Update transaction failed:', error);
      return { data: null, error };
    }
  }

  async deleteTransaction(id: string) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Transaction deleted:', id);
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Delete transaction failed:', error);
      return { error };
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert to Transaction format
      const transactions: Transaction[] = data.map(row => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        currency: row.currency,
        category: row.category,
        description: row.description,
        date: row.date,
      }));

      console.log(`✅ [SUPABASE] Loaded ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('❌ [SUPABASE] Get transactions failed:', error);
      return [];
    }
  }

  // Backup methods
  async createBackup(transactions: Transaction[], description?: string) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const backupData: BackupInsert = {
        user_id: userId,
        transactions: transactions,
        timestamp: Date.now(),
        version: '1.0.0',
        description: description || 'Automatic backup',
      };

      const { data, error } = await supabase
        .from('backups')
        .insert(backupData)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ [SUPABASE] Backup created:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Create backup failed:', error);
      return { data: null, error };
    }
  }

  async getBackups() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      
      console.log(`✅ [SUPABASE] Loaded ${data.length} backups`);
      return { data, error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Get backups failed:', error);
      return { data: [], error };
    }
  }

  async restoreFromBackup(backupId: string) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Get backup data
      const { data: backup, error: backupError } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backupId)
        .eq('user_id', userId)
        .single();

      if (backupError) throw backupError;

      // Clear existing transactions
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Restore transactions from backup
      const transactions = backup.transactions as Transaction[];
      const transactionInserts: TransactionInsert[] = transactions.map(t => ({
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category: t.category,
        description: t.description,
        date: t.date,
      }));

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionInserts);

      if (insertError) throw insertError;
      
      console.log(`✅ [SUPABASE] Restored ${transactions.length} transactions from backup`);
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Restore backup failed:', error);
      return { error };
    }
  }

  // Migration methods
  async migrateFromLocalStorage(transactions: Transaction[]) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      if (transactions.length === 0) {
        console.log('ℹ️ [SUPABASE] No transactions to migrate');
        return { error: null };
      }

      // CRITICAL: Check if user already has transactions in Supabase
      const { data: existingTransactions, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (count && count > 0) {
        console.log(`⚠️ [SUPABASE] User already has ${count} transactions in Supabase. Migration skipped to prevent duplication.`);
        return { error: null };
      }

      console.log(`🔄 [SUPABASE] Starting fresh migration of ${transactions.length} transactions`);

      // Convert to Supabase format
      const transactionInserts: TransactionInsert[] = transactions.map(t => ({
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category: t.category,
        description: t.description,
        date: t.date,
      }));

      // Insert all transactions
      const { error } = await supabase
        .from('transactions')
        .insert(transactionInserts);

      if (error) throw error;
      
      console.log(`✅ [SUPABASE] Migrated ${transactions.length} transactions from localStorage`);
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Migration failed:', error);
      return { error };
    }
  }

  // Export/Import methods
  async exportData() {
    try {
      const transactions = await this.getAllTransactions();
      const { data: backups } = await this.getBackups();
      
      const exportData = {
        transactions,
        backups: backups.map(b => ({
          transactions: b.transactions,
          timestamp: b.timestamp,
          version: b.version,
          description: b.description
        })),
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalTransactions: transactions.length
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ [SUPABASE] Export failed:', error);
      throw error;
    }
  }

  async clearAllTransactions() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      console.log('🗑️ [SUPABASE] Clearing all transactions for user:', userId);

      // Clear transactions
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (txError) throw txError;

      // Clear backups
      const { error: backupError } = await supabase
        .from('backups')
        .delete()
        .eq('user_id', userId);

      if (backupError) throw backupError;

      console.log('✅ [SUPABASE] All data cleared successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Clear failed:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  async importData(jsonData: string) {
    try {
      console.log('📥 [SUPABASE] Starting import with JSON data length:', jsonData.length);
      
      const importData = JSON.parse(jsonData);
      console.log('📊 [SUPABASE] Parsed JSON structure:', {
        hasTransactions: !!importData.transactions,
        transactionsIsArray: Array.isArray(importData.transactions),
        transactionCount: importData.transactions?.length || 0,
        version: importData.version,
        exportDate: importData.exportDate,
        keys: Object.keys(importData)
      });
      
      if (!importData.transactions || !Array.isArray(importData.transactions)) {
        throw new Error(`Invalid backup file format. Expected a "transactions" array. Got: ${Object.keys(importData).join(', ')}`);
      }

      // Clear existing data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in again.');
      }
      const userId = user.id;

      console.log(`🗑️ [SUPABASE] Clearing existing data for user ${userId}`);

      const { error: deleteTxError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (deleteTxError) {
        console.error('Failed to clear transactions:', deleteTxError);
        throw new Error(`Failed to clear existing transactions: ${deleteTxError.message}`);
      }

      const { error: deleteBackupsError } = await supabase
        .from('backups')
        .delete()
        .eq('user_id', userId);

      if (deleteBackupsError) {
        console.error('Failed to clear backups:', deleteBackupsError);
        // Don't fail cleanup errors prevent import
      }

      console.log(`📥 [SUPABASE] Importing ${importData.transactions.length} transactions`);

      // Import transactions
      await this.migrateFromLocalStorage(importData.transactions);

      // Import backups if available
      if (importData.backups && Array.isArray(importData.backups)) {
        console.log(`💾 [SUPABASE] Importing ${importData.backups.length} backups`);
        
        const backupInserts: BackupInsert[] = importData.backups.map((b: any) => ({
          user_id: userId,
          transactions: b.transactions,
          timestamp: b.timestamp,
          version: b.version,
          description: b.description,
        }));

        const { error: insertBackupsError } = await supabase.from('backups').insert(backupInserts);
        
        if (insertBackupsError) {
          console.error('Failed to import backups:', insertBackupsError);
          // Don't fail - transactions are more important
        } else {
          console.log(`✅ [SUPABASE] Imported ${importData.backups.length} backups`);
        }
      }

      console.log(`✅ [SUPABASE] Successfully imported ${importData.transactions.length} transactions`);
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Import failed:', error);
      return { error: error instanceof Error ? error : new Error('Unknown import error') };
    }
  }
}

export const supabaseService = new SupabaseService();
