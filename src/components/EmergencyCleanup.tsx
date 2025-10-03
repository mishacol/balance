import React from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { supabaseService } from '../services/supabaseService';

export const EmergencyCleanup: React.FC = () => {
  const { transactions } = useTransactionStore();
  
  // Hide if no transactions
  if (transactions.length === 0) {
    return null;
  }
  
  const handleEmergencyCleanup = async () => {
    if (!confirm(`⚠️ EMERGENCY CLEANUP\n\nThis will delete ALL ${transactions.length} transactions from Supabase and localStorage.\n\nAre you sure? This cannot be undone!`)) {
      return;
    }

    try {
      console.log('🚨 Starting emergency cleanup...');
      
      // Clear Supabase transactions
      const { error } = await supabaseService.clearAllTransactions();
      if (error) throw error;
      
      // Clear localStorage  
      localStorage.removeItem('transaction-storage');
      console.log('🗑️ Cleared localStorage');
      
      // Clear local store
      useTransactionStore.setState({ transactions: [] });
      
      console.log('✅ Emergency cleanup completed!');
      alert('✅ Emergency cleanup completed!\n\nYou can now import your backup file again safely.');
      
      // Reload page
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      alert('❌ Emergency cleanup failed. Check console for details.');
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
      <h3 className="text-red-400 font-bold text-lg mb-4">🚨 Emergency Transaction Cleanup</h3>
      <p className="text-gray-300 mb-4">
        You have {transactions.length} transactions (should be ~311). This indicates duplicate data.
      </p>
      <button
        onClick={handleEmergencyCleanup}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Clear All Data & Start Fresh
      </button>
      <p className="text-xs text-gray-400 mt-2">
        This will delete all transactions and clear localStorage. You'll need to re-import your backup.
      </p>
    </div>
  );
};
