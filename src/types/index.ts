export type TransactionType = 'income' | 'expense' | 'investment';
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}
export interface CategoryTotal {
  category: string;
  amount: number;
}
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  monthlyAvailable: number;
  cumulativeAvailable: number;
  cumulativeInvestments: number;
  netBalance: number;
  incomeByCurrency: Record<string, number>;
  expensesByCurrency: Record<string, number>;
  investmentsByCurrency: Record<string, number>;
}

// Global window interface for debugging
declare global {
  interface Window {
    useTransactionStore: any;
  }
}