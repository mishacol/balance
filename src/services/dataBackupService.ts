import { Transaction } from '../types';

export interface BackupData {
  transactions: Transaction[];
  timestamp: number;
  version: string;
}

export interface ExportData {
  transactions: Transaction[];
  exportDate: string;
  version: string;
  totalTransactions: number;
}

class DataBackupService {
  private readonly BACKUP_KEY = 'balance-backup';
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly MAX_BACKUPS = 10;

  // Create automatic backup
  createBackup(transactions: Transaction[]): void {
    try {
      const backup: BackupData = {
        transactions: [...transactions],
        timestamp: Date.now(),
        version: this.BACKUP_VERSION
      };

      // Get existing backups
      const existingBackups = this.getBackups();
      
      // Add new backup
      existingBackups.unshift(backup);
      
      // Keep only the latest backups
      if (existingBackups.length > this.MAX_BACKUPS) {
        existingBackups.splice(this.MAX_BACKUPS);
      }

      // Save backups
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(existingBackups));
      
      console.log(`✅ Backup created: ${transactions.length} transactions`);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
    }
  }

  // Get all backups
  getBackups(): BackupData[] {
    try {
      const backups = localStorage.getItem(this.BACKUP_KEY);
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('❌ Failed to get backups:', error);
      return [];
    }
  }

  // Restore from backup
  restoreFromBackup(backupIndex: number): Transaction[] {
    try {
      const backups = this.getBackups();
      if (backupIndex >= 0 && backupIndex < backups.length) {
        const backup = backups[backupIndex];
        console.log(`✅ Restored backup: ${backup.transactions.length} transactions from ${new Date(backup.timestamp).toLocaleString()}`);
        return backup.transactions;
      }
      throw new Error('Invalid backup index');
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      return [];
    }
  }

  // Export data to JSON
  exportData(transactions: Transaction[]): string {
    try {
      const exportData: ExportData = {
        transactions: [...transactions],
        exportDate: new Date().toISOString(),
        version: this.BACKUP_VERSION,
        totalTransactions: transactions.length
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      return '';
    }
  }

  // Import data from JSON
  importData(jsonData: string): Transaction[] {
    try {
      const importData: ExportData = JSON.parse(jsonData);
      
      // Validate data structure
      if (!importData.transactions || !Array.isArray(importData.transactions)) {
        throw new Error('Invalid data format');
      }

      console.log(`✅ Imported data: ${importData.transactions.length} transactions from ${importData.exportDate}`);
      return importData.transactions;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      throw new Error('Invalid import data');
    }
  }

  // Download backup as file
  downloadBackup(transactions: Transaction[]): void {
    try {
      const data = this.exportData(transactions);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Backup downloaded');
    } catch (error) {
      console.error('❌ Failed to download backup:', error);
    }
  }

  // Clear all backups
  clearBackups(): void {
    try {
      localStorage.removeItem(this.BACKUP_KEY);
      console.log('✅ All backups cleared');
    } catch (error) {
      console.error('❌ Failed to clear backups:', error);
    }
  }

  // Get backup info
  getBackupInfo(): { count: number; latest: Date | null; totalSize: number } {
    try {
      const backups = this.getBackups();
      const latest = backups.length > 0 ? new Date(backups[0].timestamp) : null;
      const totalSize = JSON.stringify(backups).length;
      
      return {
        count: backups.length,
        latest,
        totalSize
      };
    } catch (error) {
      console.error('❌ Failed to get backup info:', error);
      return { count: 0, latest: null, totalSize: 0 };
    }
  }
}

export const dataBackupService = new DataBackupService();
