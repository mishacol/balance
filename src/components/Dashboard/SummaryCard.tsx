import React from 'react';
import { Card } from '../ui/Card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
interface SummaryCardProps {
  title: string;
  amount: number;
  currency?: string;
  type?: 'income' | 'expense' | 'balance' | 'investment';
  percentage?: number;
  date?: string;
  isLoading?: boolean;
}
export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  amount,
  currency = 'USD',
  type = 'balance',
  percentage,
  date,
  isLoading = false
}) => {
  const getColor = () => {
    switch (type) {
      case 'income':
        return 'text-income';
      case 'expense':
        return 'text-expense';
      case 'investment':
        return 'text-highlight';
      case 'balance':
        return 'text-balance';
      default:
        return 'text-highlight';
    }
  };
  return <Card className="h-full">
      <div className="flex flex-col h-full">
        <h3 className="text-gray-400 text-sm">{title}</h3>
        {date && <p className="text-gray-500 text-xs mt-1">{date}</p>}
        <div className="mt-2 flex-grow">
          <div className={`text-2xl font-mono font-medium ${getColor()} ${isLoading ? 'opacity-50' : ''}`}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Converting...
              </div>
            ) : (
              formatCurrency(amount, currency)
            )}
          </div>
          {percentage !== undefined && <div className="mt-2 flex items-center text-xs">
              {percentage >= 0 ? <ArrowUpIcon size={16} className="text-income mr-1" /> : <ArrowDownIcon size={16} className="text-expense mr-1" />}
              <span className={percentage >= 0 ? 'text-income' : 'text-expense'}>
                {Math.abs(percentage).toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-1">vs last period</span>
            </div>}
        </div>
      </div>
    </Card>;
};