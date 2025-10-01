import React from 'react';
import { Card } from '../ui/Card';
import { SettingsIcon, DollarSignIcon, ShieldIcon } from 'lucide-react';
import { useTransactionStore } from '../../store/transactionStore';

export const SettingsPage: React.FC = () => {
  const { backupMode, setBackupMode, baseCurrency, setBaseCurrency, monthlyIncomeTarget, setMonthlyIncomeTarget } = useTransactionStore();

  const currencies = [
    { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' },
    { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'BUSD', name: 'Binance USD', symbol: '₮' },
    { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'DAI', name: 'Dai', symbol: '₮' },
    { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj' },
    { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
    { code: 'EURS', name: 'STASIS EURO', symbol: '€' },
    { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'FRAX', name: 'Frax', symbol: '₮' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
    { code: 'GNF', name: 'Guinean Franc', symbol: 'FG' },
    { code: 'GUSD', name: 'Gemini Dollar', symbol: '₮' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr' },
    { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'KMF', name: 'Comorian Franc', symbol: 'CF' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل' },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨' },
    { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$' },
    { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
    { code: 'LUSD', name: 'Liquity USD', symbol: '₮' },
    { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.' },
    { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
    { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
    { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'OMR', name: 'Omani Rial', symbol: '﷼' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
    { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨' },
    { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le' },
    { code: 'SOS', name: 'Somali Shilling', symbol: 'S' },
    { code: 'SUSD', name: 'Synthetix USD', symbol: '₮' },
    { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'L' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'TUSD', name: 'TrueUSD', symbol: '₮' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'USDC', name: 'USD Coin', symbol: '₮' },
    { code: 'USDD', name: 'USDD', symbol: '₮' },
    { code: 'USDP', name: 'Pax Dollar', symbol: '₮' },
    { code: 'USDT', name: 'Tether', symbol: '₮' },
    { code: 'UST', name: 'TerraUSD', symbol: '₮' },
    { code: 'USDN', name: 'Neutrino USD', symbol: '₮' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
    { code: 'XPF', name: 'CFP Franc', symbol: '₣' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' }
  ];

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setBaseCurrency(event.target.value);
  };

  const handleBackupModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setBackupMode(event.target.value as 'manual' | 'automatic');
  };

  const handleMonthlyTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMonthlyIncomeTarget(parseFloat(event.target.value) || 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Base Currency Setting */}
        <Card title="Currency Settings" className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <DollarSignIcon size={20} className="text-highlight" />
              <div className="flex-1">
                <label htmlFor="base-currency" className="block text-sm font-medium text-gray-300 mb-2">
                  Base Currency
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  This currency will be used as the default for new transactions and calculations.
                </p>
                <select
                  id="base-currency"
                  value={baseCurrency}
                  onChange={handleCurrencyChange}
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm w-full max-w-xs"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Coming Soon Settings */}
        <Card title="Display Settings" className="mb-6">
          <div className="text-center py-8">
            <SettingsIcon size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              More display and customization options will be available soon.
            </p>
          </div>
        </Card>

        {/* Backup Settings */}
        <Card title="Backup Settings" className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <ShieldIcon size={20} className="text-highlight" />
              <div className="flex-1">
                <label htmlFor="backup-mode" className="block text-sm font-medium text-gray-300 mb-2">
                  Backup Mode
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Choose how backups are created. Manual requires user action, Automatic creates backups every 15 minutes.
                </p>
                <select
                  id="backup-mode"
                  value={backupMode}
                  onChange={handleBackupModeChange}
                  className="bg-surface border border-border text-white rounded px-3 py-2 text-sm w-full max-w-xs"
                >
                  <option value="manual">Manual</option>
                  <option value="automatic">Automatic (Every 15 minutes)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Monthly Income Target */}
        <Card title="Income Goals" className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <DollarSignIcon size={20} className="text-income" />
              <div className="flex-1">
                <label htmlFor="monthly-target" className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Income Target
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Set your monthly income goal to track your progress and get motivational feedback.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    id="monthly-target"
                    type="number"
                    value={monthlyIncomeTarget}
                    onChange={handleMonthlyTargetChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="bg-surface border border-border text-white rounded px-3 py-2 text-sm w-32"
                  />
                  <span className="text-sm text-gray-400">{baseCurrency}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Data Settings" className="mb-6">
          <div className="text-center py-8">
            <SettingsIcon size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              More data management and export options will be available soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
