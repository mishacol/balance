import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { Button } from '../ui/Button';
import { useTransactionStore } from '../../store/transactionStore';
import { transactionSchema, TransactionFormData } from '../../schemas/transactionSchema';
import { Transaction } from '../../types';
export const TransactionForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions, addTransaction, updateTransaction } = useTransactionStore();
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'investment'>('income');
  
  // Check if we're editing an existing transaction
  const isEditing = Boolean(id);
  const existingTransaction = isEditing ? transactions.find(t => t.id === id) : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
    },
  });

  // Populate form with existing transaction data when editing
  useEffect(() => {
    if (existingTransaction) {
      setSelectedType(existingTransaction.type);
      reset({
        type: existingTransaction.type,
        amount: existingTransaction.amount,
        currency: existingTransaction.currency,
        category: existingTransaction.category,
        description: existingTransaction.description || '',
        date: existingTransaction.date,
      });
    }
  }, [existingTransaction, reset]);

  const onSubmit = (data: TransactionFormData) => {
    if (isEditing && existingTransaction) {
      updateTransaction(existingTransaction.id, data);
    } else {
      addTransaction(data);
    }
    navigate('/transactions');
  };

  const handleTypeChange = (type: 'income' | 'expense' | 'investment') => {
    setSelectedType(type);
    setValue('type', type);
    setValue('category', ''); // Reset category when type changes
  };

  // Category options for react-select
  const getCategoryOptions = () => {
    if (selectedType === 'income') {
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
        }
      ];
    } else if (selectedType === 'investment') {
      return [
        {
          label: 'Savings & Deposits',
          options: [
            { value: 'savings-account', label: 'Savings Account' },
            { value: 'term-deposits', label: 'Term Deposits' },
            { value: 'high-yield-savings', label: 'High-Yield Savings' },
            { value: 'money-market', label: 'Money Market' }
          ]
        },
        {
          label: 'Cryptocurrency',
          options: [
            { value: 'bitcoin', label: 'Bitcoin' },
            { value: 'ethereum', label: 'Ethereum' },
            { value: 'altcoins', label: 'Altcoins' },
            { value: 'crypto-staking', label: 'Crypto Staking' },
            { value: 'binance-p2p', label: 'Binance P2P' }
          ]
        },
        {
          label: 'Stocks & Bonds',
          options: [
            { value: 'individual-stocks', label: 'Individual Stocks' },
            { value: 'mutual-funds', label: 'Mutual Funds' },
            { value: 'etfs', label: 'ETFs' },
            { value: 'government-bonds', label: 'Government Bonds' },
            { value: 'corporate-bonds', label: 'Corporate Bonds' }
          ]
        },
        {
          label: 'Real Estate',
          options: [
            { value: 'real-estate-investment', label: 'Real Estate Investment' },
            { value: 'reits', label: 'REITs' },
            { value: 'property-investment', label: 'Property Investment' }
          ]
        },
        {
          label: 'Other Investments',
          options: [
            { value: 'precious-metals', label: 'Precious Metals' },
            { value: 'commodities', label: 'Commodities' },
            { value: 'trusts', label: 'Trusts' },
            { value: 'other-investments', label: 'Other Investments' }
          ]
        }
      ];
    } else {
      return [
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
            { value: 'gifts', label: 'Gifts' },
            { value: 'charity', label: 'Charity' }
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
            { value: 'music-streaming', label: 'Music/Streaming' },
            { value: 'sports-recreation', label: 'Sports/Recreation' },
            { value: 'vacation-travel', label: 'Vacation/Travel' },
            { value: 'movies', label: 'Movies' },
            { value: 'concerts', label: 'Concerts' },
            { value: 'theaters', label: 'Theaters' },
            { value: 'night-clubs', label: 'Night Clubs' }
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
            { value: 'vision', label: 'Vision' },
            { value: 'pharmacy', label: 'Pharmacy' }
          ]
        },
        {
          label: 'Housing',
          options: [
            { value: 'furniture-appliances', label: 'Furniture & Appliances' },
            { value: 'home-insurance', label: 'Home Insurance' },
            { value: 'maintenance-repairs', label: 'Maintenance & Repairs' },
            { value: 'property-tax', label: 'Property Tax' },
            { value: 'rent-mortgage', label: 'Rent/Mortgage' },
            { value: 'cleaning-products', label: 'Cleaning Products' },
            { value: 'electronics', label: 'Electronics' },
            { value: 'kitchen-utensils', label: 'Kitchen Utensils' },
            { value: 'household-goods', label: 'Household Goods' }
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
            { value: 'gas', label: 'Gas' },
            { value: 'heating', label: 'Heating' },
            { value: 'internet', label: 'Internet' },
            { value: 'phone', label: 'Phone' },
            { value: 'trash-recycling', label: 'Trash/Recycling' },
            { value: 'water-sewer', label: 'Water & Sewer' }
          ]
        }
      ];
    }
  };

  return <div className="bg-surface border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">
        {isEditing ? 'Edit Transaction' : 'Add Transaction'}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Type
            </label>
            <div className="flex rounded-md overflow-hidden">
              <button 
                type="button" 
                className={`flex-1 py-2 font-medium ${
                  selectedType === 'income' 
                    ? 'bg-income/10 text-income border border-income/30' 
                    : 'bg-surface text-gray-400 border border-border-light'
                }`}
                onClick={() => handleTypeChange('income')}
              >
                Income
              </button>
              <button 
                type="button" 
                className={`flex-1 py-2 font-medium ${
                  selectedType === 'expense' 
                    ? 'bg-expense/10 text-expense border border-expense/30' 
                    : 'bg-surface text-gray-400 border border-border-light'
                }`}
                onClick={() => handleTypeChange('expense')}
              >
                Expense
              </button>
              <button 
                type="button" 
                className={`flex-1 py-2 font-medium ${
                  selectedType === 'investment' 
                    ? 'bg-highlight/10 text-highlight border border-highlight/30' 
                    : 'bg-surface text-gray-400 border border-border-light'
                }`}
                onClick={() => handleTypeChange('investment')}
              >
                Investment
              </button>
            </div>
            {errors.type && <p className="text-expense text-xs mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Date
            </label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value ? new Date(field.value) : new Date()}
                  onChange={(date) => {
                    if (date) {
                      const formattedDate = date.toISOString().split('T')[0];
                      field.onChange(formattedDate);
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={15}
                  scrollableYearDropdown
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight"
                  wrapperClassName="w-full"
                  calendarClassName="bg-surface border border-border text-white"
                  dayClassName={(date) => "text-white hover:bg-highlight/20"}
                  monthClassName={() => "text-white"}
                  yearClassName={() => "text-white"}
                />
              )}
            />
            {errors.date && <p className="text-expense text-xs mt-1">{errors.date.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Amount
            </label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              {...register('amount', { valueAsNumber: true })}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight font-mono" 
            />
            {errors.amount && <p className="text-expense text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Currency
            </label>
            <select 
              {...register('currency')}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="MDL">MDL - Moldovan Leu</option>
            </select>
            {errors.currency && <p className="text-expense text-xs mt-1">{errors.currency.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Category <span className="text-expense">*</span>
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <Select
                {...field}
                value={value ? getCategoryOptions().flatMap(group => group.options).find(opt => opt.value === value) : null}
                onChange={(selectedOption) => onChange(selectedOption?.value || '')}
                options={getCategoryOptions()}
                placeholder="Please select a category"
                isSearchable
                isClearable
                filterOption={(option, inputValue) => {
                  return option.label.toLowerCase().includes(inputValue.toLowerCase());
                }}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: '#121212',
                    borderColor: '#1f1f1f',
                    color: '#ffffff',
                    minHeight: '42px',
                    '&:hover': {
                      borderColor: '#00d9ff',
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#121212',
                    border: '1px solid #1f1f1f',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? 'rgba(0, 217, 255, 0.2)' : '#121212',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 217, 255, 0.2)',
                    },
                  }),
                  groupHeading: (base) => ({
                    ...base,
                    color: '#00d9ff',
                    fontWeight: '600',
                    backgroundColor: '#1a1a1a',
                    padding: '6px 8px',
                    fontSize: '0.875rem',
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: '#9ca3af',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: '#ffffff',
                  }),
                  input: (base) => ({
                    ...base,
                    color: '#ffffff',
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
                    neutral0: '#121212',
                    neutral5: '#1a1a1a',
                    neutral10: '#1f1f1f',
                    neutral20: '#374151',
                    neutral30: '#4b5563',
                    neutral40: '#6b7280',
                    neutral50: '#9ca3af',
                    neutral60: '#d1d5db',
                    neutral70: '#e5e7eb',
                    neutral80: '#f3f4f6',
                    neutral90: '#ffffff',
                  },
                })}
              />
            )}
          />
          {errors.category && <p className="text-expense text-xs mt-1">{errors.category.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Description
            {watch('category') === 'other' && (
              <span className="text-highlight ml-1">*</span>
            )}
          </label>
          <input 
            type="text" 
            placeholder={watch('category') === 'other' ? 'Please provide a detailed description...' : 'Transaction description (optional)'} 
            {...register('description')}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-highlight" 
          />
          {errors.description && <p className="text-expense text-xs mt-1">{errors.description.message}</p>}
          {watch('category') === 'other' && !errors.description && (
            <p className="text-highlight text-xs mt-1">Detailed description required for "Other" category</p>
          )}
        </div>
        <div className="pt-4 flex justify-end space-x-3">
          <Button variant="outline" type="button" onClick={() => navigate('/transactions')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {isEditing ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </div>;
};