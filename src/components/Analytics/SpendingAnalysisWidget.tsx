import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactionStore } from '../../store/transactionStore';
import { currencyService } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatters';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TrendingUp, TrendingDown, ShoppingCart, Calendar, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface SpendingStats {
  totalSpent: number;
  averageDaily: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  periodDays: number;
}

// Consistent color mapping for spending categories
const CATEGORY_COLORS: Record<string, string> = {
  'rent-mortgage': '#8884d8',        // Purple
  'utilities': '#82ca9d',            // Green
  'groceries': '#ffc658',            // Yellow
  'transportation': '#ff7c7c',       // Red
  'healthcare': '#8dd1e1',           // Light Blue
  'entertainment': '#d084d0',        // Pink
  'dining-out': '#87d068',           // Light Green
  'shopping': '#ffb347',             // Orange
  'education': '#ff6b6b',            // Red
  'insurance': '#4ecdc4',            // Teal
  'mobile-phone': '#8884d8',        // Purple
  'cigarettes': '#ff7c7c',           // Red
  'alcohol': '#ffc658',              // Yellow
  'software-subscriptions': '#8dd1e1' // Light Blue
};

// Fallback colors for unmapped categories
const FALLBACK_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffb347', '#ff6b6b', '#4ecdc4'
];

