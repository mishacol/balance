import { Transaction, FinancialSummary, CategoryTotal } from '../types';
export const mockTransactions: Transaction[] = [{
  id: '1',
  type: 'income',
  amount: 3500,
  currency: 'USD',
  category: 'Salary',
  description: 'Monthly salary',
  date: '2023-05-01T08:00:00Z'
}, {
  id: '2',
  type: 'expense',
  amount: 1200,
  currency: 'USD',
  category: 'Housing',
  description: 'Rent payment',
  date: '2023-05-02T10:30:00Z'
}, {
  id: '3',
  type: 'expense',
  amount: 120.5,
  currency: 'USD',
  category: 'Groceries',
  description: 'Weekly grocery shopping',
  date: '2023-05-03T15:45:00Z'
}, {
  id: '4',
  type: 'expense',
  amount: 45.99,
  currency: 'USD',
  category: 'Entertainment',
  description: 'Movie tickets',
  date: '2023-05-04T19:20:00Z'
}, {
  id: '5',
  type: 'income',
  amount: 250,
  currency: 'USD',
  category: 'Freelance',
  description: 'Logo design project',
  date: '2023-05-05T14:10:00Z'
}, {
  id: '6',
  type: 'expense',
  amount: 35.4,
  currency: 'USD',
  category: 'Transportation',
  description: 'Uber ride',
  date: '2023-05-06T09:15:00Z'
}, {
  id: '7',
  type: 'expense',
  amount: 78.3,
  currency: 'USD',
  category: 'Dining',
  description: 'Dinner with friends',
  date: '2023-05-07T20:30:00Z'
}, {
  id: '8',
  type: 'income',
  amount: 18.25,
  currency: 'USD',
  category: 'Interest',
  description: 'Savings account interest',
  date: '2023-05-08T00:00:00Z'
}, {
  id: '9',
  type: 'expense',
  amount: 200,
  currency: 'USD',
  category: 'Utilities',
  description: 'Electricity bill',
  date: '2023-05-09T11:45:00Z'
}, {
  id: '10',
  type: 'expense',
  amount: 9.99,
  currency: 'USD',
  category: 'Subscriptions',
  description: 'Netflix subscription',
  date: '2023-05-10T08:00:00Z'
}];
export const mockSummary: FinancialSummary = {
  totalIncome: 3768.25,
  totalExpenses: 1690.18,
  balance: 2078.07,
  incomeByCurrency: {
    USD: 3768.25
  },
  expensesByCurrency: {
    USD: 1690.18
  }
};
export const mockCategoryTotals: CategoryTotal[] = [{
  category: 'Housing',
  amount: 1200
}, {
  category: 'Groceries',
  amount: 120.5
}, {
  category: 'Entertainment',
  amount: 45.99
}, {
  category: 'Transportation',
  amount: 35.4
}, {
  category: 'Dining',
  amount: 78.3
}, {
  category: 'Utilities',
  amount: 200
}, {
  category: 'Subscriptions',
  amount: 9.99
}];
export const mockMonthlyData = [{
  month: 'Jan',
  income: 3200,
  expenses: 1500
}, {
  month: 'Feb',
  income: 3300,
  expenses: 1600
}, {
  month: 'Mar',
  income: 3400,
  expenses: 1700
}, {
  month: 'Apr',
  income: 3500,
  expenses: 1800
}, {
  month: 'May',
  income: 3768.25,
  expenses: 1690.18
}];