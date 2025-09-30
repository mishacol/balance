import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';
import { ArrowUpRightIcon, ArrowDownLeftIcon, EditIcon, TrashIcon } from 'lucide-react';
import { useTransactionStore } from '../../store/transactionStore';
interface TransactionListProps {
  transactions: Transaction[];
  compact?: boolean;
}
export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  compact = false
}) => {
  const navigate = useNavigate();
  const { deleteTransaction } = useTransactionStore();

  const handleEdit = (transaction: Transaction) => {
    navigate(`/edit-transaction/${transaction.id}`);
  };

  const handleDelete = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(transactionId);
    }
  };

  return <div className="w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-gray-400 text-xs">
            <th className="pb-2 font-normal">Type</th>
            <th className="pb-2 font-normal">Date</th>
            {!compact && <th className="pb-2 font-normal">Category</th>}
            <th className="pb-2 font-normal">Description</th>
            <th className="pb-2 font-normal text-right">Amount</th>
            {!compact && <th className="pb-2 font-normal text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="font-mono">
          {transactions.map(transaction => <tr key={transaction.id} className="border-b border-border hover:bg-border/30 transition-colors">
              <td className="py-3">
                {transaction.type === 'income' ? <div className="flex items-center">
                    <span className="bg-income/10 p-1 rounded">
                      <ArrowUpRightIcon size={16} className="text-income" />
                    </span>
                  </div> : <div className="flex items-center">
                    <span className="bg-expense/10 p-1 rounded">
                      <ArrowDownLeftIcon size={16} className="text-expense" />
                    </span>
                  </div>}
              </td>
              <td className="py-3 text-xs">
                {compact ? formatShortDate(transaction.date) : formatDate(transaction.date)}
              </td>
              {!compact && <td className="py-3 text-xs">
                <span className="bg-surface px-2 py-1 rounded text-xs">
                  {transaction.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </td>}
              <td className="py-3 text-xs">{transaction.description}</td>
              <td className={`py-3 text-right text-xs ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </td>
              {!compact && <td className="py-3 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="p-1 rounded hover:bg-highlight/20 transition-colors group"
                    title="Edit transaction"
                  >
                    <EditIcon size={14} className="text-gray-400 group-hover:text-highlight" />
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="p-1 rounded hover:bg-expense/20 transition-colors group"
                    title="Delete transaction"
                  >
                    <TrashIcon size={14} className="text-gray-400 group-hover:text-expense" />
                  </button>
                </div>
              </td>}
            </tr>)}
        </tbody>
      </table>
    </div>;
};