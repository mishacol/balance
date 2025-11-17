import jsPDF from 'jspdf';
import { formatCurrency } from './formatters';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category?: string;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface SpendingData {
  stats: {
    totalSpent: number;
    averageDaily: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    periodDays: number;
  };
  categories: CategoryData[];
  transactions: Transaction[];
  baseCurrency: string;
  period: string;
  dateRange: { start: Date; end: Date };
}

/**
 * Export spending analysis to PDF with text and data
 */
export const exportSpendingToPDF = async (data: SpendingData) => {
  if (!data || !data.stats || !data.categories || !data.transactions) {
    throw new Error('Invalid data provided for PDF export');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper to check if new page is needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Spending Analysis', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Period
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const periodText = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`
    : data.period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  pdf.text(`Period: ${periodText}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary Statistics
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, yPos);
  yPos += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const stats = [
    [`Total Spent: ${formatCurrency(data.stats.totalSpent, data.baseCurrency)}`],
    [`Daily Average: ${formatCurrency(data.stats.averageDaily, data.baseCurrency)}`],
    [`Period Days: ${data.stats.periodDays}`],
    [`Trend: ${data.stats.trendPercentage.toFixed(1)}% ${data.stats.trend === 'up' ? '↑' : data.stats.trend === 'down' ? '↓' : '→'}`]
  ];

  stats.forEach(stat => {
    pdf.text(stat[0], margin + 5, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Categories Table
  checkNewPage(40);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Spending by Category', margin, yPos);
  yPos += 8;

  // Table headers
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const colWidths = [70, 35, 30, 35];
  const colHeaders = ['Category', 'Amount', 'Count', '%'];
  let xPos = margin;
  colHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 6;

  // Category rows
  pdf.setFont('helvetica', 'normal');
  data.categories.forEach(category => {
    checkNewPage(7);
    xPos = margin;
    
    // Format category name
    const categoryName = formatCategoryName(category.category);
    
    // Wrap text if needed
    const lines = pdf.splitTextToSize(categoryName, colWidths[0] - 2);
    pdf.text(lines[0], xPos, yPos);
    xPos += colWidths[0];
    
    pdf.text(formatCurrency(category.amount, data.baseCurrency), xPos, yPos);
    xPos += colWidths[1];
    
    pdf.text(category.count.toString(), xPos, yPos);
    xPos += colWidths[2];
    
    pdf.text(`${category.percentage.toFixed(1)}%`, xPos, yPos);
    yPos += lines.length > 1 ? 9 : 7;
  });

  yPos += 10;

  // Detailed Transactions for each category
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detailed Transactions', margin, yPos);
  yPos += 10;

  // Group transactions by category
  const transactionsByCategory = new Map<string, Transaction[]>();
  data.transactions.forEach(transaction => {
    if (transaction.category) {
      const existing = transactionsByCategory.get(transaction.category) || [];
      existing.push(transaction);
      transactionsByCategory.set(transaction.category, existing);
    }
  });

  // Sort categories by amount (same order as in categories array)
  const sortedCategories = Array.from(transactionsByCategory.entries())
    .sort((a, b) => {
      const aAmount = data.categories.find(c => c.category === a[0])?.amount || 0;
      const bAmount = data.categories.find(c => c.category === b[0])?.amount || 0;
      return bAmount - aAmount;
    });

  sortedCategories.forEach(([category, transactions]) => {
    checkNewPage(30);
    
    // Category header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const categoryName = formatCategoryName(category);
    pdf.text(categoryName, margin, yPos);
    yPos += 8;

    // Transaction table headers
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const txColWidths = [40, 80, 40];
    const txHeaders = ['Date', 'Description', 'Amount'];
    xPos = margin;
    txHeaders.forEach((header, i) => {
      pdf.text(header, xPos, yPos);
      xPos += txColWidths[i];
    });
    yPos += 6;

    // Transactions
    pdf.setFont('helvetica', 'normal');
    transactions.forEach(transaction => {
      checkNewPage(7);
      xPos = margin;
      
      // Date
      const date = new Date(transaction.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      pdf.text(dateStr, xPos, yPos);
      xPos += txColWidths[0];
      
      // Description (wrap if needed)
      const descLines = pdf.splitTextToSize(transaction.description, txColWidths[1] - 2);
      pdf.text(descLines[0], xPos, yPos);
      xPos += txColWidths[1];
      
      // Amount
      pdf.text(formatCurrency(transaction.convertedAmount, data.baseCurrency), xPos, yPos);
      yPos += descLines.length > 1 ? 9 : 7;
    });

    yPos += 5;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const periodLabel = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString('en-CA')}_to_${data.dateRange.end.toLocaleDateString('en-CA')}`
    : data.period.replace('-', '_');
  
  pdf.save(`spending_analysis_${periodLabel}.pdf`);
};

/**
 * Format category name to human-readable
 */
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
    'shopping': 'Shopping',
    'snacks-candies': 'Snacks & Candies',
    'software-subscriptions': 'Software Subscriptions',
    'transportation': 'Transportation',
    'utilities': 'Utilities',
    'vacation-travel': 'Vacation Travel',
    'groceries': 'Groceries',
    'healthcare': 'Healthcare',
    'entertainment': 'Entertainment',
    'dining-out': 'Dining Out',
    'education': 'Education',
    'insurance': 'Insurance',
    'cigarettes': 'Cigarettes',
    'alcohol': 'Alcohol',
    'rideshare-taxi': 'Rideshare & Taxi',
    'dental': 'Dental',
    'rent': 'Rent',
    'hotels': 'Hotels',
    'motels': 'Motels',
    'hostels': 'Hostels'
  };

  return categoryMap[category] || category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Export income analysis to PDF
 */
export const exportIncomeToPDF = async (data: SpendingData & { sources: CategoryData[] }) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Income Analysis', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Period
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const periodText = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`
    : data.period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  pdf.text(`Period: ${periodText}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary Statistics
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, yPos);
  yPos += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const stats = [
    [`Total Income: ${formatCurrency(data.stats.totalSpent, data.baseCurrency)}`],
    [`Daily Average: ${formatCurrency(data.stats.averageDaily, data.baseCurrency)}`],
    [`Period Days: ${data.stats.periodDays}`],
    [`Trend: ${data.stats.trendPercentage.toFixed(1)}% ${data.stats.trend === 'up' ? '↑' : data.stats.trend === 'down' ? '↓' : '→'}`]
  ];

  stats.forEach(stat => {
    pdf.text(stat[0], margin + 5, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Sources Table
  checkNewPage(40);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Income by Source', margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const colWidths = [70, 35, 30, 35];
  const colHeaders = ['Source', 'Amount', 'Count', '%'];
  let xPos = margin;
  colHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  data.sources.forEach(source => {
    checkNewPage(7);
    xPos = margin;
    const sourceName = formatCategoryName((source as any).source || (source as any).category);
    const lines = pdf.splitTextToSize(sourceName, colWidths[0] - 2);
    pdf.text(lines[0], xPos, yPos);
    xPos += colWidths[0];
    pdf.text(formatCurrency(source.amount, data.baseCurrency), xPos, yPos);
    xPos += colWidths[1];
    pdf.text(source.count.toString(), xPos, yPos);
    xPos += colWidths[2];
    pdf.text(`${source.percentage.toFixed(1)}%`, xPos, yPos);
    yPos += lines.length > 1 ? 9 : 7;
  });

  yPos += 10;

  // Detailed Transactions
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detailed Transactions', margin, yPos);
  yPos += 10;

  const transactionsBySource = new Map<string, Transaction[]>();
  data.transactions.forEach(transaction => {
    if (transaction.category) {
      const existing = transactionsBySource.get(transaction.category) || [];
      existing.push(transaction);
      transactionsBySource.set(transaction.category, existing);
    }
  });

  const sortedSources = Array.from(transactionsBySource.entries())
    .sort((a, b) => {
      const aAmount = data.sources.find(c => ((c as any).source || (c as any).category) === a[0])?.amount || 0;
      const bAmount = data.sources.find(c => ((c as any).source || (c as any).category) === b[0])?.amount || 0;
      return bAmount - aAmount;
    });

  sortedSources.forEach(([source, transactions]) => {
    checkNewPage(30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const sourceName = formatCategoryName(source);
    pdf.text(sourceName, margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const txColWidths = [40, 80, 40];
    const txHeaders = ['Date', 'Description', 'Amount'];
    xPos = margin;
    txHeaders.forEach((header, i) => {
      pdf.text(header, xPos, yPos);
      xPos += txColWidths[i];
    });
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    transactions.forEach(transaction => {
      checkNewPage(7);
      xPos = margin;
      const date = new Date(transaction.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      pdf.text(dateStr, xPos, yPos);
      xPos += txColWidths[0];
      const descLines = pdf.splitTextToSize(transaction.description, txColWidths[1] - 2);
      pdf.text(descLines[0], xPos, yPos);
      xPos += txColWidths[1];
      pdf.text(formatCurrency(transaction.convertedAmount, data.baseCurrency), xPos, yPos);
      yPos += descLines.length > 1 ? 9 : 7;
    });
    yPos += 5;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const periodLabel = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString('en-CA')}_to_${data.dateRange.end.toLocaleDateString('en-CA')}`
    : data.period.replace('-', '_');
  
  pdf.save(`income_analysis_${periodLabel}.pdf`);
};

/**
 * Export investment analysis to PDF
 */
export const exportInvestmentToPDF = async (data: SpendingData & { investments: CategoryData[] }) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Investment Analysis', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Period
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const periodText = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`
    : data.period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  pdf.text(`Period: ${periodText}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary Statistics
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, yPos);
  yPos += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const stats = [
    [`Total Invested: ${formatCurrency(data.stats.totalSpent, data.baseCurrency)}`],
    [`Daily Average: ${formatCurrency(data.stats.averageDaily, data.baseCurrency)}`],
    [`Period Days: ${data.stats.periodDays}`],
    [`Trend: ${data.stats.trendPercentage.toFixed(1)}% ${data.stats.trend === 'up' ? '↑' : data.stats.trend === 'down' ? '↓' : '→'}`]
  ];

  stats.forEach(stat => {
    pdf.text(stat[0], margin + 5, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Investments Table
  checkNewPage(40);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Investments by Instrument', margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const colWidths = [70, 35, 30, 35];
  const colHeaders = ['Instrument', 'Amount', 'Count', '%'];
  let xPos = margin;
  colHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  data.investments.forEach(investment => {
    checkNewPage(7);
    xPos = margin;
    const investmentName = formatCategoryName((investment as any).investment || (investment as any).category);
    const lines = pdf.splitTextToSize(investmentName, colWidths[0] - 2);
    pdf.text(lines[0], xPos, yPos);
    xPos += colWidths[0];
    pdf.text(formatCurrency(investment.amount, data.baseCurrency), xPos, yPos);
    xPos += colWidths[1];
    pdf.text(investment.count.toString(), xPos, yPos);
    xPos += colWidths[2];
    pdf.text(`${investment.percentage.toFixed(1)}%`, xPos, yPos);
    yPos += lines.length > 1 ? 9 : 7;
  });

  yPos += 10;

  // Detailed Transactions
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detailed Transactions', margin, yPos);
  yPos += 10;

  const transactionsByInvestment = new Map<string, Transaction[]>();
  data.transactions.forEach(transaction => {
    if (transaction.category) {
      const existing = transactionsByInvestment.get(transaction.category) || [];
      existing.push(transaction);
      transactionsByInvestment.set(transaction.category, existing);
    }
  });

  const sortedInvestments = Array.from(transactionsByInvestment.entries())
    .sort((a, b) => {
      const aAmount = data.investments.find(c => ((c as any).investment || (c as any).category) === a[0])?.amount || 0;
      const bAmount = data.investments.find(c => ((c as any).investment || (c as any).category) === b[0])?.amount || 0;
      return bAmount - aAmount;
    });

  sortedInvestments.forEach(([investment, transactions]) => {
    checkNewPage(30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const investmentName = formatCategoryName(investment);
    pdf.text(investmentName, margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const txColWidths = [40, 80, 40];
    const txHeaders = ['Date', 'Description', 'Amount'];
    xPos = margin;
    txHeaders.forEach((header, i) => {
      pdf.text(header, xPos, yPos);
      xPos += txColWidths[i];
    });
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    transactions.forEach(transaction => {
      checkNewPage(7);
      xPos = margin;
      const date = new Date(transaction.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      pdf.text(dateStr, xPos, yPos);
      xPos += txColWidths[0];
      const descLines = pdf.splitTextToSize(transaction.description, txColWidths[1] - 2);
      pdf.text(descLines[0], xPos, yPos);
      xPos += txColWidths[1];
      pdf.text(formatCurrency(transaction.convertedAmount, data.baseCurrency), xPos, yPos);
      yPos += descLines.length > 1 ? 9 : 7;
    });
    yPos += 5;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const periodLabel = data.period === 'custom'
    ? `${data.dateRange.start.toLocaleDateString('en-CA')}_to_${data.dateRange.end.toLocaleDateString('en-CA')}`
    : data.period.replace('-', '_');
  
  pdf.save(`investment_analysis_${periodLabel}.pdf`);
};
