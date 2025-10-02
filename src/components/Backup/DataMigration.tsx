import React, { useState } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { useAuth } from '../../hooks/useAuth';

export const DataMigration: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [showMigration, setShowMigration] = useState(false);
  
  const { transactions, migrateFromLocalStorage, isUsingSupabase } = useTransactionStore();
  const { user } = useAuth();

  const handleMigration = async () => {
    if (transactions.length === 0) {
      setMigrationStatus('No transactions found to migrate.');
      return;
    }

    setIsMigrating(true);
    setMigrationStatus('Starting migration...');

    try {
      await migrateFromLocalStorage();
      setMigrationStatus(`✅ Successfully migrated ${transactions.length} transactions to your cloud account!`);
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('❌ Migration failed. Please try again or contact support.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleImportFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.transactions && Array.isArray(data.transactions)) {
          // Import transactions
          for (const transaction of data.transactions) {
            await useTransactionStore.getState().addTransaction({
              type: transaction.type,
              amount: transaction.amount,
              currency: transaction.currency,
              category: transaction.category,
              description: transaction.description,
              date: transaction.date,
            });
          }
          
          setMigrationStatus(`✅ Successfully imported ${data.transactions.length} transactions from file!`);
        } else {
          setMigrationStatus('❌ Invalid file format. Please select a valid backup file.');
        }
      } catch (error) {
        console.error('Import failed:', error);
        setMigrationStatus('❌ Failed to import file. Please check the file format.');
      }
    };
    
    input.click();
  };

  // Don't show migration if already using Supabase or no transactions
  if (isUsingSupabase || transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-400">📦 Data Migration</h3>
        <button
          onClick={() => setShowMigration(!showMigration)}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {showMigration ? 'Hide' : 'Show Options'}
        </button>
      </div>

      <p className="text-gray-300 text-sm mb-4">
        You have {transactions.length} transactions stored locally. Migrate them to your secure cloud account for better data protection and multi-device access.
      </p>

      {showMigration && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Migrate from localStorage */}
            <div className="bg-surface/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Migrate Local Data</h4>
              <p className="text-gray-400 text-sm mb-3">
                Move your existing transactions to the cloud
              </p>
              <button
                onClick={handleMigration}
                disabled={isMigrating}
                className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isMigrating ? 'Migrating...' : 'Migrate to Cloud'}
              </button>
            </div>

            {/* Import from file */}
            <div className="bg-surface/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Import from File</h4>
              <p className="text-gray-400 text-sm mb-3">
                Import transactions from a backup file
              </p>
              <button
                onClick={handleImportFromFile}
                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg transition-colors"
              >
                Import Backup File
              </button>
            </div>
          </div>

          {migrationStatus && (
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-sm">{migrationStatus}</p>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">💡 Migration Benefits</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Your data is backed up in the cloud</li>
              <li>• Access your transactions from any device</li>
              <li>• Automatic backups and data protection</li>
              <li>• No more data loss from browser issues</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
