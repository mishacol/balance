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
    getBackupInfo 
  } = useTransactionStore();
  
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
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
    try {
      // Get all backups from localStorage
      const backups = dataBackupService.getBackups();
      
      if (backups.length === 0) {
        setImportError('No backups found in local storage');
        return;
      }

      // Restore from the most recent backup (index 0)
      const mostRecentBackup = backups[0];
      restoreFromBackup(0);
      
      setRestoreSuccess(true);
      setTimeout(() => setRestoreSuccess(false), 3000);
    } catch (error) {
      setImportError('Failed to restore from backup');
    }
  };

  return (
    <Card title="Data Backup & Recovery" className="mb-6">
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Create & Download</h3>
            <div className="space-y-2">
              <button
                onClick={handleCreateBackup}
                className="w-full bg-highlight/20 hover:bg-highlight/30 text-highlight px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <CheckIcon size={16} className="mr-2" />
                Create Backup
              </button>
              <button
                onClick={handleDownloadBackup}
                className="w-full bg-income/20 hover:bg-income/30 text-income px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <DownloadIcon size={16} className="mr-2" />
                Download Backup
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Import & Restore</h3>
            <div className="space-y-2">
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
                className="w-full bg-expense/20 hover:bg-expense/30 text-expense px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <UploadIcon size={16} className="mr-2" />
                {isImporting ? 'Importing...' : 'Import Backup'}
              </button>
              
              <button
                onClick={handleRestore}
                disabled={isImporting}
                className="w-full bg-warning/20 hover:bg-warning/30 text-warning px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <RotateCcwIcon size={16} className="mr-2" />
                {isImporting ? 'Restoring...' : 'Restore from Backup'}
              </button>
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

        {/* Instructions */}
        <div className="bg-surface/30 rounded-lg p-4 text-sm text-gray-400">
          <h4 className="font-semibold text-white mb-2">How to use:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Create Backup:</strong> Saves current data to local storage</li>
            <li><strong>Download Backup:</strong> Downloads a JSON file with all your data</li>
            <li><strong>Import Backup:</strong> Adds data from a backup file to existing data</li>
            <li><strong>Restore from Backup:</strong> Restores data from the most recent automatic backup in local storage</li>
            <li>Backups are automatically created when you add, edit, or delete transactions</li>
            <li>Keep downloaded backups in a safe place for disaster recovery</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
