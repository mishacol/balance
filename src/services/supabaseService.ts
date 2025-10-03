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
  private getCurrentUserId(): string | null {
    const { data: { user } } = supabase.auth.getUser();
    return user?.id || null;
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
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
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      if (transactions.length === 0) {
        console.log('ℹ️ [SUPABASE] No transactions to migrate');
        return { error: null };
      }

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

  async importData(jsonData: string) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.transactions || !Array.isArray(importData.transactions)) {
        throw new Error('Invalid data format');
      }

      // Clear existing data
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      await supabase.from('transactions').delete().eq('user_id', userId);
      await supabase.from('backups').delete().eq('user_id', userId);

      // Import transactions
      await this.migrateFromLocalStorage(importData.transactions);

      // Import backups if available
      if (importData.backups && Array.isArray(importData.backups)) {
        const backupInserts: BackupInsert[] = importData.backups.map((b: any) => ({
          user_id: userId,
          transactions: b.transactions,
          timestamp: b.timestamp,
          version: b.version,
          description: b.description,
        }));

        await supabase.from('backups').insert(backupInserts);
      }

      console.log(`✅ [SUPABASE] Imported ${importData.transactions.length} transactions`);
      return { error: null };
    } catch (error) {
      console.error('❌ [SUPABASE] Import failed:', error);
      return { error };
    }
  }
}

export const supabaseService = new SupabaseService();
