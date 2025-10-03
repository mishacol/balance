import { useEffect, useRef } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { dataBackupService } from '../services/dataBackupService';

export const useAutoBackup = () => {
  const { backupMode, transactions } = useTransactionStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 🚨 EMERGENCY: AUTOMATIC BACKUP COMPLETELY DISABLED
    console.log('🚨 EMERGENCY: All automatic backups DISABLED due to data corruption');
    console.log('🔒 NO AUTOMATIC BACKUPS WILL BE CREATED');
    console.log('📝 Only manual backups are allowed via Backup Manager');
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup on unmount or mode change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [backupMode, transactions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
