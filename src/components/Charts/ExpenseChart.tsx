import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { useTransactionStore } from '../../store/transactionStore';

interface ChartData {
  month: string;
  income: number;
  expenses: number;
  investments: number;
}

interface ExpenseChartProps {
  data: ChartData[];
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  data
}) => {
  const { baseCurrency } = useTransactionStore();
  
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-background border border-border p-3 rounded-md text-xs font-mono">
          <p className="text-gray-400 mb-1">{label}</p>
          <p className="text-income">
            Income: {formatCurrency(payload[0].value, baseCurrency)}
          </p>
          <p className="text-expense">
            Expenses: {formatCurrency(payload[1].value, baseCurrency)}
          </p>
          <p className="text-blue-400">
            Investments: {formatCurrency(payload[2].value, baseCurrency)}
          </p>
          <p className="text-highlight pt-1 border-t border-border mt-1">
            Net: {formatCurrency(payload[0].value - payload[1].value, baseCurrency)}
          </p>
        </div>;
    }
    return null;
  };

  return <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{
      top: 10,
      right: 10,
      left: 0,
      bottom: 0
    }} style={{
      cursor: 'pointer'
    }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
        <XAxis dataKey="month" axisLine={{
        stroke: '#1f1f1f'
      }} tick={{
        fill: '#888888',
        fontSize: 12
      }} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} tick={{
        fill: '#888888',
        fontSize: 12
      }} tickFormatter={value => `${baseCurrency} ${value}`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="income" fill="#00ff41" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="expenses" fill="#ff004d" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="investments" fill="#0080ff" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>;
};