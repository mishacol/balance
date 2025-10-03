import axios from 'axios';

export interface ExchangeRates {
  [currency: string]: number;
}

export interface CurrencyResponse {
  error: number;
  error_message: string;
  amount: number;
}

class CurrencyService {
  private cache: { [key: string]: { data: number; timestamp: number } } = {};
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly API_KEY = 'YigRbqKy98XUu7DFPGMQMPLSQCH4vE';
  private readonly BASE_URL = 'https://www.amdoren.com/api/currency.php';
  private apiFailureCount = 0;
  private readonly MAX_FAILURES = 3;
  private lastFailureTime = 0;
  private readonly FAILURE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(from: string, to: string): string {
    return `${from}-${to}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    console.log(`🔄 [CURRENCY] Getting exchange rate: ${from} → ${to}`);

    const cacheKey = this.getCacheKey(from, to);
    const cached = this.cache[cacheKey];

    // Check if we have cached data that's still valid
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`✅ [CURRENCY] Using cached rate: ${from} → ${to} = ${cached.data}`);
      return cached.data;
    }

    // Circuit breaker: if API has failed too many times recently, use fallback
    const now = Date.now();
    if (this.apiFailureCount >= this.MAX_FAILURES && 
        (now - this.lastFailureTime) < this.FAILURE_COOLDOWN) {
      console.warn('API circuit breaker active, using fallback rates');
      return this.getFallbackRate(from, to);
    }

    try {
      console.log(`🌐 [CURRENCY] Making API call: ${from} → ${to}`);
      const response = await axios.get(this.BASE_URL, {
        params: {
          api_key: this.API_KEY,
          from: from,
          to: to,
          amount: 1
        },
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.data && response.data.error === 0) {
        // Reset failure count on success
        this.apiFailureCount = 0;
        
        const rate = response.data.amount;
        console.log(`✅ [CURRENCY] API success: ${from} → ${to} = ${rate}`);
        
        // Cache the data
        this.cache[cacheKey] = {
          data: rate,
          timestamp: now
        };

        return rate;
      } else {
        throw new Error(`API Error: ${response.data?.error_message || 'Unknown error'}`);
      }
    } catch (error) {
      // Increment failure count and record failure time
      this.apiFailureCount++;
      this.lastFailureTime = now;
      
      console.warn(`❌ [CURRENCY] API failure ${this.apiFailureCount}/${this.MAX_FAILURES}, using fallback rates`);
      console.error(`❌ [CURRENCY] Error:`, error);
      
      // Cache fallback rate to avoid repeated API calls
      const fallbackRate = this.getFallbackRate(from, to);
      console.log(`🔄 [CURRENCY] Using fallback rate: ${from} → ${to} = ${fallbackRate}`);
      this.cache[cacheKey] = {
        data: fallbackRate,
        timestamp: now
      };
      
      return fallbackRate;
    }
  }

  private getFallbackRate(from: string, to: string): number {
    // Fallback rates (approximate, for when API is unavailable)
    const fallbackRates: { [key: string]: { [key: string]: number } } = {
      USD: {
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110,
        MDL: 18.5,
        RUB: 75.0,
        CHF: 0.88,
        CAD: 1.25,
        AUD: 1.35
      },
      EUR: {
        USD: 1.18,
        GBP: 0.86,
        JPY: 129,
        MDL: 21.8,
        RUB: 88.0,
        CHF: 1.04,
        CAD: 1.47,
        AUD: 1.59
      },
      GBP: {
        USD: 1.37,
        EUR: 1.16,
        JPY: 150,
        MDL: 25.3,
        RUB: 102.0,
        CHF: 1.20,
        CAD: 1.71,
        AUD: 1.85
      },
      JPY: {
        USD: 0.0091,
        EUR: 0.0077,
        GBP: 0.0067,
        MDL: 0.17,
        RUB: 0.68,
        CHF: 0.008,
        CAD: 0.011,
        AUD: 0.012
      },
      MDL: {
        USD: 0.054,
        EUR: 0.046,
        GBP: 0.04,
        JPY: 5.9,
        RUB: 4.05,
        CHF: 0.048,
        CAD: 0.068,
        AUD: 0.074
      }
    };

    return fallbackRates[from]?.[to] || 1;
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      console.log(`🔄 [CURRENCY] Same currency, no conversion needed: ${amount} ${fromCurrency}`);
      return amount;
    }

    console.log(`💰 [CURRENCY] Converting: ${amount} ${fromCurrency} → ${toCurrency}`);
    
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount * rate;
      console.log(`✅ [CURRENCY] Converted: ${amount} ${fromCurrency} × ${rate} = ${convertedAmount} ${toCurrency}`);
      return convertedAmount;
    } catch (error) {
      console.log(`⚠️ [CURRENCY] Conversion failed, using fallback rates`);
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      const convertedAmount = amount * fallbackRate;
      console.log(`🔄 [CURRENCY] Fallback conversion: ${amount} ${fromCurrency} × ${fallbackRate} = ${convertedAmount} ${toCurrency}`);
      return convertedAmount;
    }
  }

  // Convert multiple amounts at once
  async convertAmounts(
    amounts: Array<{ amount: number; currency: string }>,
    toCurrency: string
  ): Promise<Array<{ amount: number; currency: string; convertedAmount: number }>> {
    console.log(`🔄 [CURRENCY] Converting ${amounts.length} amounts to ${toCurrency}`);
    
    const conversions = await Promise.all(
      amounts.map(async ({ amount, currency }) => {
        const convertedAmount = await this.convertAmount(amount, currency, toCurrency);
        console.log(`✅ [CURRENCY] Converted: ${amount} ${currency} → ${convertedAmount} ${toCurrency}`);
        return {
          amount,
          currency,
          convertedAmount
        };
      })
    );
    
    console.log(`✅ [CURRENCY] Completed conversion of ${amounts.length} amounts`);
    return conversions;
  }

  getSupportedCurrencies(): string[] {
    return [
      'USD', 'EUR', 'GBP', 'JPY', 'MDL', 'RUB', 'CHF', 'CAD', 'AUD', 'NZD',
      'CNY', 'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'ZAR', 'TRY', 'PLN',
      'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'SEK', 'NOK', 'DKK', 'ISK', 'THB',
      'PHP', 'IDR', 'MYR', 'VND', 'ILS', 'AED', 'SAR', 'QAR', 'KWD', 'BHD',
      'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'DZD', 'LYD', 'ETB', 'KES',
      'UGX', 'TZS', 'ZMW', 'BWP', 'NAD', 'SZL', 'LSL', 'MUR', 'SCR', 'MVR',
      'PKR', 'BDT', 'LKR', 'NPR', 'AFN', 'IRR', 'IQD', 'SYP', 'YER', 'JMD',
      'TTD', 'BBD', 'BZD', 'GYD', 'SRD', 'XCD', 'AWG', 'ANG', 'CUP', 'DOP',
      'HTG', 'PAB', 'CRC', 'NIO', 'HNL', 'GTQ', 'BMD', 'KYD', 'BSD', 'BHD',
      'QAR', 'AED', 'SAR', 'OMR', 'KWD', 'BHD', 'JOD', 'LBP', 'EGP', 'MAD',
      'TND', 'DZD', 'LYD', 'ETB', 'KES', 'UGX', 'TZS', 'ZMW', 'BWP', 'NAD',
      'SZL', 'LSL', 'MUR', 'SCR', 'MVR', 'PKR', 'BDT', 'LKR', 'NPR', 'AFN',
      'IRR', 'IQD', 'SYP', 'YER', 'JMD', 'TTD', 'BBD', 'BZD', 'GYD', 'SRD',
      'XCD', 'AWG', 'ANG', 'CUP', 'DOP', 'HTG', 'PAB', 'CRC', 'NIO', 'HNL',
      'GTQ', 'BMD', 'KYD', 'BSD', 'BHD', 'QAR', 'AED', 'SAR', 'OMR', 'KWD'
    ];
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', MDL: 'L', RUB: '₽',
      CHF: 'CHF', CAD: 'C$', AUD: 'A$', NZD: 'NZ$', CNY: '¥',
      HKD: 'HK$', SGD: 'S$', KRW: '₩', INR: '₹', BRL: 'R$',
      MXN: '$', ZAR: 'R', TRY: '₺', PLN: 'zł', CZK: 'Kč',
      HUF: 'Ft', RON: 'lei', BGN: 'лв', HRK: 'kn', SEK: 'kr',
      NOK: 'kr', DKK: 'kr', ISK: 'kr', THB: '฿', PHP: '₱',
      IDR: 'Rp', MYR: 'RM', VND: '₫', ILS: '₪', AED: 'د.إ',
      SAR: '﷼', QAR: '﷼', KWD: 'د.ك', BHD: 'د.ب', OMR: '﷼',
      JOD: 'د.ا', LBP: 'ل.ل', EGP: '£', MAD: 'د.م.', TND: 'د.ت',
      DZD: 'د.ج', LYD: 'ل.د', ETB: 'Br', KES: 'KSh', UGX: 'USh',
      TZS: 'TSh', ZMW: 'ZK', BWP: 'P', NAD: 'N$', SZL: 'L',
      LSL: 'L', MUR: '₨', SCR: '₨', MVR: 'ރ', PKR: '₨',
      BDT: '৳', LKR: '₨', NPR: '₨', AFN: '؋', IRR: '﷼',
      IQD: 'د.ع', SYP: '£', YER: '﷼', JMD: 'J$', TTD: 'TT$',
      BBD: 'Bds$', BZD: 'BZ$', GYD: 'G$', SRD: 'SRD', XCD: 'EC$',
      AWG: 'ƒ', ANG: 'ƒ', CUP: '$', DOP: 'RD$', HTG: 'G',
      PAB: 'B/.', CRC: '₡', NIO: 'C$', HNL: 'L', GTQ: 'Q',
      BMD: 'BD$', KYD: 'CI$', BSD: 'B$'
    };
    return symbols[currency] || currency;
  }
}

export const currencyService = new CurrencyService();
