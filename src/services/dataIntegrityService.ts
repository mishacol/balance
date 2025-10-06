import { supabase } from '../lib/supabase';

export interface IntegrityCheckResult {
  passed: boolean;
  issues: string[];
  transactionCount: number;
  dateRange: { start: string; end: string };
  checksum: string;
}

export interface DataLossAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  transactionCount: number;
  previousCount: number;
}

export class DataIntegrityService {
  private static instance: DataIntegrityService;
  private lastTransactionCount = 0;
  private lastChecksum = '';
  private alerts: DataLossAlert[] = [];

  static getInstance(): DataIntegrityService {
    if (!DataIntegrityService.instance) {
      DataIntegrityService.instance = new DataIntegrityService();
    }
    return DataIntegrityService.instance;
  }

  /**
   * Perform comprehensive integrity check
   */
  async performIntegrityCheck(): Promise<IntegrityCheckResult> {
    try {
      console.log('🔍 [INTEGRITY] Starting comprehensive integrity check...');
      
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        return {
          passed: false,
          issues: ['User not authenticated'],
          transactionCount: 0,
          dateRange: { start: '', end: '' },
          checksum: ''
        };
      }

      // Fetch all transactions
      let allTransactions = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          return {
            passed: false,
            issues: [`Database error: ${error.message}`],
            transactionCount: 0,
            dateRange: { start: '', end: '' },
            checksum: ''
          };
        }

        if (data && data.length > 0) {
          allTransactions = allTransactions.concat(data);
          offset += data.length;
        } else {
          hasMore = false;
        }
      }

      const transactionCount = allTransactions.length;
      const issues: string[] = [];

      // Check 1: Transaction count consistency
      if (this.lastTransactionCount > 0 && transactionCount < this.lastTransactionCount) {
        const lostCount = this.lastTransactionCount - transactionCount;
        issues.push(`⚠️ POTENTIAL DATA LOSS: ${lostCount} transactions missing (was ${this.lastTransactionCount}, now ${transactionCount})`);
        
        this.addAlert({
          severity: 'critical',
          message: `Potential data loss detected: ${lostCount} transactions missing`,
          timestamp: Date.now(),
          transactionCount,
          previousCount: this.lastTransactionCount
        });
      }

      // Check 2: Required fields validation
      const requiredFields = ['id', 'type', 'amount', 'currency', 'category', 'description', 'date'];
      const invalidTransactions = allTransactions.filter(t => 
        !requiredFields.every(field => t.hasOwnProperty(field) && t[field] !== null && t[field] !== undefined)
      );

      if (invalidTransactions.length > 0) {
        issues.push(`❌ ${invalidTransactions.length} transactions missing required fields`);
      }

      // Check 3: Data type validation
      const typeIssues = allTransactions.filter(t => 
        typeof t.amount !== 'number' || 
        typeof t.type !== 'string' || 
        typeof t.currency !== 'string' ||
        typeof t.category !== 'string' ||
        typeof t.description !== 'string' ||
        typeof t.date !== 'string'
      );

      if (typeIssues.length > 0) {
        issues.push(`❌ ${typeIssues.length} transactions have invalid data types`);
      }

      // Check 4: Date validation
      const dateIssues = allTransactions.filter(t => {
        try {
          const date = new Date(t.date);
          return isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100;
        } catch {
          return true;
        }
      });

      if (dateIssues.length > 0) {
        issues.push(`❌ ${dateIssues.length} transactions have invalid dates`);
      }

      // Check 5: Duplicate detection
      const duplicateIds = new Set();
      const duplicateContent = new Set();
      let duplicateCount = 0;

      allTransactions.forEach(t => {
        if (duplicateIds.has(t.id)) {
          duplicateCount++;
        } else {
          duplicateIds.add(t.id);
        }

        const contentKey = JSON.stringify({
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          category: t.category,
          description: t.description,
          date: t.date
        });

        if (duplicateContent.has(contentKey)) {
          duplicateCount++;
        } else {
          duplicateContent.add(contentKey);
        }
      });

      if (duplicateCount > 0) {
        issues.push(`⚠️ ${duplicateCount} duplicate transactions detected`);
      }

      // Check 6: Checksum validation
      const currentChecksum = await this.calculateChecksum(allTransactions);
      if (this.lastChecksum && this.lastChecksum !== currentChecksum) {
        issues.push('⚠️ Data checksum changed - possible data corruption');
      }

      // Calculate date range
      const dateRange = this.calculateDateRange(allTransactions);

      // Update tracking variables
      this.lastTransactionCount = transactionCount;
      this.lastChecksum = currentChecksum;

      const passed = issues.length === 0;

      console.log(`✅ [INTEGRITY] Check completed: ${passed ? 'PASSED' : 'FAILED'}`);
      if (issues.length > 0) {
        console.log(`❌ [INTEGRITY] Issues found:`, issues);
      }

      return {
        passed,
        issues,
        transactionCount,
        dateRange,
        checksum: currentChecksum
      };

    } catch (error) {
      console.error('❌ [INTEGRITY] Integrity check failed:', error);
      return {
        passed: false,
        issues: [`Integrity check failed: ${error}`],
        transactionCount: 0,
        dateRange: { start: '', end: '' },
        checksum: ''
      };
    }
  }

  /**
   * Monitor for data loss in real-time
   */
  startDataLossMonitoring(): void {
    console.log('🔍 [MONITOR] Starting data loss monitoring...');
    
    // Check every 5 minutes
    setInterval(async () => {
      const result = await this.performIntegrityCheck();
      
      if (!result.passed) {
        console.error('🚨 [MONITOR] Data integrity issues detected:', result.issues);
        
        // Auto-create backup if critical issues found
        const criticalIssues = result.issues.filter(issue => 
          issue.includes('DATA LOSS') || issue.includes('critical')
        );
        
        if (criticalIssues.length > 0) {
          console.log('🚨 [MONITOR] Critical issues detected - creating emergency backup...');
          // Import the backup service and create emergency backup
          const { databaseBackupService } = await import('./databaseBackupService');
          await databaseBackupService.createBackup('Emergency backup - data loss detected');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    this.performIntegrityCheck();
  }

  /**
   * Get data loss alerts
   */
  getAlerts(): DataLossAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Add alert
   */
  private addAlert(alert: DataLossAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error('🚨 [ALERT]', alert.message);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(transactions: any[]): Promise<string> {
    const sortedTransactions = transactions
      .map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category: t.category,
        description: t.description,
        date: t.date,
        created_at: t.created_at
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const dataString = JSON.stringify(sortedTransactions);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculate date range from transactions
   */
  private calculateDateRange(transactions: any[]): { start: string; end: string } {
    if (transactions.length === 0) {
      return { start: '', end: '' };
    }

    const dates = transactions.map(t => t.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }

  /**
   * Get integrity statistics
   */
  getIntegrityStats(): {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    criticalAlerts: number;
    lastCheckTime: number;
  } {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    
    return {
      totalChecks: this.alerts.length,
      passedChecks: this.alerts.filter(a => a.severity === 'low').length,
      failedChecks: this.alerts.filter(a => a.severity !== 'low').length,
      criticalAlerts,
      lastCheckTime: this.alerts.length > 0 ? this.alerts[this.alerts.length - 1].timestamp : 0
    };
  }
}

export const dataIntegrityService = DataIntegrityService.getInstance();
