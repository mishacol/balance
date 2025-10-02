import { createClient } from '@supabase/supabase-js';

// These will be set via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          base_currency: string;
          monthly_income_target: number;
          backup_mode: 'manual' | 'automatic';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          base_currency?: string;
          monthly_income_target?: number;
          backup_mode?: 'manual' | 'automatic';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          base_currency?: string;
          monthly_income_target?: number;
          backup_mode?: 'manual' | 'automatic';
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'income' | 'expense' | 'investment';
          amount: number;
          currency: string;
          category: string;
          description: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'income' | 'expense' | 'investment';
          amount: number;
          currency: string;
          category: string;
          description: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'income' | 'expense' | 'investment';
          amount?: number;
          currency?: string;
          category?: string;
          description?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      backups: {
        Row: {
          id: string;
          user_id: string;
          transactions: any; // JSON data
          timestamp: number;
          version: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transactions: any;
          timestamp: number;
          version: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transactions?: any;
          timestamp?: number;
          version?: string;
          description?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
