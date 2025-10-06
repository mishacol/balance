import React from 'react';
import { AppRouter } from './AppRouter';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuth } from './hooks/useAuth';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useTransactionStore } from './store/transactionStore';
import { duplicateCleanupService } from './services/duplicateCleanupService';
import { databaseBackupService } from './services/databaseBackupService';
import { dataIntegrityService } from './services/dataIntegrityService';
import './utils/clearStorage'; // Auto-clear corrupted storage

export function App() {
  const { loading, isAuthenticated } = useAuth();
  const { switchToSupabase, loadTransactionsFromSupabase, migrateFromLocalStorage, loadUserProfile } = useTransactionStore();
  
  // Expose store globally for debugging
  React.useEffect(() => {
    window.useTransactionStore = useTransactionStore;
  }, []);
  
  // Initialize automatic backup system
  useAutoBackup();

  // Initialize automatic duplicate cleanup system
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('🧹 [APP] Initializing automatic duplicate cleanup...');
      duplicateCleanupService.scheduleAutomaticCleanup();
    }
  }, [isAuthenticated]);

  // Initialize data protection systems
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('🛡️ [APP] Initializing data protection systems...');
      
      // Start automatic backups
      databaseBackupService.scheduleAutomaticBackups();
      
      // Start data integrity monitoring
      dataIntegrityService.startDataLossMonitoring();
      
      // Perform initial integrity check
      setTimeout(async () => {
        const result = await dataIntegrityService.performIntegrityCheck();
        if (!result.passed) {
          console.error('🚨 [APP] Initial integrity check failed:', result.issues);
          
          // Create emergency backup if critical issues found
          const criticalIssues = result.issues.filter(issue => 
            issue.includes('DATA LOSS') || issue.includes('critical')
          );
          
          if (criticalIssues.length > 0) {
            console.log('🚨 [APP] Critical issues detected - creating emergency backup...');
            await databaseBackupService.createBackup('Emergency backup - critical issues detected');
          }
        } else {
          console.log('✅ [APP] Initial integrity check passed');
        }
      }, 2000); // Wait 2 seconds for data to load
    }
  }, [isAuthenticated]);

  // Initialize Supabase when authenticated
  React.useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('🔐 Authenticated - Switching to Supabase');
      
      // First, switch to Supabase flag
      switchToSupabase();
      
      // Load user profile settings (base currency, backup mode, etc.)
      loadUserProfile().catch(error => {
        console.error('Failed to load user profile:', error);
      });
      
      // Load user data from Supabase
      loadTransactionsFromSupabase().catch(error => {
        console.error('Failed to load transactions from Supabase:', error);
      });
      
      // Only migrate if this is the first time (localStorage will be cleared after migration)
      migrateFromLocalStorage().catch(error => {
        console.error('Migration failed:', error);
      });
    }
  }, [isAuthenticated, loading, switchToSupabase, loadTransactionsFromSupabase, migrateFromLocalStorage, loadUserProfile]);

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