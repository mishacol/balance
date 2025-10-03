/**
 * EMERGENCY CLEANUP UTILITY
 * Clears all localStorage data to prevent corruption
 */

export function clearAllStorage() {
  console.log('🚨 EMERGENCY CLEANUP: Clearing all localStorage data');
  
  // List of all keys that might contain transaction data
  const keysToRemove = [
    'transaction-storage',
    'balance-backup-',
    'backup-',
    'data-backup',
    'supabase-storage',
    'recent-transactions',
    'cached-transactions'
  ];
  
  // Clear specific keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear any keys that match patterns
  Object.keys(localStorage).forEach(key => {
    if (
      key.includes('backup') ||
      key.includes('transaction') ||
      key.includes('balance') ||
      key.includes('data')
    ) {
      console.log(`🗑️ Removing corrupted storage: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ localStorage cleanup completed');
}

// Auto-clear on import for development
if (import.meta.env.DEV) {
  console.log('🔧 DEVELOPMENT: Auto-clearing corrupted storage on import');
  clearAllStorage();
}
