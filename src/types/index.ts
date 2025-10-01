export type TransactionType = 'income' | 'expense' | 'investment';
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
}
export interface CategoryTotal {
  category: string;
  amount: number;
}
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  incomeByCurrency: Record<string, number>;
  expensesByCurrency: Record<string, number>;
}