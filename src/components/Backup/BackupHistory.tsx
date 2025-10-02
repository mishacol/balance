import React, { useState, useEffect } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { dataBackupService } from '../../services/dataBackupService';
import { RotateCcwIcon, CalendarIcon, DatabaseIcon, AlertTriangleIcon } from 'lucide-react';

interface BackupItem {
  index: number;
  timestamp: number;
  transactionCount: number;
  date: string;
  time: string;
}

export const BackupHistory: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<number | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  
  const { restoreFromBackup, transactions } = useTransactionStore();

  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = () => {
    try {
      const backupData = dataBackupService.getBackups();
      const backupList: BackupItem[] = backupData.map((backup, index) => {
        const date = new Date(backup.timestamp);
        return {
          index,
          timestamp: backup.timestamp,
          transactionCount: backup.transactions.length,
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
        };
      });
      
      setBackups(backupList);
      console.log(`📊 Loaded ${backupList.length} backups from history`);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    }
  };

  const handleRestore = (backupIndex: number) => {
    setSelectedBackup(backupIndex);
    setShowRestoreConfirm(true);
  };

  const confirmRestore = () => {
    if (selectedBackup === null) return;
    
    setIsRestoring(true);
    setRestoreStatus('Restoring backup...');
    
    try {
      const backup = backups[selectedBackup];
      restoreFromBackup(selectedBackup);
      
      setRestoreStatus(`✅ Successfully restored backup from ${backup.date} ${backup.time} (${backup.transactionCount} transactions)`);
      setShowRestoreConfirm(false);
      setSelectedBackup(null);
      
      // Refresh backup history
      setTimeout(() => {
        loadBackupHistory();
        setRestoreStatus('');
      }, 2000);
      
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreStatus('❌ Failed to restore backup. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(false);
    setSelectedBackup(null);
  };

  if (backups.length === 0) {
    return (
      <div className="bg-surface/30 rounded-lg p-6 border border-border/50">
        <div className="text-center">
          <DatabaseIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Backup History</h3>
          <p className="text-gray-400 text-sm">
            No backups found in local storage. Create a backup first to see restore options.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface/30 rounded-lg p-6 border border-border/50">
        <div className="flex items-center mb-4">
          <CalendarIcon size={20} className="text-highlight mr-2" />
          <h3 className="text-lg font-semibold text-white">Backup History</h3>
          <span className="ml-auto text-sm text-gray-400">
            {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {backups.map((backup) => (
            <div
              key={backup.index}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                selectedBackup === backup.index
                  ? 'bg-highlight/10 border-highlight/30'
                  : 'bg-background/50 border-border/30 hover:bg-background/70'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-highlight rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">
                      {backup.date} at {backup.time}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {backup.transactionCount} transaction{backup.transactionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleRestore(backup.index)}
                disabled={isRestoring}
                className="bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <RotateCcwIcon size={16} />
                <span>Restore</span>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangleIcon size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-300">
              <p className="font-medium">Important:</p>
              <p>Restoring a backup will replace all current data. Make sure to create a backup of your current data first if needed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && selectedBackup !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center mr-3">
                <RotateCcwIcon size={20} className="text-warning" />
              </div>
              <h3 className="text-lg font-semibold text-white">Confirm Restore</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                You are about to restore from:
              </p>
              <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                <p className="text-white font-medium">
                  {backups[selectedBackup].date} at {backups[selectedBackup].time}
                </p>
                <p className="text-gray-400 text-sm">
                  {backups[selectedBackup].transactionCount} transactions
                </p>
              </div>
              <p className="text-gray-300 mt-3 text-sm">
                This will <span className="text-warning font-medium">replace all current data</span> with the selected backup.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelRestore}
                disabled={isRestoring}
                className="flex-1 bg-surface border border-border text-white px-4 py-2 rounded-lg hover:bg-surface/80 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={isRestoring}
                className="flex-1 bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRestoring ? 'Restoring...' : 'Restore Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {restoreStatus && (
        <div className="bg-black/20 rounded-lg p-4">
          <p className="text-sm">{restoreStatus}</p>
        </div>
      )}
    </div>
  );
};
