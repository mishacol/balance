import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { TransactionList } from './TransactionList';
import { Button } from '../ui/Button';
import { useTransactionStore } from '../../store/transactionStore';
import { supabaseService } from '../../services/supabaseService';
import { SearchIcon, DownloadIcon } from 'lucide-react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export const TransactionsPage: React.FC = () => {
  console.log(`🔍 [TRANSACTIONS PAGE] Component mounted/rendered`);
  const navigate = useNavigate();
  const { transactions } = useTransactionStore();
  
  // Persistent filter state - loads from localStorage on mount
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('transactions-search-query') || '';
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [typeFilter, setTypeFilter] = useState(() => {
    return localStorage.getItem('transactions-type-filter') || '';
  });
  const [categoryFilter, setCategoryFilter] = useState(() => {
    return localStorage.getItem('transactions-category-filter') || '';
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState(() => {
    return localStorage.getItem('transactions-time-range') || 'this-month';
  });
  const [customStartDate, setCustomStartDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('transactions-custom-start-date');
    return saved ? new Date(saved) : null;
  });
  const [customEndDate, setCustomEndDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('transactions-custom-end-date');
    return saved ? new Date(saved) : null;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [paginatedTransactions, setPaginatedTransactions] = useState<any[]>([]);

  // Debounced search effect (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper function to get date range for filtering
  const getDateRange = useCallback(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (selectedTimeRange) {
      case 'all-time':
        return { startDate: null, endDate: null };
      case 'this-month':
        const thisMonthStart = new Date(currentYear, currentMonth, 1);
        const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0);
        return { startDate: thisMonthStart.toISOString().split('T')[0], endDate: thisMonthEnd.toISOString().split('T')[0] };
      case 'last-month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);
        return { startDate: lastMonthStart.toISOString().split('T')[0], endDate: lastMonthEnd.toISOString().split('T')[0] };
      case 'this-year':
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        return { startDate: yearStart.toISOString().split('T')[0], endDate: yearEnd.toISOString().split('T')[0] };
      case 'last-transactions':
        return { startDate: null, endDate: null };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { 
            startDate: customStartDate.toISOString().split('T')[0], 
            endDate: customEndDate.toISOString().split('T')[0] 
          };
        }
        return { startDate: null, endDate: null };
      default:
        return { startDate: null, endDate: null };
    }
  }, [selectedTimeRange, customStartDate, customEndDate]);

  // Load paginated transactions when filters change
  const loadPaginatedTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const { isUsingSupabase } = useTransactionStore.getState();
      
      console.log(`🔍 [PAGINATION DEBUG] isUsingSupabase: ${isUsingSupabase}, currentPage: ${currentPage}, pageSize: ${pageSize}`);
      
      // Always use Supabase if user is authenticated (fallback for edge cases)
      const shouldUseSupabase = isUsingSupabase || (await supabaseService.getUserId()) !== null;
      
      if (shouldUseSupabase) {
        // Get date range for filtering
        const { startDate, endDate } = getDateRange();
        
        console.log(`🔍 [PAGINATION DEBUG] Date range: ${startDate} to ${endDate}`);
        
        const result = await supabaseService.getTransactionsPaginated({
          page: currentPage,
          pageSize,
          searchQuery: debouncedSearchQuery,
          typeFilter,
          categoryFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy: 'date',
          sortOrder: 'desc'
        });
        
        setPaginatedTransactions(result.transactions);
        setTotalCount(result.totalCount);
        
        console.log(`🔍 [PAGINATION] Loaded ${result.transactions.length} transactions, total: ${result.totalCount}`);
      } else {
        // For local storage, use existing filtered logic but paginate it
        const filtered = getFilteredTransactions();
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        setPaginatedTransactions(filtered.slice(startIndex, endIndex));
        setTotalCount(filtered.length);
        
        console.log(`🔍 [PAGINATION LOCAL] Loaded ${filtered.slice(startIndex, endIndex).length} transactions, total: ${filtered.length}`);
      }
    } catch (error) {
      console.error('Error loading paginated transactions:', error);
      setPaginatedTransactions([]);
      setTotalCount(0);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [currentPage, debouncedSearchQuery, typeFilter, categoryFilter, selectedTimeRange, customStartDate, customEndDate]);

  // Load transactions when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    loadPaginatedTransactions();
  }, [debouncedSearchQuery, typeFilter, categoryFilter, selectedTimeRange, customStartDate, customEndDate]);

  // Load transactions when page changes
  useEffect(() => {
    loadPaginatedTransactions();
  }, [currentPage]);

  // Initial load on component mount
  useEffect(() => {
    console.log(`🔍 [PAGINATION] Component mounted, loading initial transactions...`);
    console.log(`🔍 [PAGINATION] Current state:`, { 
      currentPage, 
      pageSize, 
      totalCount, 
      paginatedTransactionsLength: paginatedTransactions.length,
      transactionsLength: transactions.length 
    });
    loadPaginatedTransactions();
  }, []); // Empty dependency array for initial load only

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('transactions-search-query', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('transactions-type-filter', typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    localStorage.setItem('transactions-category-filter', categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    localStorage.setItem('transactions-time-range', selectedTimeRange);
  }, [selectedTimeRange]);

  useEffect(() => {
    if (customStartDate) {
      localStorage.setItem('transactions-custom-start-date', customStartDate.toISOString());
    } else {
      localStorage.removeItem('transactions-custom-start-date');
    }
  }, [customStartDate]);

  useEffect(() => {
    if (customEndDate) {
      localStorage.setItem('transactions-custom-end-date', customEndDate.toISOString());
    } else {
      localStorage.removeItem('transactions-custom-end-date');
    }
  }, [customEndDate]);

  // Manual reset function - only resets when user explicitly chooses
  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setCategoryFilter('');
    setSelectedTimeRange('this-month');
    setCustomStartDate(null);
    setCustomEndDate(null);
    
    // Clear localStorage
    localStorage.removeItem('transactions-search-query');
    localStorage.removeItem('transactions-type-filter');
    localStorage.removeItem('transactions-category-filter');
    localStorage.removeItem('transactions-time-range');
    localStorage.removeItem('transactions-custom-start-date');
    localStorage.removeItem('transactions-custom-end-date');
  };

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
      'gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other-income'
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
      // Date filtering
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      
      let dateMatches = false;
      switch (selectedTimeRange) {
        case 'all-time':
          dateMatches = true;
          break;
        case 'this-month':
          dateMatches = transactionYear === currentYear && transactionMonth === currentMonth;
          break;
        case 'last-month':
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          dateMatches = transactionYear === lastMonthYear && transactionMonth === lastMonth;
          break;
        case 'this-year':
          dateMatches = transactionYear === currentYear;
          break;
        case 'last-transactions':
          // For "last transactions", we'll sort by creation/update time instead of date filtering
          // This case will be handled differently - we'll return true here and sort later
          dateMatches = true;
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            // Normalize dates to only compare date parts (remove time components)
            const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
            const startDateOnly = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate());
            const endDateOnly = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate());
            
            dateMatches = transactionDateOnly >= startDateOnly && transactionDateOnly <= endDateOnly;
          } else {
            dateMatches = true;
          }
          break;
        default:
          dateMatches = true;
      }
      
      if (!dateMatches) return false;
      
      // Type filtering
      if (typeFilter && typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }
      
      // Category filtering - must match both category and type
      if (categoryFilter && transaction.category !== categoryFilter) {
        return false;
      }
      
      
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions()
    .filter(transaction => {
      // Get category label for search
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
        { value: 'other-income', label: 'Other Income' },
        
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
        { value: 'books-magazines', label: 'Books/Magazines' },
        { value: 'games-apps', label: 'Games/Apps' },
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
        { value: 'alcohol', label: 'Alcohol' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'coffee-shops', label: 'Coffee Shops' },
        { value: 'delivery-takeout', label: 'Delivery/Takeout' },
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
        { value: 'furniture-appliances', label: 'Furniture/Appliances' },
        { value: 'home-insurance', label: 'Home Insurance' },
        { value: 'maintenance-repairs', label: 'Maintenance/Repairs' },
        { value: 'property-tax', label: 'Property Tax' },
        { value: 'rent', label: 'Rent' },
        { value: 'mortgage', label: 'Mortgage' },
        { value: 'cleaning-products', label: 'Cleaning Products' },
        { value: 'electronics', label: 'Electronics' },
        { value: 'kitchen-utensils', label: 'Kitchen Utensils' },
        { value: 'household-goods', label: 'Household Goods' },
        { value: 'cash-withdrawals', label: 'Cash Withdrawals' },
        { value: 'cigarettes', label: 'Cigarettes' },
        { value: 'fines-penalties', label: 'Fines/Penalties' },
        { value: 'legal-fees', label: 'Legal Fees' },
        { value: 'lottery-gambling', label: 'Lottery & Gambling' },
        { value: 'other', label: 'Other' },
        { value: 'subscriptions', label: 'Subscriptions' },
        { value: 'tobacco-vaping', label: 'Tobacco/Vaping' },
        { value: 'cosmetics-skincare', label: 'Cosmetics/Skincare' },
        { value: 'haircuts-salon', label: 'Haircuts/Salon' },
        { value: 'laundry-dry-cleaning', label: 'Laundry/Dry Cleaning' },
        { value: 'spa-massage', label: 'Spa/Massage' },
        { value: 'personal-hygiene', label: 'Personal Hygiene' },
        { value: 'shaving-razor', label: 'Shaving Razor' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'shoes', label: 'Shoes' },
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
        { value: 'electricity', label: 'Electricity' },
        { value: 'gas', label: 'Gas' },
        { value: 'heating', label: 'Heating' },
        { value: 'trash-recycling', label: 'Trash/Recycling' },
        { value: 'water-sewer', label: 'Water/Sewer' },
        { value: 'building-maintenance', label: 'Building Maintenance' },
        { value: 'apartment-intercom', label: 'Apartment Intercom' },
        { value: 'building-cleaning', label: 'Building Cleaning' },
        { value: 'mobile-phone', label: 'Mobile Phone' },
        { value: 'landline-phone', label: 'Landline Phone' },
        { value: 'voip', label: 'VoIP' },
        { value: 'cable-satellite-tv', label: 'Cable/Satellite TV' },
        { value: 'internet', label: 'Internet' },
        { value: 'souvenirs', label: 'Souvenirs' }
      ];
      
      const categoryLabel = allSubcategories.find(cat => cat.value === transaction.category)?.label || transaction.category;
      
      const matchesSearch = debouncedSearchQuery === '' || 
        transaction.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        categoryLabel.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
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
          'other-income': ['gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other-income'],
          
          // Expense groups - alphabetically ordered
          'business-expenses': ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions'],
          'charitable-gifts': ['charitable-subscriptions', 'charity', 'donations', 'gifts'],
          'childcare': ['babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games'],
          'clothing-footwear': ['clothing', 'shoes'],
          'education': ['books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition'],
          'entertainment': ['books-magazines', 'concerts', 'games-apps', 'hobbies', 'movies', 'music-streaming', 'night-clubs', 'sports-recreation', 'theaters', 'vacation-travel'],
          'financial-obligations': ['bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes'],
          'food-dining': ['alcohol', 'beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants'],
          'healthcare': ['dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'pharmacy', 'prescriptions', 'therapy-counseling', 'vision'],
          'housing': ['apartment-intercom', 'building-cleaning', 'building-maintenance', 'cleaning-products', 'electronics', 'furniture-appliances', 'home-insurance', 'household-goods', 'kitchen-utensils', 'maintenance-repairs', 'mortgage', 'property-tax', 'rent'],
          'miscellaneous': ['cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping'],
          'online-shopping': ['souvenirs'],
          'personal-care': ['cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'personal-hygiene', 'shaving-razor', 'spa-massage'],
          'pets': ['grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary'],
          'telecommunications': ['cable-satellite-tv', 'internet', 'landline-phone', 'mobile-phone', 'voip'],
          'transportation': ['car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration'],
          'utilities': ['apartment-intercom', 'building-cleaning', 'building-maintenance', 'electricity', 'gas', 'heating', 'trash-recycling', 'water-sewer'],
        };
        
        if (categoryGroups[categoryFilter]) {
          matchesCategory = categoryGroups[categoryFilter].includes(transaction.category);
        }
        
      }
      
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      if (selectedTimeRange === 'last-transactions') {
        // Sort by record time (created_at or updated_at) - most recent first
        const aTime = a.updated_at || a.created_at || a.id;
        const bTime = b.updated_at || b.created_at || b.id;
        
        // Convert to timestamps for comparison
        const aTimestamp = new Date(aTime).getTime();
        const bTimestamp = new Date(bTime).getTime();
        
        return bTimestamp - aTimestamp; // Most recent first
      } else {
        // Sort by transaction date - more recent dates first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  // Apply limit for "last-transactions" view
  const finalFilteredTransactions = selectedTimeRange === 'last-transactions' 
    ? filteredTransactions.slice(0, 50) // Show only the 50 most recent transactions
    : filteredTransactions;

  // Category options for react-select
  const getCategoryOptions = () => {
    const incomeParentCategories = [
      { value: 'employment-income', label: 'Employment Income' },
      { value: 'business-self-employment', label: 'Business & Self-Employment' },
      { value: 'investment-income', label: 'Investment Income' },
      { value: 'passive-income', label: 'Passive Income' },
      { value: 'government-benefits', label: 'Government & Benefits' }
    ];

    const expenseParentCategories = [
      { value: 'business-expenses', label: 'Business Expenses' },
      { value: 'charitable-gifts', label: 'Charitable & Gifts' },
      { value: 'childcare', label: 'Childcare' },
      { value: 'clothing-footwear', label: 'Clothing & Footwear' },
      { value: 'education', label: 'Education' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'financial-obligations', label: 'Financial Obligations' },
      { value: 'food-dining', label: 'Food & Dining' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'housing', label: 'Housing' },
      { value: 'online-shopping', label: 'Online Shopping' },
      { value: 'personal-care', label: 'Personal Care' },
      { value: 'pets', label: 'Pets' },
      { value: 'telecommunications', label: 'Telecommunications' },
      { value: 'transportation', label: 'Transportation' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'miscellaneous', label: 'Miscellaneous' }
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
      { value: 'other-income', label: 'Other Income' },
      
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
      { value: 'alcohol', label: 'Alcohol' },
      { value: 'beverages', label: 'Beverages' },
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
      { value: 'rent', label: 'Rent' },
      { value: 'mortgage', label: 'Mortgage' },
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
      { value: 'other', label: 'Other' },
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
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' },
      { value: 'heating', label: 'Heating' },
      { value: 'mobile-phone', label: 'Mobile Phone' },
      { value: 'landline-phone', label: 'Landline Phone' },
      { value: 'voip', label: 'VoIP' },
      { value: 'cable-satellite-tv', label: 'Cable/Satellite TV' },
      { value: 'internet', label: 'Internet' },
      { value: 'trash-recycling', label: 'Trash/Recycling' },
      { value: 'water-sewer', label: 'Water & Sewer' },
      { value: 'building-maintenance', label: 'Building Maintenance' },
      { value: 'apartment-intercom', label: 'Apartment Intercom' },
      { value: 'building-cleaning', label: 'Building Cleaning' },
      
      // Investment subcategories
      { value: 'savings-account', label: 'Savings Account' },
      { value: 'term-deposits', label: 'Term Deposits' },
      { value: 'high-yield-savings', label: 'High-Yield Savings' },
      { value: 'money-market', label: 'Money Market' },
      { value: 'bitcoin', label: 'Bitcoin' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'altcoins', label: 'Altcoins' },
      { value: 'crypto-staking', label: 'Crypto Staking' },
      { value: 'binance-p2p', label: 'Binance P2P' },
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

    // Create flat list with parent categories and subcategories
    const createFlatOptions = (categories: any[], subcategories: any[]) => {
      const flatOptions: any[] = [];
      
      // Add all subcategories first (individual selectable options)
      flatOptions.push(...subcategories);
      
      // Then add parent categories
      flatOptions.push(...categories);
      
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
          'gifts', 'inheritance', 'lottery-gambling', 'rebates-cashback', 'reimbursements', 'sold-items', 'other-income'];
        return incomeSubs.includes(sub.value);
      });
      return createFlatOptions(incomeParentCategories, incomeSubs);
    } else if (typeFilter === 'expense') {
      const expenseSubs = allSubcategories.filter(sub => {
        const expenseSubs = ['business-travel', 'equipment', 'marketing-advertising', 'office-supplies', 'professional-fees', 'software-subscriptions',
          'charitable-subscriptions', 'donations', 'gifts', 'charity', 'babysitting', 'child-support', 'daycare', 'kids-activities', 'school-supplies', 'toys-games',
          'books-supplies', 'online-courses', 'student-loans', 'tutoring', 'tuition',
          'books-magazines', 'games-apps', 'hobbies', 'music-streaming', 'sports-recreation', 'vacation-travel', 'movies', 'concerts', 'theaters', 'night-clubs', 'event-tickets',
          'bank-fees', 'credit-card-payments', 'investment-contributions', 'life-insurance', 'personal-loans', 'savings', 'taxes',
          'alcohol', 'beverages', 'coffee-shops', 'delivery-takeout', 'fast-food', 'groceries', 'restaurants', 'snacks-candies',
          'dental', 'doctor-visits', 'fitness-gym', 'health-insurance', 'hospital-emergency', 'prescriptions', 'therapy-counseling', 'vision', 'pharmacy',
          'furniture-appliances', 'home-insurance', 'maintenance-repairs', 'property-tax', 'rent', 'mortgage', 'cleaning-products', 'electronics', 'kitchen-utensils', 'household-goods',
          'cash-withdrawals', 'cigarettes', 'fines-penalties', 'legal-fees', 'lottery-gambling', 'other', 'subscriptions', 'tobacco-vaping',
          'cosmetics-skincare', 'haircuts-salon', 'laundry-dry-cleaning', 'spa-massage', 'personal-hygiene', 'shaving-razor',
          'clothing', 'shoes',
          'grooming', 'pet-food', 'pet-insurance', 'pet-supplies', 'veterinary',
          'car-insurance', 'car-payment', 'gas-fuel', 'interurban-travel', 'international-travel', 'maintenance-repairs', 'parking', 'public-transit', 'rideshare-taxi', 'tolls', 'vehicle-registration',
          'electricity', 'gas', 'heating', 'trash-recycling', 'water-sewer', 'building-maintenance', 'apartment-intercom', 'building-cleaning',
          'mobile-phone', 'landline-phone', 'voip', 'cable-satellite-tv', 'internet', 'electronics', 'souvenirs'];
        return expenseSubs.includes(sub.value);
      });
      return createFlatOptions(expenseParentCategories, expenseSubs);
    } else if (typeFilter === 'investment') {
      const investmentSubs = allSubcategories.filter(sub => {
        const investmentSubs = ['savings-account', 'term-deposits', 'high-yield-savings', 'money-market',
          'bitcoin', 'ethereum', 'altcoins', 'crypto-staking', 'binance-p2p',
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
    const totalTransactions = finalFilteredTransactions.length;
    const totalAmount = finalFilteredTransactions.reduce((sum, t) => sum + t.amount, 0);
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
    finalFilteredTransactions.forEach((transaction, _index) => {
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Search Field - Takes full width on mobile, 4 columns on desktop */}
          <div className="lg:col-span-4">
            <div className="flex items-center bg-background border border-border rounded-md px-3 py-2 w-full">
            <SearchIcon size={18} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="bg-transparent border-none focus:outline-none text-white w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filter Controls - Takes remaining space */}
          <div className="lg:col-span-8">
            <div className="flex gap-3">
                <select 
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm min-w-[120px]"
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
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm min-w-[140px]"
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                >
              <option value="all-time">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="last-transactions">Last Transactions</option>
              <option value="custom">Custom Range</option>
            </select>
                
        <Button 
          variant="secondary" 
          onClick={resetFilters}
          className="text-sm px-3 py-2"
        >
          Reset All Filters
        </Button>
            </div>
          </div>
        </div>
        
        {/* Custom Date Range - Separate row when needed */}
        {selectedTimeRange === 'custom' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            <div className="lg:col-span-4"></div> {/* Empty space to align with search */}
            <div className="lg:col-span-8">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Start Date</label>
                  <DatePicker
                    selected={customStartDate}
                    onChange={(date) => setCustomStartDate(date)}
                    selectsStart
                    startDate={customStartDate}
                    endDate={customEndDate}
                    dateFormat="yyyy-MM-dd"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={15}
                    scrollableYearDropdown
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight"
                    wrapperClassName="w-auto"
                    calendarClassName="bg-surface border border-border text-white"
                    placeholderText="Start Date"
                  />
                </div>
                <span className="text-gray-400 text-sm mt-6">to</span>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">End Date</label>
                  <DatePicker
                    selected={customEndDate}
                    onChange={(date) => setCustomEndDate(date)}
                    selectsEnd
                    startDate={customStartDate}
                    endDate={customEndDate}
                    minDate={customStartDate || undefined}
                    dateFormat="yyyy-MM-dd"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={15}
                    scrollableYearDropdown
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight"
                    wrapperClassName="w-auto"
                    calendarClassName="bg-surface border border-border text-white"
                    placeholderText="End Date"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <TransactionList 
          transactions={paginatedTransactions} 
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          selectedTimeRange={selectedTimeRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          isLoading={isLoadingTransactions}
          useExternalPagination={true}
        />
        
        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoadingTransactions}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-400">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoadingTransactions}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>;
};