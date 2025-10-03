import React from 'react';
import { AppRouter } from './AppRouter';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuth } from './hooks/useAuth';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useTransactionStore } from './store/transactionStore';

export function App() {
  const { loading, isAuthenticated } = useAuth();
  const { switchToSupabase, loadTransactionsFromSupabase, migrateFromLocalStorage } = useTransactionStore();
  
  // Initialize automatic backup system
  useAutoBackup();

  // Initialize Supabase when authenticated
  React.useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('🔐 Authenticated - Switching to Supabase');
      
      // First, switch to Supabase flag
      switchToSupabase();
      
      // Load user data from Supabase
      loadTransactionsFromSupabase().catch(error => {
        console.error('Failed to load transactions from Supabase:', error);
      });
      
      // Only migrate if this is the first time (localStorage will be cleared after migration)
      migrateFromLocalStorage().catch(error => {
        console.error('Migration failed:', error);
      });
    }
  }, [isAuthenticated, loading, switchToSupabase, loadTransactionsFromSupabase, migrateFromLocalStorage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-highlight mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="bg-background text-white min-h-screen">
      <AppRouter />
    </div>
  );
}