// Helper function to get consistent color for category
const getCategoryColor = (category: string, index: number = 0): string => {
  return CATEGORY_COLORS[category.toLowerCase()] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

interface SpendingAnalysisWidgetProps {
  autoExpand?: boolean;
  initialPeriod?: string;
  initialCustomStartDate?: Date | null;
  initialCustomEndDate?: Date | null;
}

export const SpendingAnalysisWidget: React.FC<SpendingAnalysisWidgetProps> = ({ 
  autoExpand = false,
  initialPeriod = 'this-month',
  initialCustomStartDate = null,
  initialCustomEndDate = null
}) => {
  const { transactions, baseCurrency } = useTransactionStore();
  
  // Period selection state
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(initialCustomStartDate);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(initialCustomEndDate);
  
  // Analysis data state
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [spendingStats, setSpendingStats] = useState<SpendingStats>({
    totalSpent: 0,
    averageDaily: 0,
    trend: 'stable',
    trendPercentage: 0,
    periodDays: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Expandable sections state
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'this-month':
        const thisMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const thisMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())); // Today (days elapsed so far)
        return { start: thisMonthStart, end: thisMonthEnd };
      
      case 'last-month':
        const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
        return { start: lastMonthStart, end: lastMonthEnd };
      
      case 'this-year':
        const thisYearStart = new Date(Date.UTC(now.getFullYear(), 0, 1));
        const thisYearEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())); // Today (days elapsed so far)
        return { start: thisYearStart, end: thisYearEnd };
      
      case 'last-year':
        const lastYearStart = new Date(Date.UTC(now.getFullYear() - 1, 0, 1));
        const lastYearEnd = new Date(Date.UTC(now.getFullYear() - 1, 11, 31));
        return { start: lastYearStart, end: lastYearEnd };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: thisMonthStart, end: today };
      
      default:
        return { start: thisMonthStart, end: today };
    }
  };

  // Calculate spending analysis
  const calculateSpendingAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      // Filter expense transactions for the selected period
      const periodExpenses = transactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transaction.type === 'expense' && 
               transactionDate >= startStr && 
               transactionDate <= endStr;
      });

      // Convert amounts to base currency
      const convertedExpenses = await Promise.all(
        periodExpenses.map(async (transaction) => {
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          return {
            ...transaction,
            convertedAmount
          };
        })
      );

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      
      convertedExpenses.forEach(transaction => {
        const existing = categoryMap.get(transaction.category) || { amount: 0, count: 0 };
        categoryMap.set(transaction.category, {
          amount: existing.amount + transaction.convertedAmount,
          count: existing.count + 1
        });
      });

      // Calculate total spent
      const totalSpent = convertedExpenses.reduce((sum, t) => sum + t.convertedAmount, 0);
      
      // Calculate period days (inclusive of both start and end dates)
      const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      // Calculate average daily
      const averageDaily = totalSpent / periodDays;
      
      // Calculate trend (compare with previous period)
      const previousPeriod = await calculatePreviousPeriodTrend(start, end, totalSpent);
      
      // Prepare category data for pie chart
      const categoryDataArray: CategoryData[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryData(categoryDataArray);
      setSpendingStats({
        totalSpent,
        averageDaily,
        trend: previousPeriod.trend,
        trendPercentage: previousPeriod.percentage,
        periodDays
      });
      
    } catch (error) {
      console.error('Error calculating spending analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate trend by comparing with previous period
  const calculatePreviousPeriodTrend = async (start: Date, end: Date, currentTotal: number) => {
    try {
      const periodLength = end.getTime() - start.getTime();
      const previousStart = new Date(start.getTime() - periodLength);
      const previousEnd = new Date(end.getTime() - periodLength);
      
      const previousExpenses = transactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transaction.type === 'expense' && 
               transactionDate >= previousStart.toISOString().split('T')[0] && 
               transactionDate <= previousEnd.toISOString().split('T')[0];
      });

      const previousConverted = await Promise.all(
        previousExpenses.map(async (transaction) => {
          const convertedAmount = await currencyService.convertAmount(
            transaction.amount,
            transaction.currency,
            baseCurrency
          );
          return convertedAmount;
        })
      );

      const previousTotal = previousConverted.reduce((sum, amount) => sum + amount, 0);
      
      if (previousTotal === 0) {
        return { trend: 'stable' as const, percentage: 0 };
      }
      
      const percentage = ((currentTotal - previousTotal) / previousTotal) * 100;
      
      if (Math.abs(percentage) < 5) {
        return { trend: 'stable' as const, percentage };
      }
      
      return {
        trend: percentage > 0 ? 'up' as const : 'down' as const,
        percentage: Math.abs(percentage)
      };
    } catch (error) {
      console.error('Error calculating trend:', error);
      return { trend: 'stable' as const, percentage: 0 };
    }
  };

  // Update analysis when period changes
  useEffect(() => {
    calculateSpendingAnalysis();
  }, [selectedPeriod, customStartDate, customEndDate, transactions, baseCurrency]);

  // Handle auto-expansion
  useEffect(() => {
    if (autoExpand) {
      setIsExpanded(true);
    }
  }, [autoExpand]);

  // Handle custom date changes
  const handleCustomDateChange = (start: Date | null, end: Date | null) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (start && end) {
      setSelectedPeriod('custom');
    }
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get transactions for a specific category
  const getCategoryTransactions = async (category: string) => {
    const { start, end } = getDateRange();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    const categoryExpenses = transactions.filter(transaction => {
      const transactionDate = transaction.date;
      return transaction.type === 'expense' && 
             transaction.category === category &&
             transactionDate >= startStr && 
             transactionDate <= endStr;
    });

    // Convert amounts to base currency
    const convertedExpenses = await Promise.all(
      categoryExpenses.map(async (transaction) => {
        const convertedAmount = await currencyService.convertAmount(
          transaction.amount,
          transaction.currency,
          baseCurrency
        );
        return {
          ...transaction,
          convertedAmount
        };
      })
    );

    return convertedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{formatCategoryName(data.category)}</p>
          <p className="text-gray-300">
            {formatCurrency(data.amount, baseCurrency)}
          </p>
          <p className="text-gray-400 text-sm">
            {data.percentage.toFixed(1)}% • {data.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart - remove labels completely
  const renderLabel = (entry: any) => {
    return ''; // No labels at all
  };

  // Format category names to be human-readable
  const formatCategoryName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'rent-mortgage': 'Rent & Mortgage',
      'alcohol-beverages': 'Alcohol & Beverages',
      'books-magazines': 'Books & Magazines',
      'building-maintenance': 'Building Maintenance',
      'cable-satellite-tv': 'Cable & Satellite TV',
      'cable-streaming': 'Cable & Streaming',
      'cleaning-products': 'Cleaning Products',
      'coffee-shops': 'Coffee Shops',
      'fast-food': 'Fast Food',
      'freelance-income': 'Freelance Income',
      'furniture-appliances': 'Furniture & Appliances',
      'haircuts-salon': 'Haircuts & Salon',
      'hospital-emergency': 'Hospital & Emergency',
      'household-goods': 'Household Goods',
      'international-travel': 'International Travel',
      'kitchen-utensils': 'Kitchen Utensils',
      'landline-phone': 'Landline Phone',
      'lottery-gambling': 'Lottery & Gambling',
      'mobile-phone': 'Mobile Phone',
      'night-clubs': 'Night Clubs',
      'personal-hygiene': 'Personal Hygiene',
      'personal-loans': 'Personal Loans',
      'precious-metals': 'Precious Metals',
      'public-transit': 'Public Transit',
      'restaurants': 'Restaurants',
      'savings-account': 'Savings Account',
      'software-subscriptions': 'Software Subscriptions',
      'sold-items': 'Sold Items',
      'sports-recreation': 'Sports & Recreation',
      'term-deposits': 'Term Deposits',
      'vacation-travel': 'Vacation Travel',
      'water-sewer': 'Water & Sewer',
      'binance-p2p': 'Binance P2P',
      'interurban-travel': 'Interurban Travel'
    };

    // Return mapped name or format the category name
    if (categoryMap[category]) {
      return categoryMap[category];
    }

    // Default formatting: capitalize first letter of each word, replace dashes with spaces
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Component for displaying category transactions
  const CategoryTransactions = ({ category }: { category: string }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (expandedCategories.has(category)) {
        setLoading(true);
        getCategoryTransactions(category).then(data => {
          setTransactions(data);
          setLoading(false);
        });
      }
    }, [category, expandedCategories]);

    if (!expandedCategories.has(category)) return null;

    return (
      <div className="mt-4 ml-8 bg-gradient-to-r from-surface/80 to-background/80 rounded-xl p-4 border border-border-light">
        <div className="text-sm text-highlight mb-3 font-medium">Transactions in {formatCategoryName(category)}:</div>
        {loading ? (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-highlight"></div>
            Loading...
          </div>
        ) : (
          <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center text-sm bg-background/50 rounded-lg p-3 border border-border">
                <div>
                  <div className="text-white font-medium">{transaction.description}</div>
                  <div className="text-gray-400 text-xs">{new Date(transaction.date).toLocaleDateString()}</div>
                </div>
                <div className="text-highlight font-bold">
                  {formatCurrency(transaction.convertedAmount, baseCurrency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-surface to-background border-border-light">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-expense/10 rounded-lg border border-expense/20">
            <ShoppingCart className="w-6 h-6 text-expense" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Spendings</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              // Clear custom dates when selecting predefined periods
              if (e.target.value !== 'custom') {
                setCustomStartDate(null);
                setCustomEndDate(null);
              }
            }}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm transition-colors flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Custom Date Range - Only show when custom is selected */}
      {selectedPeriod === 'custom' && (
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-400" />
          <DatePicker
            selected={customStartDate}
            onChange={(date) => handleCustomDateChange(date, customEndDate)}
            selectsStart
            startDate={customStartDate}
            endDate={customEndDate}
            placeholderText="Start Date"
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm w-40"
            dateFormat="MMM dd, yyyy"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={50}
            scrollableYearDropdown
          />
          <span className="text-gray-400">to</span>
          <DatePicker
            selected={customEndDate}
            onChange={(date) => handleCustomDateChange(customStartDate, date)}
            selectsEnd
            startDate={customStartDate}
            endDate={customEndDate}
            placeholderText="End Date"
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm w-40"
            dateFormat="MMM dd, yyyy"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={50}
            scrollableYearDropdown
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats - Always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-surface to-background border border-expense/30 rounded-xl p-5 hover:border-expense/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-expense rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Total Spent</div>
              </div>
              <div className="text-white text-xl font-bold">
                {formatCurrency(spendingStats.totalSpent, baseCurrency)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-border-light rounded-xl p-5 hover:border-highlight/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-highlight rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Daily Average</div>
              </div>
              <div className="text-white text-xl font-bold">
                {formatCurrency(spendingStats.averageDaily, baseCurrency)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-income/30 rounded-xl p-5 hover:border-income/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-income rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Trend</div>
              </div>
              <div className="flex items-center gap-2">
                {spendingStats.trend === 'up' && (
                  <TrendingUp className="w-5 h-5 text-income" />
                )}
                {spendingStats.trend === 'down' && (
                  <TrendingDown className="w-5 h-5 text-expense" />
                )}
                {spendingStats.trend === 'stable' && (
                  <TrendingUp className="w-5 h-5 text-warning" style={{ transform: 'rotate(0deg)' }} />
                )}
                <span className={`text-xl font-bold ${
                  spendingStats.trend === 'up' ? 'text-income' : 
                  spendingStats.trend === 'down' ? 'text-expense' : 
                  'text-warning'
                }`}>
                  {spendingStats.trendPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-surface to-background border border-warning/30 rounded-xl p-5 hover:border-warning/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div className="text-gray-400 text-sm font-medium">Period</div>
              </div>
              <div className="text-white text-xl font-bold">{spendingStats.periodDays} days</div>
            </div>
          </div>

          {/* Expandable Content */}
          {isExpanded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Pie Chart */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-highlight rounded-full"></div>
                  <h3 className="text-xl font-semibold text-white">Spending Breakdown</h3>
                </div>
                <div className="h-[28rem] bg-gradient-to-br from-surface via-background to-surface/80 rounded-xl border border-highlight/20 p-6 relative overflow-hidden shadow-2xl">
                  {/* Enhanced Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-6 left-6 w-40 h-40 bg-gradient-to-br from-highlight to-highlight/50 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-6 right-6 w-32 h-32 bg-gradient-to-br from-income to-income/50 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-expense to-expense/50 rounded-full blur-3xl"></div>
                  </div>
                  
                  {/* Subtle Grid Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full" style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {/* 3D Gradient Definitions */}
                      <defs>
                        {categoryData.map((entry, index) => {
                          const baseColor = getCategoryColor(entry.category, index);
                          return (
                            <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                              <stop offset="30%" stopColor={baseColor} stopOpacity={0.9} />
                              <stop offset="70%" stopColor={baseColor} stopOpacity={0.7} />
                              <stop offset="100%" stopColor={baseColor} stopOpacity={0.5} />
                            </linearGradient>
                          );
                        })}
                        
                        {/* Radial gradients for inner glow */}
                        {categoryData.map((entry, index) => {
                          const baseColor = getCategoryColor(entry.category, index);
                          return (
                            <radialGradient key={`radial-${index}`} id={`radial-${index}`} cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                              <stop offset="70%" stopColor={baseColor} stopOpacity={0.8} />
                              <stop offset="100%" stopColor={baseColor} stopOpacity={0.6} />
                            </radialGradient>
                          );
                        })}
                      </defs>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="amount"
                        label={false}
                        stroke="none"
                        strokeWidth={0}
                      >
                        {categoryData.map((entry, index) => {
                          const baseColor = getCategoryColor(entry.category, index);
                          const isActive = activeIndex === index;
                          
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#gradient-${index})`}
                              style={{
                                filter: `
                                  drop-shadow(0 16px 32px rgba(0, 0, 0, 0.7)) 
                                  drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))
                                  drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))
                                  drop-shadow(0 0 0 2px rgba(255, 255, 255, 0.15))
                                  drop-shadow(inset 0 2px 4px rgba(255, 255, 255, 0.1))
                                `,
                                transform: isActive ? 'scale(1.25) translateZ(10px)' : 'scale(1) translateZ(0px)',
                                transformOrigin: 'center',
                                transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                cursor: 'pointer',
                                perspective: '1000px',
                                transformStyle: 'preserve-3d'
                              }}
                              onMouseEnter={() => setActiveIndex(index)}
                              onMouseLeave={() => setActiveIndex(null)}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                </div>
              </div>

              {/* Right Column: All Categories */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-highlight rounded-full"></div>
                </div>
                
                <div className="space-y-3 max-h-[28rem] overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
                  {categoryData.map((category, index) => (
                    <div key={category.category}>
                      <div 
                        className="flex items-center justify-between bg-gradient-to-r from-surface to-background border border-border-light rounded-xl p-4 cursor-pointer hover:border-highlight/30 hover:bg-gradient-to-r hover:from-surface/80 hover:to-background/80 transition-all duration-300 group"
                        onClick={() => toggleCategoryExpansion(category.category)}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-4 h-4 rounded-full shadow-lg"
                            style={{ backgroundColor: getCategoryColor(category.category, index) }}
                          ></div>
                          <div>
                            <div className="text-white font-semibold group-hover:text-highlight transition-colors">{formatCategoryName(category.category)}</div>
                            <div className="text-gray-400 text-sm">{category.count} transactions</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-white font-bold text-lg">
                              {formatCurrency(category.amount, baseCurrency)}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {category.percentage.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-highlight group-hover:text-highlight/80 transition-colors">
                            {expandedCategories.has(category.category) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>
                      <CategoryTransactions category={category.category} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
