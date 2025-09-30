import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
}).refine((data) => {
  // If category is "other", description must be more descriptive
  if (data.category === 'other') {
    return data.description && data.description.length >= 5;
  }
  return true;
}, {
  message: 'Please provide a more detailed description for "Other" category (at least 5 characters)',
  path: ['description'],
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
