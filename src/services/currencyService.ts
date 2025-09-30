import axios from 'axios';

export interface ExchangeRates {
  [currency: string]: number;
}

export interface CurrencyResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: ExchangeRates;
}

class CurrencyService {
  private cache: { [key: string]: { data: ExchangeRates; timestamp: number } } = {};
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private apiFailureCount = 0;
  private readonly MAX_FAILURES = 3;
  private lastFailureTime = 0;
  private readonly FAILURE_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    const cacheKey = baseCurrency;
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp) < this.CACHE_DURATION) {
      return this.cache[cacheKey].data;
    }

    // Circuit breaker: if API has failed too many times recently, use fallback
    if (this.apiFailureCount >= this.MAX_FAILURES && 
        (now - this.lastFailureTime) < this.FAILURE_COOLDOWN) {
      console.warn('API circuit breaker active, using fallback rates');
      return this.getFallbackRates(baseCurrency);
    }

    try {
      // Using CurrencyAPI.io with your API key
      const response = await axios.get(
        `https://api.currencyapi.com/v3/latest?apikey=cur_live_FW8vQMGv9ZVUe3NiADSbCbEpx0S2hPDrVJd6Mkac&currencies=USD,EUR,GBP,JPY,MDL&base_currency=${baseCurrency}`,
        {
          timeout: 1500,
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (response.data && response.data.data) {
        // Reset failure count on success
        this.apiFailureCount = 0;
        
        // Convert CurrencyAPI format to our format
        const rates: ExchangeRates = {};
        Object.entries(response.data.data).forEach(([currency, rateData]: [string, any]) => {
          rates[currency] = rateData.value;
        });
        
        // Cache the data
        this.cache[cacheKey] = {
          data: rates,
          timestamp: now
        };

        return rates;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Increment failure count and record failure time
      this.apiFailureCount++;
      this.lastFailureTime = now;
      
      console.warn(`API failure ${this.apiFailureCount}/${this.MAX_FAILURES}, using fallback rates`);
      
      // Cache fallback rates to avoid repeated API calls
      const fallbackRates = this.getFallbackRates(baseCurrency);
      this.cache[cacheKey] = {
        data: fallbackRates,
        timestamp: now
      };
      
      return fallbackRates;
    }
  }

  private getFallbackRates(baseCurrency: string): ExchangeRates {
    // Fallback rates (approximate, for when API is unavailable)
    const fallbackRates: { [key: string]: ExchangeRates } = {
      USD: {
        USD: 1,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110,
        MDL: 18.5
      },
      EUR: {
        USD: 1.18,
        EUR: 1,
        GBP: 0.86,
        JPY: 129,
        MDL: 21.8
      },
      GBP: {
        USD: 1.37,
        EUR: 1.16,
        GBP: 1,
        JPY: 150,
        MDL: 25.3
      },
      JPY: {
        USD: 0.0091,
        EUR: 0.0077,
        GBP: 0.0067,
        JPY: 1,
        MDL: 0.17
      },
      MDL: {
        USD: 0.054,
        EUR: 0.046,
        GBP: 0.04,
        JPY: 5.9,
        MDL: 1
      }
    };

    return fallbackRates[baseCurrency] || { [baseCurrency]: 1 };
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getExchangeRates(fromCurrency);
    const rate = rates[toCurrency];

    if (!rate) {
      console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      return amount; // Return original amount if conversion fails
    }

    return amount * rate;
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'MDL'];
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      MDL: 'L'
    };
    return symbols[currency] || currency;
  }
}

export const currencyService = new CurrencyService();
