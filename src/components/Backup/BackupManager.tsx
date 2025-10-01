import React, { useState, useRef } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { Card } from '../ui/Card';
import { DownloadIcon, UploadIcon, HistoryIcon, TrashIcon, CheckIcon, CheckCircleIcon, RotateCcwIcon } from 'lucide-react';
import { dataBackupService } from '../../services/dataBackupService';

export const BackupManager: React.FC = () => {
  const { 
    createBackup, 
    restoreFromBackup, 
    exportData, 
    importData, 
    downloadBackup, 
    getBackupInfo,
    backupMode 
  } = useTransactionStore();
  
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const backupInfo = getBackupInfo();

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importData(content);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (error) {
        setImportError('Invalid backup file format');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadBackup = () => {
    downloadBackup();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleCreateBackup = () => {
    createBackup();
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 3000);
  };

  const handleRestore = () => {
    setShowRestoreConfirm(true);
  };

  const confirmRestore = () => {
    try {
      // Get all backups from localStorage
      const backups = dataBackupService.getBackups();
      
      if (backups.length === 0) {
        setImportError('No backups found in local storage');
        setShowRestoreConfirm(false);
        return;
      }

      // Restore from the most recent backup (index 0)
      const mostRecentBackup = backups[0];
      restoreFromBackup(0);
      
      setRestoreSuccess(true);
      setShowRestoreConfirm(false);
      setTimeout(() => setRestoreSuccess(false), 3000);
    } catch (error) {
      setImportError('Failed to restore from backup');
      setShowRestoreConfirm(false);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(false);
  };

  return (
    <Card title="Data Backup & Recovery" className="mb-6">
      <div className="space-y-6">
        {/* Backup Mode Notice */}
        <div className={`rounded-lg p-4 border-l-4 ${
          backupMode === 'automatic' 
            ? 'bg-green-900/20 border-green-500' 
            : 'bg-blue-900/20 border-blue-500'
        }`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              backupMode === 'automatic' ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <div>
              <h4 className="font-semibold text-white">
                {backupMode === 'automatic' ? 'Automatic Backup Mode' : 'Manual Backup Mode'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {backupMode === 'automatic' 
                  ? 'Backups are created automatically every 15 minutes'
                  : 'Backups are created manually when you add, edit, or delete transactions'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="bg-surface/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <HistoryIcon size={20} className="mr-2" />
            Backup Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Backups:</span>
              <span className="ml-2 font-mono">{backupInfo.count}</span>
            </div>
            <div>
              <span className="text-gray-400">Latest Backup:</span>
              <span className="ml-2 font-mono">
                {backupInfo.latest ? backupInfo.latest.toLocaleDateString() + ' ' + backupInfo.latest.toLocaleTimeString() : 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Storage Used:</span>
              <span className="ml-2 font-mono">
                {(backupInfo.totalSize / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Create & Download</h3>
            
            {/* Create Backup */}
            <div className="bg-surface/30 rounded-lg p-4 border border-border/50">
              <button
                onClick={handleCreateBackup}
                className="w-full bg-highlight/20 hover:bg-highlight/30 text-highlight px-4 py-3 rounded-lg transition-colors flex items-center justify-center mb-3"
              >
                <CheckIcon size={16} className="mr-2" />
                Create Backup
              </button>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-highlight font-medium">Saves current data to local storage</span><br/>
                Creates a backup that can be restored later. Perfect for manual backup mode.
              </p>
            </div>

            {/* Download Backup */}
            <div className="bg-surface/30 rounded-lg p-4 border border-border/50">
              <button
                onClick={handleDownloadBackup}
                className="w-full bg-income/20 hover:bg-income/30 text-income px-4 py-3 rounded-lg transition-colors flex items-center justify-center mb-3"
              >
                <DownloadIcon size={16} className="mr-2" />
                Download Backup
              </button>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-income font-medium">Downloads a JSON file with all your data</span><br/>
                Save your transactions as a file for external storage or sharing. Includes timestamp.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Import & Restore</h3>
            
            {/* Import Backup */}
            <div className="bg-surface/30 rounded-lg p-4 border border-border/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full bg-expense/20 hover:bg-expense/30 text-expense px-4 py-3 rounded-lg transition-colors flex items-center justify-center mb-3 disabled:opacity-50"
              >
                <UploadIcon size={16} className="mr-2" />
                {isImporting ? 'Importing...' : 'Import Backup'}
              </button>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-expense font-medium">Adds data from a backup file to existing data</span><br/>
                Merge transactions from a backup file with your current data. No data loss.
              </p>
            </div>

            {/* Restore from Backup */}
            <div className="bg-surface/30 rounded-lg p-4 border border-border/50">
              <button
                onClick={handleRestore}
                disabled={isImporting}
                className="w-full bg-warning/20 hover:bg-warning/30 text-warning px-4 py-3 rounded-lg transition-colors flex items-center justify-center mb-3 disabled:opacity-50"
              >
                <RotateCcwIcon size={16} className="mr-2" />
                {isImporting ? 'Restoring...' : 'Restore from Backup'}
              </button>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-warning font-medium">Restores data from the most recent automatic backup</span><br/>
                Replaces all current data with the latest backup. Use with caution - this will overwrite current data.
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {importError && (
          <div className="bg-expense/20 border border-expense/30 text-expense px-4 py-2 rounded-lg">
            {importError}
          </div>
        )}
        
        {importSuccess && (
          <div className="bg-income/20 border border-income/30 text-income px-4 py-2 rounded-lg flex items-center">
            <CheckCircleIcon size={16} className="mr-2" />
            Backup imported successfully!
          </div>
        )}

        {backupSuccess && (
          <div className="bg-highlight/20 border border-highlight/30 text-highlight px-4 py-2 rounded-lg flex items-center">
            <CheckCircleIcon size={16} className="mr-2" />
            Backup created successfully!
          </div>
        )}

        {downloadSuccess && (
          <div className="bg-income/20 border border-income/30 text-income px-4 py-2 rounded-lg flex items-center">
            <CheckCircleIcon size={16} className="mr-2" />
            Backup downloaded successfully!
          </div>
        )}

        {restoreSuccess && (
          <div className="bg-warning/20 border border-warning/30 text-warning px-4 py-2 rounded-lg flex items-center">
            <CheckCircleIcon size={16} className="mr-2" />
            Data restored successfully!
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        {showRestoreConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface border border-border rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center mr-3">
                  <RotateCcwIcon size={20} className="text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-white">Confirm Restore</h3>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                This action will <span className="text-warning font-medium">replace all current data</span> with the most recent backup. 
                Any unsaved changes will be permanently lost.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelRestore}
                  className="flex-1 bg-surface border border-border text-white px-4 py-2 rounded-lg hover:bg-surface/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  className="flex-1 bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg transition-colors"
                >
                  Restore Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
