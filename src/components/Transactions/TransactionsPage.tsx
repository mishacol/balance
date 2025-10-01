import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { TransactionList } from './TransactionList';
import { Button } from '../ui/Button';
import { useTransactionStore } from '../../store/transactionStore';
import { FilterIcon, SearchIcon, DownloadIcon } from 'lucide-react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, searchTransactions } = useTransactionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Function to determine type from category
  const getTypeFromCategory = (category: string) => {
    // Define all income categories
    const incomeCategories = [
      // Employment Income
      'bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities',
      // Business & Self-Employment
      'affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties',
      // Investment Income
      'capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income',
      // Passive Income
      'ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue',
      // Government & Benefits
      'grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits',
      // Other Income
      'gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'
    ];
    
    // Check if it's a parent category (contains '-')
    if (category.includes('-')) {
      // Parent categories - determine based on the category group
      if (category.includes('income') || category.includes('employment') || 
          category.includes('business') || category.includes('investment') || 
          category.includes('passive') || category.includes('government') || 
          category.includes('other-income')) {
        return 'income';
      } else {
        return 'expense';
      }
    } else {
      // Specific category - if it's in income categories, it's income, otherwise it's expense
      return incomeCategories.includes(category) ? 'income' : 'expense';
    }
  };

  // Use the same filtering logic as Dashboard
  const getFilteredTransactions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      
      switch (selectedTimeRange) {
        case 'this-month':
          return transactionYear === currentYear && transactionMonth === currentMonth;
        case 'last-month':
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return transactionYear === lastMonthYear && transactionMonth === lastMonth;
        case 'this-year':
          return transactionYear === currentYear;
        case 'custom':
          if (customStartDate && customEndDate) {
            return transactionDate >= customStartDate && transactionDate <= customEndDate;
          }
          return true;
        default:
          return true;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions()
    .filter(transaction => {
      const matchesSearch = searchQuery === '' || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === '' || transaction.type === typeFilter;
      
      let matchesCategory = categoryFilter === '' || transaction.category === categoryFilter;
      
      // Handle group category filtering
      if (categoryFilter && categoryFilter !== '') {
        const categoryGroups: { [key: string]: string[] } = {
          // Income groups
          'employment-income': ['bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities'],
          'business-self-employment': ['affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties'],
          'investment-income': ['capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income'],
          'passive-income': ['ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue'],
          'government-benefits': ['grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits'],
          'other-income': ['gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'],
          
          // Expense groups
          'business-expenses': ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions'],
          'charitable-gifts': ['charitable-subscriptions', 'donations', 'gifts', 'charity'],
          'childcare': ['babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games'],
          'education': ['books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition'],
          'entertainment': ['books-magazines', 'games-apps', 'hobbies', 'music-streaming', 'sports-recreation', 'vacation-travel', 'movies', 'concerts', 'theaters', 'night-clubs'],
          'financial-obligations': ['bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes'],
          'food-dining': ['alcohol-beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants'],
          'healthcare': ['dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'prescriptions', 'therapy-counseling', 'vision', 'pharmacy'],
          'housing': ['furniture-appliances', 'home-insurance', 'maintenance-repairs', 'property-tax', 'rent-mortgage', 'cleaning-products', 'electronics', 'kitchen-utensils', 'household-goods'],
          'miscellaneous': ['cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping'],
          'personal-care': ['cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'shoes', 'spa-massage', 'clothing', 'personal-hygiene'],
          'pets': ['grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary'],
          'transportation': ['car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration'],
          'utilities': ['cable-streaming', 'electricity', 'gas', 'heating', 'internet', 'phone', 'trash-recycling', 'water-sewer']
        };
        
        if (categoryGroups[categoryFilter]) {
          matchesCategory = categoryGroups[categoryFilter].includes(transaction.category);
        }
      }
      
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category options for react-select
  const getCategoryOptions = () => {
    const incomeParentCategories = [
      { value: 'employment-income', label: 'Employment Income' },
      { value: 'business-self-employment', label: 'Business & Self-Employment' },
      { value: 'investment-income', label: 'Investment Income' },
      { value: 'passive-income', label: 'Passive Income' },
      { value: 'government-benefits', label: 'Government & Benefits' },
      { value: 'other-income', label: 'Other Income' }
    ];

    const expenseParentCategories = [
      { value: 'business-expenses', label: 'Business Expenses' },
      { value: 'charitable-gifts', label: 'Charitable & Gifts' },
      { value: 'childcare', label: 'Childcare' },
      { value: 'education', label: 'Education' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'financial-obligations', label: 'Financial Obligations' },
      { value: 'food-dining', label: 'Food & Dining' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'housing', label: 'Housing' },
      { value: 'miscellaneous', label: 'Miscellaneous' },
      { value: 'personal-care', label: 'Personal Care' },
      { value: 'pets', label: 'Pets' },
      { value: 'transportation', label: 'Transportation' },
      { value: 'utilities', label: 'Utilities' }
    ];

    // Define all subcategories (only the actual subcategories, not parent categories)
    const allSubcategories = [
      // Income subcategories
      { value: 'bonus', label: 'Bonus' },
      { value: 'commission', label: 'Commission' },
      { value: 'hourly-wages', label: 'Hourly Wages' },
      { value: 'overtime', label: 'Overtime' },
      { value: 'salary', label: 'Salary' },
      { value: 'tips-gratuities', label: 'Tips & Gratuities' },
      { value: 'affiliate-income', label: 'Affiliate Income' },
      { value: 'business-revenue', label: 'Business Revenue' },
      { value: 'consulting-fees', label: 'Consulting Fees' },
      { value: 'freelance-income', label: 'Freelance Income' },
      { value: 'royalties', label: 'Royalties' },
      { value: 'capital-gains', label: 'Capital Gains' },
      { value: 'crypto-gains', label: 'Crypto Gains' },
      { value: 'dividends', label: 'Dividends' },
      { value: 'interest', label: 'Interest' },
      { value: 'rental-income', label: 'Rental Income' },
      { value: 'ad-revenue', label: 'Ad Revenue' },
      { value: 'automated-business', label: 'Automated Business' },
      { value: 'licensing-fees', label: 'Licensing Fees' },
      { value: 'subscription-revenue', label: 'Subscription Revenue' },
      { value: 'grants-subsidies', label: 'Grants & Subsidies' },
      { value: 'pension', label: 'Pension' },
      { value: 'social-security', label: 'Social Security' },
      { value: 'tax-refund', label: 'Tax Refund' },
      { value: 'unemployment-benefits', label: 'Unemployment Benefits' },
      { value: 'gifts', label: 'Gifts' },
      { value: 'charity', label: 'Charity' },
      { value: 'inheritance', label: 'Inheritance' },
      { value: 'lottery-gambling', label: 'Lottery & Gambling' },
      { value: 'rebates-cashback', label: 'Rebates & Cashback' },
      { value: 'reimbursements', label: 'Reimbursements' },
      { value: 'sold-items', label: 'Sold Items' },
      { value: 'other', label: 'Other' },
      
      // Expense subcategories
      { value: 'business-travel', label: 'Business Travel' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'marketing-advertising', label: 'Marketing/Advertising' },
      { value: 'office-supplies', label: 'Office Supplies' },
      { value: 'professional-fees', label: 'Professional Fees' },
      { value: 'software-subscriptions', label: 'Software/Subscriptions' },
      { value: 'charitable-subscriptions', label: 'Charitable Subscriptions' },
      { value: 'donations', label: 'Donations' },
      { value: 'babysitting', label: 'Babysitting' },
      { value: 'child-support', label: 'Child Support' },
      { value: 'daycare', label: 'Daycare' },
      { value: 'kids-activities', label: 'Kids Activities' },
      { value: 'school-supplies', label: 'School Supplies' },
      { value: 'toys-games', label: 'Toys & Games' },
      { value: 'books-supplies', label: 'Books & Supplies' },
      { value: 'online-courses', label: 'Online Courses' },
      { value: 'student-loans', label: 'Student Loans' },
      { value: 'tutoring', label: 'Tutoring' },
      { value: 'tuition', label: 'Tuition' },
      { value: 'books-magazines', label: 'Books & Magazines' },
      { value: 'games-apps', label: 'Games & Apps' },
      { value: 'hobbies', label: 'Hobbies' },
      { value: 'music-streaming', label: 'Music/Streaming' },
      { value: 'sports-recreation', label: 'Sports/Recreation' },
      { value: 'vacation-travel', label: 'Vacation/Travel' },
      { value: 'movies', label: 'Movies' },
      { value: 'concerts', label: 'Concerts' },
      { value: 'theaters', label: 'Theaters' },
      { value: 'night-clubs', label: 'Night Clubs' },
      { value: 'bank-fees', label: 'Bank Fees' },
      { value: 'credit-card-payments', label: 'Credit Card Payments' },
      { value: 'investment-contributions', label: 'Investment Contributions' },
      { value: 'life-insurance', label: 'Life Insurance' },
      { value: 'personal-loans', label: 'Personal Loans' },
      { value: 'savings', label: 'Savings' },
      { value: 'taxes', label: 'Taxes' },
      { value: 'alcohol-beverages', label: 'Alcohol & Beverages' },
      { value: 'coffee-shops', label: 'Coffee Shops' },
      { value: 'delivery-takeout', label: 'Delivery & Takeout' },
      { value: 'fast-food', label: 'Fast Food' },
      { value: 'groceries', label: 'Groceries' },
      { value: 'restaurants', label: 'Restaurants' },
      { value: 'dental', label: 'Dental' },
      { value: 'doctor-visits', label: 'Doctor Visits' },
      { value: 'fitness-gym', label: 'Fitness/Gym' },
      { value: 'health-insurance', label: 'Health Insurance' },
      { value: 'hospital-emergency', label: 'Hospital/Emergency' },
      { value: 'prescriptions', label: 'Prescriptions' },
      { value: 'therapy-counseling', label: 'Therapy/Counseling' },
      { value: 'vision', label: 'Vision' },
      { value: 'pharmacy', label: 'Pharmacy' },
      { value: 'furniture-appliances', label: 'Furniture & Appliances' },
      { value: 'home-insurance', label: 'Home Insurance' },
      { value: 'maintenance-repairs', label: 'Maintenance & Repairs' },
      { value: 'property-tax', label: 'Property Tax' },
      { value: 'rent-mortgage', label: 'Rent/Mortgage' },
      { value: 'cleaning-products', label: 'Cleaning Products' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'kitchen-utensils', label: 'Kitchen Utensils' },
      { value: 'household-goods', label: 'Household Goods' },
      { value: 'cash-withdrawals', label: 'Cash Withdrawals' },
      { value: 'cigarettes', label: 'Cigarettes' },
      { value: 'fines-penalties', label: 'Fines & Penalties' },
      { value: 'legal-fees', label: 'Legal Fees' },
      { value: 'subscriptions', label: 'Subscriptions' },
      { value: 'tobacco-vaping', label: 'Tobacco/Vaping' },
      { value: 'cosmetics-skincare', label: 'Cosmetics/Skincare' },
      { value: 'haircuts-salon', label: 'Haircuts/Salon' },
      { value: 'laundry-dry-cleaning', label: 'Laundry/Dry Cleaning' },
      { value: 'shoes', label: 'Shoes' },
      { value: 'spa-massage', label: 'Spa/Massage' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'personal-hygiene', label: 'Personal Hygiene' },
      { value: 'grooming', label: 'Grooming' },
      { value: 'pet-food', label: 'Pet Food' },
      { value: 'pet-insurance', label: 'Pet Insurance' },
      { value: 'pet-supplies', label: 'Pet Supplies' },
      { value: 'veterinary', label: 'Veterinary' },
      { value: 'car-insurance', label: 'Car Insurance' },
      { value: 'car-payment', label: 'Car Payment' },
      { value: 'gas-fuel', label: 'Gas/Fuel' },
      { value: 'interurban-travel', label: 'Interurban Travel' },
      { value: 'international-travel', label: 'International Travel' },
      { value: 'parking', label: 'Parking' },
      { value: 'public-transit', label: 'Public Transit' },
      { value: 'rideshare-taxi', label: 'Rideshare/Taxi' },
      { value: 'tolls', label: 'Tolls' },
      { value: 'vehicle-registration', label: 'Vehicle Registration' },
      { value: 'cable-streaming', label: 'Cable/Streaming' },
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' },
      { value: 'heating', label: 'Heating' },
      { value: 'internet', label: 'Internet' },
      { value: 'phone', label: 'Phone' },
      { value: 'trash-recycling', label: 'Trash/Recycling' },
      { value: 'water-sewer', label: 'Water & Sewer' },
      
      // Investment subcategories
      { value: 'savings-account', label: 'Savings Account' },
      { value: 'term-deposits', label: 'Term Deposits' },
      { value: 'high-yield-savings', label: 'High-Yield Savings' },
      { value: 'money-market', label: 'Money Market' },
      { value: 'bitcoin', label: 'Bitcoin' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'altcoins', label: 'Altcoins' },
      { value: 'crypto-staking', label: 'Crypto Staking' },
      { value: 'individual-stocks', label: 'Individual Stocks' },
      { value: 'mutual-funds', label: 'Mutual Funds' },
      { value: 'etfs', label: 'ETFs' },
      { value: 'government-bonds', label: 'Government Bonds' },
      { value: 'corporate-bonds', label: 'Corporate Bonds' },
      { value: 'real-estate-investment', label: 'Real Estate Investment' },
      { value: 'reits', label: 'REITs' },
      { value: 'property-investment', label: 'Property Investment' },
      { value: 'precious-metals', label: 'Precious Metals' },
      { value: 'commodities', label: 'Commodities' },
      { value: 'trusts', label: 'Trusts' },
      { value: 'other-investments', label: 'Other Investments' }
    ];

    // Create grouped options for react-select
    const createGroupedOptions = (categories: any[], subcategories: any[]) => {
      const groupedOptions: { label: string; options: any[] }[] = [];
      
      categories.forEach(category => {
        const group: { label: string; options: any[] } = {
          label: category.label,
          options: []
        };
        
        // Find subcategories that belong to this parent category
        const categoryGroups: { [key: string]: string[] } = {
          'employment-income': ['bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities'],
          'business-self-employment': ['affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties'],
          'investment-income': ['capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income'],
          'passive-income': ['ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue'],
          'government-benefits': ['grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits'],
          'other-income': ['gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'],
          'business-expenses': ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions'],
          'charitable-gifts': ['charitable-subscriptions', 'donations', 'gifts', 'charity'],
          'childcare': ['babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games'],
          'education': ['books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition'],
          'entertainment': ['books-magazines', 'games-apps', 'hobbies', 'music-streaming', 'sports-recreation', 'vacation-travel', 'movies', 'concerts', 'theaters', 'night-clubs'],
          'financial-obligations': ['bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes'],
          'food-dining': ['alcohol-beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants'],
          'healthcare': ['dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'prescriptions', 'therapy-counseling', 'vision', 'pharmacy'],
          'housing': ['furniture-appliances', 'home-insurance', 'maintenance-repairs', 'property-tax', 'rent-mortgage', 'cleaning-products', 'electronics', 'kitchen-utensils', 'household-goods'],
          'miscellaneous': ['cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping'],
          'personal-care': ['cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'shoes', 'spa-massage', 'clothing', 'personal-hygiene'],
          'pets': ['grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary'],
          'transportation': ['car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration'],
          'utilities': ['cable-streaming', 'electricity', 'gas', 'heating', 'internet', 'phone', 'trash-recycling', 'water-sewer']
        };
        
        const subcategoryValues = categoryGroups[category.value] || [];
        const matchingSubcategories = subcategories.filter(sub => subcategoryValues.includes(sub.value));
        
        // Add parent category first, then subcategories
        group.options.push(category);
        group.options.push(...matchingSubcategories);
        
        groupedOptions.push(group);
      });
      
      return groupedOptions;
    };

    // Create flat list with parent categories and subcategories
    const createFlatOptions = (categories: any[], subcategories: any[]) => {
      const flatOptions: any[] = [];
      
      categories.forEach(category => {
        // Add parent category as selectable option
        flatOptions.push(category);
        
        // Find subcategories that belong to this parent category
        const categoryGroups: { [key: string]: string[] } = {
          'employment-income': ['bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities'],
          'business-self-employment': ['affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties'],
          'investment-income': ['capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income'],
          'passive-income': ['ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue'],
          'government-benefits': ['grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits'],
          'other-income': ['gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'],
          'business-expenses': ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions'],
          'charitable-gifts': ['charitable-subscriptions', 'donations', 'gifts', 'charity'],
          'childcare': ['babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games'],
          'education': ['books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition'],
          'entertainment': ['books-magazines', 'games-apps', 'hobbies', 'music-streaming', 'sports-recreation', 'vacation-travel', 'movies', 'concerts', 'theaters', 'night-clubs'],
          'financial-obligations': ['bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes'],
          'food-dining': ['alcohol-beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants'],
          'healthcare': ['dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'prescriptions', 'therapy-counseling', 'vision', 'pharmacy'],
          'housing': ['furniture-appliances', 'home-insurance', 'maintenance-repairs', 'property-tax', 'rent-mortgage', 'cleaning-products', 'electronics', 'kitchen-utensils', 'household-goods'],
          'miscellaneous': ['cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping'],
          'personal-care': ['cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'shoes', 'spa-massage', 'clothing', 'personal-hygiene'],
          'pets': ['grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary'],
          'transportation': ['car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration'],
          'utilities': ['cable-streaming', 'electricity', 'gas', 'heating', 'internet', 'phone', 'trash-recycling', 'water-sewer']
        };
        
        const subcategoryValues = categoryGroups[category.value] || [];
        const matchingSubcategories = subcategories.filter(sub => subcategoryValues.includes(sub.value));
        
        // Add subcategories
        flatOptions.push(...matchingSubcategories);
      });
      
      return flatOptions;
    };

    // Return categories based on selected type
    if (typeFilter === 'income') {
      const incomeSubs = allSubcategories.filter(sub => {
        const incomeSubs = ['bonus', 'commission', 'hourly-wages', 'overtime', 'salary', 'tips-gratuities',
          'affiliate-income', 'business-revenue', 'consulting-fees', 'freelance-income', 'royalties',
          'capital-gains', 'crypto-gains', 'dividends', 'interest', 'rental-income',
          'ad-revenue', 'automated-business', 'licensing-fees', 'subscription-revenue',
          'grants-subsidies', 'pension', 'social-security', 'tax-refund', 'unemployment-benefits',
          'gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other'];
        return incomeSubs.includes(sub.value);
      });
      return createFlatOptions(incomeParentCategories, incomeSubs);
    } else if (typeFilter === 'expense') {
      const expenseSubs = allSubcategories.filter(sub => {
        const expenseSubs = ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions',
          'charitable-subscriptions', 'donations', 'gifts', 'charity', 'babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games',
          'books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition', 'books-magazines', 'games-apps', 'hobbies', 'music-streaming', 'sports-recreation', 'vacation-travel', 'movies', 'concerts', 'theaters', 'night-clubs',
          'bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes',
          'alcohol-beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants',
          'dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'prescriptions', 'therapy-counseling', 'vision', 'pharmacy',
          'furniture-appliances', 'home-insurance', 'maintenance-repairs', 'property-tax', 'rent-mortgage', 'cleaning-products', 'electronics', 'kitchen-utensils', 'household-goods',
          'cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping',
          'cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'shoes', 'spa-massage', 'clothing', 'personal-hygiene',
          'grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary',
          'car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration',
          'cable-streaming', 'electricity', 'gas', 'heating', 'internet', 'phone', 'trash-recycling', 'water-sewer'];
        return expenseSubs.includes(sub.value);
      });
      return createFlatOptions(expenseParentCategories, expenseSubs);
    } else if (typeFilter === 'investment') {
      const investmentSubs = allSubcategories.filter(sub => {
        const investmentSubs = ['savings-account', 'term-deposits', 'high-yield-savings', 'money-market',
          'bitcoin', 'ethereum', 'altcoins', 'crypto-staking',
          'individual-stocks', 'mutual-funds', 'etfs', 'government-bonds', 'corporate-bonds',
          'real-estate-investment', 'reits', 'property-investment',
          'precious-metals', 'commodities', 'trusts', 'other-investments'];
        return investmentSubs.includes(sub.value);
      });
      // Return flat list of investment categories (no parent grouping needed)
      return investmentSubs;
    } else {
      // When "All Types" is selected, return empty array to make categories inactive
      return [];
    }
  };

  // PDF Export function
  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Transaction Report', 20, 20);
    
    // Add date range info
    doc.setFontSize(12);
    const currentDate = new Date().toLocaleDateString();
    doc.text(`Generated on: ${currentDate}`, 20, 30);
    
    // Add filters info
    let filterText = 'All Transactions';
    if (typeFilter) {
      filterText = `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} Transactions`;
    }
    if (categoryFilter) {
      const categoryLabel = getCategoryOptions().find(opt => opt.value === categoryFilter)?.label || categoryFilter;
      filterText += ` - ${categoryLabel}`;
    }
    doc.text(`Filter: ${filterText}`, 20, 40);
    
    // Add summary
    const totalTransactions = filteredTransactions.length;
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    doc.text(`Total Transactions: ${totalTransactions}`, 20, 50);
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 20, 60);
    
    // Add transactions table
    let yPosition = 80;
    doc.setFontSize(10);
    
    // Table headers
    doc.text('Date', 20, yPosition);
    doc.text('Description', 50, yPosition);
    doc.text('Category', 100, yPosition);
    doc.text('Type', 140, yPosition);
    doc.text('Amount', 170, yPosition);
    yPosition += 10;
    
    // Add transactions (all transactions, not just first 50)
    filteredTransactions.forEach((transaction, index) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
        
        // Add headers on new page
        doc.setFontSize(10);
        doc.text('Date', 20, yPosition);
        doc.text('Description', 50, yPosition);
        doc.text('Category', 100, yPosition);
        doc.text('Type', 140, yPosition);
        doc.text('Amount', 170, yPosition);
        yPosition += 10;
      }
      
      const date = new Date(transaction.date).toLocaleDateString();
      const description = transaction.description.length > 20 ? 
        transaction.description.substring(0, 20) + '...' : transaction.description;
      const category = transaction.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const type = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      const amount = `$${transaction.amount.toFixed(2)}`;
      
      doc.text(date, 20, yPosition);
      doc.text(description, 50, yPosition);
      doc.text(category, 100, yPosition);
      doc.text(type, 140, yPosition);
      doc.text(amount, 170, yPosition);
      yPosition += 8;
    });
    
    // Save the PDF
    doc.save(`transactions-report-${currentDate.replace(/\//g, '-')}.pdf`);
  };

  return <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={exportToPDF} className="flex items-center">
            <DownloadIcon size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button variant="primary" onClick={() => navigate('/add-transaction')}>
            Add Transaction
          </Button>
        </div>
      </div>
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex items-center bg-background border border-border rounded-md px-3 py-2 w-full md:w-auto">
            <SearchIcon size={18} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              className="bg-transparent border-none focus:outline-none text-white w-full" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCategoryFilter(''); // Clear category when type changes
              }}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
            <div className="w-48">
              <Select
                value={categoryFilter ? getCategoryOptions().find(opt => opt.value === categoryFilter) || null : null}
                onChange={(selectedOption) => {
                  const newCategory = selectedOption?.value || '';
                  setCategoryFilter(newCategory);
                  
                  // Auto-set type filter based on category
                  if (newCategory) {
                    const inferredType = getTypeFromCategory(newCategory);
                    if (inferredType && inferredType !== typeFilter) {
                      setTypeFilter(inferredType);
                    }
                  } else {
                    // If category is cleared, also clear type filter
                    setTypeFilter('');
                  }
                }}
                     options={getCategoryOptions()}
                     placeholder={typeFilter === '' ? "" : "All Categories"}
                     isSearchable
                     isClearable
                     isDisabled={typeFilter === ''}
                     filterOption={(option, inputValue) => {
                       return option.label.toLowerCase().includes(inputValue.toLowerCase());
                     }}
                     className="react-select-container"
                     classNamePrefix="react-select"
                     styles={{
                       control: (base) => ({
                         ...base,
                         backgroundColor: '#1f2937',
                         borderColor: '#374151',
                         color: '#ffffff',
                         minHeight: '32px',
                         fontSize: '0.875rem',
                         '&:hover': {
                           borderColor: '#00d9ff',
                         },
                       }),
                       menu: (base) => ({
                         ...base,
                         backgroundColor: '#1f2937',
                         border: '1px solid #374151',
                       }),
                       option: (base, state) => {
                         // Check if this is a parent category (only the main parent categories should be underlined)
                         const parentCategories = [
                           'employment-income', 'business-self-employment', 'investment-income', 'passive-income', 'government-benefits', 'other-income',
                           'business-expenses', 'charitable-gifts', 'childcare', 'education', 'entertainment', 'financial-obligations', 
                           'food-dining', 'healthcare', 'housing', 'miscellaneous', 'personal-care', 'pets', 'transportation', 'utilities'
                         ];
                         const isParentCategory = parentCategories.includes(state.data.value);
                         
                         return {
                           ...base,
                           backgroundColor: state.isFocused ? 'rgba(0, 217, 255, 0.2)' : '#1f2937',
                           color: '#ffffff',
                           fontSize: '0.875rem',
                           fontWeight: isParentCategory ? '700' : '400',
                           textDecoration: isParentCategory ? 'underline' : 'none',
                           textUnderlineOffset: isParentCategory ? '2px' : 'none',
                           '&:hover': {
                             backgroundColor: 'rgba(0, 217, 255, 0.2)',
                           },
                         };
                       },
                       placeholder: (base) => ({
                         ...base,
                         color: '#9ca3af',
                         fontSize: '0.875rem',
                       }),
                       singleValue: (base) => ({
                         ...base,
                         color: '#ffffff',
                         fontSize: '0.875rem',
                       }),
                       input: (base) => ({
                         ...base,
                         color: '#ffffff',
                         fontSize: '0.875rem',
                       }),
                     }}
                     theme={(theme) => ({
                       ...theme,
                       colors: {
                         ...theme.colors,
                         primary: '#00d9ff',
                         primary75: 'rgba(0, 217, 255, 0.75)',
                         primary50: 'rgba(0, 217, 255, 0.5)',
                         primary25: 'rgba(0, 217, 255, 0.25)',
                         danger: '#ef4444',
                         dangerLight: 'rgba(239, 68, 68, 0.2)',
                         neutral0: '#1f2937',
                         neutral5: '#111827',
                         neutral10: '#374151',
                         neutral20: '#4b5563',
                         neutral30: '#6b7280',
                         neutral40: '#9ca3af',
                         neutral50: '#d1d5db',
                         neutral60: '#e5e7eb',
                         neutral70: '#f3f4f6',
                         neutral80: '#ffffff',
                         neutral90: '#ffffff',
                       },
                     })}
              />
            </div>
            <select 
              className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {selectedTimeRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <DatePicker
                  selected={customStartDate}
                  onChange={(date) => setCustomStartDate(date)}
                  selectsStart
                  startDate={customStartDate}
                  endDate={customEndDate}
                  placeholderText="Start Date"
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
                  wrapperClassName="w-auto"
                  calendarClassName="bg-surface border border-border text-white"
                />
                <span className="text-gray-400">to</span>
                <DatePicker
                  selected={customEndDate}
                  onChange={(date) => setCustomEndDate(date)}
                  selectsEnd
                  startDate={customStartDate}
                  endDate={customEndDate}
                  minDate={customStartDate || undefined}
                  placeholderText="End Date"
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm"
                  wrapperClassName="w-auto"
                  calendarClassName="bg-surface border border-border text-white"
                />
              </div>
            )}
            <Button variant="secondary" size="sm" className="flex items-center">
              <FilterIcon size={16} className="mr-1" />
              More Filters
            </Button>
          </div>
        </div>
        <TransactionList 
          transactions={filteredTransactions} 
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          selectedTimeRange={selectedTimeRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      </Card>
    </div>;
};