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

    // Set up automatic backup if mode is 'automatic'
    if (backupMode === 'automatic') {
      console.log('🔄 Starting automatic backup timer (15 minutes)');
      
      intervalRef.current = setInterval(() => {
        console.log('⏰ Creating automatic backup...');
        dataBackupService.createBackup(transactions);
      }, 15 * 60 * 1000); // 15 minutes in milliseconds
    } else {
      console.log('⏹️ Automatic backup disabled (manual mode)');
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
