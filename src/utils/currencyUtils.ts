import { currencyService } from '../services/currencyService';
import { Transaction } from '../types';

/**
 * Centralized currency conversion utilities to prevent recurring conversion issues
 */

export interface ConvertedAmount {
  amount: number;
  currency: string;
  convertedAmount: number;
}

/**
 * Convert a single transaction amount to base currency
 */
export async function convertTransactionAmount(
  transaction: Transaction,
  baseCurrency: string
): Promise<number> {
  if (transaction.currency === baseCurrency) {
    return transaction.amount;
  }
  
  return await currencyService.convertAmount(
    transaction.amount,
    transaction.currency,
    baseCurrency
  );
}

/**
 * Convert multiple transaction amounts to base currency
 */
export async function convertTransactionAmounts(
  transactions: Transaction[],
  baseCurrency: string
): Promise<ConvertedAmount[]> {
  if (transactions.length === 0) return [];
  
  // Check if conversion is needed
  const needsConversion = transactions.some(t => t.currency !== baseCurrency);
  
  if (!needsConversion) {
    return transactions.map(t => ({
      amount: t.amount,
      currency: t.currency,
      convertedAmount: t.amount
    }));
  }
  
  // Convert all amounts
  const amountsToConvert = transactions.map(t => ({
    amount: t.amount,
    currency: t.currency
  }));
  
  const convertedAmounts = await currencyService.convertAmounts(amountsToConvert, baseCurrency);
  
  return convertedAmounts.map((converted, index) => ({
    amount: transactions[index].amount,
    currency: transactions[index].currency,
    convertedAmount: converted.convertedAmount
  }));
}

/**
 * Calculate total amount from transactions, converting to base currency
 */
export async function calculateTotalAmount(
  transactions: Transaction[],
  baseCurrency: string
): Promise<number> {
  if (transactions.length === 0) return 0;
  
  const convertedAmounts = await convertTransactionAmounts(transactions, baseCurrency);
  return convertedAmounts.reduce((sum, item) => sum + item.convertedAmount, 0);
}

/**
 * Calculate totals by transaction type, converting to base currency
 */
export async function calculateTotalsByType(
  transactions: Transaction[],
  baseCurrency: string
): Promise<{
  income: number;
  expenses: number;
  investments: number;
  netBalance: number;
}> {
  if (transactions.length === 0) {
    return { income: 0, expenses: 0, investments: 0, netBalance: 0 };
  }
  
  const convertedAmounts = await convertTransactionAmounts(transactions, baseCurrency);
  
  let income = 0;
  let expenses = 0;
  let investments = 0;
  
  convertedAmounts.forEach((converted, index) => {
    const transaction = transactions[index];
    const amount = converted.convertedAmount;
    
    switch (transaction.type) {
      case 'income':
        income += amount;
        break;
      case 'expense':
        expenses += amount;
        break;
      case 'investment':
        investments += amount;
        break;
    }
  });
  
  return {
    income,
    expenses,
    investments,
    netBalance: income - expenses
  };
}

/**
 * Calculate totals by category, converting to base currency
 */
export async function calculateTotalsByCategory(
  transactions: Transaction[],
  baseCurrency: string
): Promise<Array<{ category: string; amount: number; convertedAmount: number }>> {
  if (transactions.length === 0) return [];
  
  const convertedAmounts = await convertTransactionAmounts(transactions, baseCurrency);
  const categoryMap: Record<string, { amount: number; convertedAmount: number }> = {};
  
  convertedAmounts.forEach((converted, index) => {
    const transaction = transactions[index];
    const category = transaction.category;
    
    if (!categoryMap[category]) {
      categoryMap[category] = { amount: 0, convertedAmount: 0 };
    }
    
    categoryMap[category].amount += transaction.amount;
    categoryMap[category].convertedAmount += converted.convertedAmount;
  });
  
  return Object.entries(categoryMap).map(([category, totals]) => ({
    category,
    amount: totals.amount,
    convertedAmount: totals.convertedAmount
  }));
}
