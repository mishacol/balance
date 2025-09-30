import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { TransactionList } from './TransactionList';
import { Button } from '../ui/Button';
import { useTransactionStore } from '../../store/transactionStore';
import { FilterIcon, SearchIcon } from 'lucide-react';
import Select from 'react-select';
export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, searchTransactions } = useTransactionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = searchQuery === '' || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === '' || transaction.type === typeFilter;
      const matchesCategory = categoryFilter === '' || transaction.category === categoryFilter;
      
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category options for react-select
  const getCategoryOptions = () => {
    return [
      {
        label: 'Employment Income',
        options: [
          { value: 'bonus', label: 'Bonus' },
          { value: 'commission', label: 'Commission' },
          { value: 'hourly-wages', label: 'Hourly Wages' },
          { value: 'overtime', label: 'Overtime' },
          { value: 'salary', label: 'Salary' },
          { value: 'tips-gratuities', label: 'Tips & Gratuities' }
        ]
      },
      {
        label: 'Business & Self-Employment',
        options: [
          { value: 'affiliate-income', label: 'Affiliate Income' },
          { value: 'business-revenue', label: 'Business Revenue' },
          { value: 'consulting-fees', label: 'Consulting Fees' },
          { value: 'freelance-income', label: 'Freelance Income' },
          { value: 'royalties', label: 'Royalties' }
        ]
      },
      {
        label: 'Investment Income',
        options: [
          { value: 'capital-gains', label: 'Capital Gains' },
          { value: 'crypto-gains', label: 'Crypto Gains' },
          { value: 'dividends', label: 'Dividends' },
          { value: 'interest', label: 'Interest' },
          { value: 'rental-income', label: 'Rental Income' }
        ]
      },
      {
        label: 'Passive Income',
        options: [
          { value: 'ad-revenue', label: 'Ad Revenue' },
          { value: 'automated-business', label: 'Automated Business' },
          { value: 'licensing-fees', label: 'Licensing Fees' },
          { value: 'subscription-revenue', label: 'Subscription Revenue' }
        ]
      },
      {
        label: 'Government & Benefits',
        options: [
          { value: 'grants-subsidies', label: 'Grants & Subsidies' },
          { value: 'pension', label: 'Pension' },
          { value: 'social-security', label: 'Social Security' },
          { value: 'tax-refund', label: 'Tax Refund' },
          { value: 'unemployment-benefits', label: 'Unemployment Benefits' }
        ]
      },
      {
        label: 'Other Income',
        options: [
          { value: 'gifts', label: 'Gifts' },
          { value: 'inheritance', label: 'Inheritance' },
          { value: 'lottery-gambling', label: 'Lottery & Gambling' },
          { value: 'rebates-cashback', label: 'Rebates & Cashback' },
          { value: 'reimbursements', label: 'Reimbursements' },
          { value: 'sold-items', label: 'Sold Items' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        label: 'Business Expenses',
        options: [
          { value: 'business-travel', label: 'Business Travel' },
          { value: 'equipment', label: 'Equipment' },
          { value: 'marketing-advertising', label: 'Marketing/Advertising' },
          { value: 'office-supplies', label: 'Office Supplies' },
          { value: 'professional-fees', label: 'Professional Fees' },
          { value: 'software-subscriptions', label: 'Software/Subscriptions' }
        ]
      },
      {
        label: 'Charitable & Gifts',
        options: [
          { value: 'charitable-subscriptions', label: 'Charitable Subscriptions' },
          { value: 'donations', label: 'Donations' },
          { value: 'gifts', label: 'Gifts' }
        ]
      },
      {
        label: 'Childcare',
        options: [
          { value: 'babysitting', label: 'Babysitting' },
          { value: 'child-support', label: 'Child Support' },
          { value: 'daycare', label: 'Daycare' },
          { value: 'kids-activities', label: 'Kids Activities' },
          { value: 'school-supplies', label: 'School Supplies' },
          { value: 'toys-games', label: 'Toys & Games' }
        ]
      },
      {
        label: 'Education',
        options: [
          { value: 'books-supplies', label: 'Books & Supplies' },
          { value: 'online-courses', label: 'Online Courses' },
          { value: 'student-loans', label: 'Student Loans' },
          { value: 'tutoring', label: 'Tutoring' },
          { value: 'tuition', label: 'Tuition' }
        ]
      },
      {
        label: 'Entertainment',
        options: [
          { value: 'books-magazines', label: 'Books & Magazines' },
          { value: 'games-apps', label: 'Games & Apps' },
          { value: 'hobbies', label: 'Hobbies' },
          { value: 'movies-concerts', label: 'Movies & Concerts' },
          { value: 'music-streaming', label: 'Music/Streaming' },
          { value: 'sports-recreation', label: 'Sports/Recreation' },
          { value: 'vacation-travel', label: 'Vacation/Travel' }
        ]
      },
      {
        label: 'Financial Obligations',
        options: [
          { value: 'bank-fees', label: 'Bank Fees' },
          { value: 'credit-card-payments', label: 'Credit Card Payments' },
          { value: 'investment-contributions', label: 'Investment Contributions' },
          { value: 'life-insurance', label: 'Life Insurance' },
          { value: 'personal-loans', label: 'Personal Loans' },
          { value: 'savings', label: 'Savings' },
          { value: 'taxes', label: 'Taxes' }
        ]
      },
      {
        label: 'Food & Dining',
        options: [
          { value: 'alcohol-beverages', label: 'Alcohol & Beverages' },
          { value: 'coffee-shops', label: 'Coffee Shops' },
          { value: 'delivery-takeout', label: 'Delivery & Takeout' },
          { value: 'fast-food', label: 'Fast Food' },
          { value: 'groceries', label: 'Groceries' },
          { value: 'restaurants', label: 'Restaurants' }
        ]
      },
      {
        label: 'Healthcare',
        options: [
          { value: 'dental', label: 'Dental' },
          { value: 'doctor-visits', label: 'Doctor Visits' },
          { value: 'fitness-gym', label: 'Fitness/Gym' },
          { value: 'health-insurance', label: 'Health Insurance' },
          { value: 'hospital-emergency', label: 'Hospital/Emergency' },
          { value: 'prescriptions', label: 'Prescriptions' },
          { value: 'therapy-counseling', label: 'Therapy/Counseling' },
          { value: 'vision', label: 'Vision' }
        ]
      },
      {
        label: 'Housing',
        options: [
          { value: 'furniture-appliances', label: 'Furniture & Appliances' },
          { value: 'hoa-fees', label: 'HOA Fees' },
          { value: 'home-insurance', label: 'Home Insurance' },
          { value: 'maintenance-repairs', label: 'Maintenance & Repairs' },
          { value: 'property-tax', label: 'Property Tax' },
          { value: 'rent-mortgage', label: 'Rent/Mortgage' }
        ]
      },
      {
        label: 'Miscellaneous',
        options: [
          { value: 'cash-withdrawals', label: 'Cash Withdrawals' },
          { value: 'cigarettes', label: 'Cigarettes' },
          { value: 'fines-penalties', label: 'Fines & Penalties' },
          { value: 'legal-fees', label: 'Legal Fees' },
          { value: 'lottery-gambling', label: 'Lottery/Gambling' },
          { value: 'other', label: 'Other' },
          { value: 'subscriptions', label: 'Subscriptions' },
          { value: 'tobacco-vaping', label: 'Tobacco/Vaping' }
        ]
      },
      {
        label: 'Personal Care',
        options: [
          { value: 'cosmetics-skincare', label: 'Cosmetics/Skincare' },
          { value: 'haircuts-salon', label: 'Haircuts/Salon' },
          { value: 'laundry-dry-cleaning', label: 'Laundry/Dry Cleaning' },
          { value: 'shoes', label: 'Shoes' },
          { value: 'spa-massage', label: 'Spa/Massage' },
          { value: 'clothing', label: 'Clothing' }
        ]
      },
      {
        label: 'Pets',
        options: [
          { value: 'grooming', label: 'Grooming' },
          { value: 'pet-food', label: 'Pet Food' },
          { value: 'pet-insurance', label: 'Pet Insurance' },
          { value: 'pet-supplies', label: 'Pet Supplies' },
          { value: 'veterinary', label: 'Veterinary' }
        ]
      },
      {
        label: 'Transportation',
        options: [
          { value: 'car-insurance', label: 'Car Insurance' },
          { value: 'car-payment', label: 'Car Payment' },
          { value: 'gas-fuel', label: 'Gas/Fuel' },
          { value: 'interurban-travel', label: 'Interurban Travel' },
          { value: 'international-travel', label: 'International Travel' },
          { value: 'maintenance-repairs', label: 'Maintenance & Repairs' },
          { value: 'parking', label: 'Parking' },
          { value: 'public-transit', label: 'Public Transit' },
          { value: 'rideshare-taxi', label: 'Rideshare/Taxi' },
          { value: 'tolls', label: 'Tolls' },
          { value: 'vehicle-registration', label: 'Vehicle Registration' }
        ]
      },
      {
        label: 'Utilities',
        options: [
          { value: 'cable-streaming', label: 'Cable/Streaming' },
          { value: 'electricity', label: 'Electricity' },
          { value: 'gas-heating', label: 'Gas/Heating' },
          { value: 'internet', label: 'Internet' },
          { value: 'phone', label: 'Phone' },
          { value: 'trash-recycling', label: 'Trash/Recycling' },
          { value: 'water-sewer', label: 'Water & Sewer' }
        ]
      }
    ];
  };

  return <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center space-x-4">
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
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <div className="w-48">
              <Select
                value={categoryFilter ? { value: categoryFilter, label: getCategoryOptions().flatMap(group => group.options).find(opt => opt.value === categoryFilter)?.label || categoryFilter } : null}
                onChange={(selectedOption) => setCategoryFilter(selectedOption?.value || '')}
                options={getCategoryOptions()}
                placeholder="All Categories"
                isSearchable
                isClearable
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
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? 'rgba(0, 217, 255, 0.2)' : '#1f2937',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 217, 255, 0.2)',
                    },
                  }),
                  groupHeading: (base) => ({
                    ...base,
                    color: '#00d9ff',
                    fontWeight: '600',
                    backgroundColor: '#111827',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                  }),
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
            <select className="bg-surface border border-border text-white rounded px-3 py-2 text-sm">
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <Button variant="secondary" size="sm" className="flex items-center">
              <FilterIcon size={16} className="mr-1" />
              More Filters
            </Button>
          </div>
        </div>
        <TransactionList transactions={filteredTransactions} />
      </Card>
    </div>;
};