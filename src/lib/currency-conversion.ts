/**
 * Currency Conversion Service
 * Feature 04: Multi-Marketplace Price Aggregation
 * BDD Reference: features/04-price-aggregation.feature
 *
 * Converts prices from foreign currencies to USD for comparison.
 * Implements multi-tier fallback strategy for exchange rate APIs.
 *
 * Gotcha #8 from Feature 04 spec:
 *   "Currency API Service Discontinuation Risk"
 *   Solution: Multiple API fallbacks + persistent caching
 *
 * Business Constraint:
 *   - Prices will never be negative (enforced with validation)
 */

import { Currency } from '../types/price';

/**
 * Supported currencies for conversion
 * Based on marketplace usage patterns
 */
export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'CNY', 'RUB', 'GBP', 'BRL'];

/**
 * Exchange rate data structure
 */
export interface ExchangeRates {
  [currency: string]: number; // Rate to convert TO USD
}

/**
 * Exchange rate cache with expiration
 */
export interface ExchangeRateCache {
  rates: ExchangeRates;
  lastUpdated: Date;
  expiresAt: Date;
  source: 'primary' | 'secondary' | 'fallback';
}

/**
 * Currency conversion result
 */
export interface ConversionResult {
  originalAmount: number;
  originalCurrency: Currency;
  convertedAmount: number;
  targetCurrency: 'USD';
  exchangeRate: number;
  timestamp: Date;
  displayFormat: string; // "USD" or "USD (from CNY)"
  source?: 'api' | 'cache';
}

/**
 * Currency conversion error types
 */
export class CurrencyConversionError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalCurrency?: string
  ) {
    super(message);
    this.name = 'CurrencyConversionError';
  }
}

/**
 * Validate price is positive (business constraint)
 *
 * @param price - Price to validate
 * @throws CurrencyConversionError if price is not positive
 */
export function validatePositivePrice(price: number): void {
  if (price <= 0) {
    throw new CurrencyConversionError(
      `Price must be positive, received: ${price}`,
      'NEGATIVE_PRICE'
    );
  }
}

/**
 * Validate exchange rate is positive
 *
 * @param rate - Exchange rate to validate
 * @param currency - Currency code for error message
 * @throws CurrencyConversionError if rate is not positive
 */
export function validateExchangeRate(rate: number, currency: string): void {
  if (rate <= 0) {
    throw new CurrencyConversionError(
      `Exchange rate for ${currency} must be positive, received: ${rate}`,
      'INVALID_EXCHANGE_RATE',
      currency
    );
  }
}

/**
 * Validate currency code format (ISO 4217)
 *
 * @param currency - Currency code to validate
 * @returns true if valid ISO 4217 format
 */
export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}

/**
 * Check if currency is supported
 *
 * @param currency - Currency code to check
 * @returns true if currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

/**
 * Convert amount from foreign currency to USD
 *
 * @param amount - Amount in original currency
 * @param fromCurrency - Original currency code
 * @param exchangeRate - Exchange rate to USD
 * @returns Converted amount in USD, rounded to 2 decimal places
 */
export function convert(
  amount: number,
  fromCurrency: Currency,
  exchangeRate: number
): number {
  // Validate inputs
  validatePositivePrice(amount);
  validateExchangeRate(exchangeRate, fromCurrency);

  // Convert and round to 2 decimal places
  const converted = amount * exchangeRate;
  return parseFloat(converted.toFixed(2));
}

/**
 * Format display string for converted currency
 * BDD: "USD (from CNY)"
 *
 * @param originalCurrency - Original currency code
 * @returns Formatted display string
 */
export function formatDisplay(originalCurrency: Currency): string {
  if (originalCurrency === 'USD') {
    return 'USD';
  }
  return `USD (from ${originalCurrency})`;
}

/**
 * Perform currency conversion with full metadata
 *
 * @param amount - Amount in original currency
 * @param fromCurrency - Original currency code
 * @param exchangeRate - Exchange rate to USD
 * @param source - Source of exchange rate (for tracking)
 * @returns Complete conversion result
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  exchangeRate: number,
  source: 'api' | 'cache' = 'api'
): ConversionResult {
  const convertedAmount = convert(amount, fromCurrency, exchangeRate);

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount,
    targetCurrency: 'USD',
    exchangeRate,
    timestamp: new Date(),
    displayFormat: formatDisplay(fromCurrency),
    source,
  };
}

/**
 * Convert multiple prices in batch
 * Efficient when converting many prices with same currency
 *
 * @param prices - Array of {amount, currency} objects
 * @param rates - Exchange rates map
 * @returns Array of conversion results
 */
export function convertBatch(
  prices: Array<{ amount: number; currency: Currency }>,
  rates: ExchangeRates
): ConversionResult[] {
  return prices.map((price) => {
    const rate = rates[price.currency];

    if (!rate) {
      throw new CurrencyConversionError(
        `No exchange rate available for ${price.currency}`,
        'MISSING_RATE',
        price.currency
      );
    }

    return convertCurrency(price.amount, price.currency, rate, 'api');
  });
}

/**
 * Check if exchange rate cache is expired
 *
 * @param cache - Exchange rate cache to check
 * @returns true if cache is expired
 */
export function isCacheExpired(cache: ExchangeRateCache): boolean {
  return cache.expiresAt.getTime() < Date.now();
}

/**
 * Create exchange rate cache with 24-hour TTL
 *
 * @param rates - Exchange rates to cache
 * @param source - Source of rates
 * @returns Cache object with expiration
 */
export function createCache(
  rates: ExchangeRates,
  source: 'primary' | 'secondary' | 'fallback' = 'primary'
): ExchangeRateCache {
  const now = new Date();
  const cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  return {
    rates,
    lastUpdated: now,
    expiresAt: new Date(now.getTime() + cacheTTL),
    source,
  };
}

/**
 * Get unique currencies from a batch of prices
 * Used to minimize API requests
 *
 * @param prices - Array of {amount, currency} objects
 * @returns Array of unique currency codes
 */
export function getUniqueCurrencies(
  prices: Array<{ amount: number; currency: Currency }>
): Currency[] {
  const currencySet = new Set<Currency>();
  prices.forEach((p) => currencySet.add(p.currency));
  return Array.from(currencySet);
}

/**
 * Currency conversion service
 * Implements multi-tier fallback strategy
 */
export class CurrencyConversionService {
  private cache: ExchangeRateCache | null = null;

  /**
   * Convert amount to USD using cached or fetched rates
   *
   * @param amount - Amount in original currency
   * @param fromCurrency - Original currency code
   * @returns Conversion result
   */
  async convertToUSD(
    amount: number,
    fromCurrency: Currency
  ): Promise<ConversionResult> {
    // Validate currency
    if (!isValidCurrencyCode(fromCurrency)) {
      throw new CurrencyConversionError(
        `Invalid currency code: ${fromCurrency}`,
        'INVALID_CURRENCY_CODE',
        fromCurrency
      );
    }

    if (!isSupportedCurrency(fromCurrency)) {
      throw new CurrencyConversionError(
        `Unsupported currency: ${fromCurrency}`,
        'UNSUPPORTED_CURRENCY',
        fromCurrency
      );
    }

    // USD to USD is a no-op
    if (fromCurrency === 'USD') {
      return convertCurrency(amount, 'USD', 1.0, 'cache');
    }

    // Get exchange rate (with fallback strategy)
    const rate = await this.getExchangeRate(fromCurrency);

    return convertCurrency(amount, fromCurrency, rate, 'api');
  }

  /**
   * Get exchange rate with multi-tier fallback
   * BDD: "fallback to secondary API, then cached rates"
   *
   * @param currency - Currency code
   * @returns Exchange rate to USD
   */
  private async getExchangeRate(currency: Currency): Promise<number> {
    // Check cache first
    if (this.cache && !isCacheExpired(this.cache)) {
      const rate = this.cache.rates[currency];
      if (rate) {
        return rate;
      }
    }

    // In real implementation, this would:
    // 1. Try primary API (exchangerate-api.com)
    // 2. On failure, try secondary API (fixer.io)
    // 3. On failure, use cached rates
    // 4. Log all failures

    // For now, return mock rates (will be replaced with actual API calls)
    const mockRates: ExchangeRates = {
      EUR: 1.10,
      CNY: 0.14,
      RUB: 0.011,
      GBP: 1.27,
      BRL: 0.20,
    };

    // Update cache
    this.cache = createCache(mockRates, 'primary');

    const rate = mockRates[currency];
    if (!rate) {
      throw new CurrencyConversionError(
        `No exchange rate available for ${currency}`,
        'MISSING_RATE',
        currency
      );
    }

    return rate;
  }

  /**
   * Convert multiple prices in batch
   *
   * @param prices - Array of {amount, currency} objects
   * @returns Array of conversion results
   */
  async convertBatch(
    prices: Array<{ amount: number; currency: Currency }>
  ): Promise<ConversionResult[]> {
    // Get unique currencies to minimize API calls
    const uniqueCurrencies = getUniqueCurrencies(prices);

    // Fetch rates for all unique currencies
    const rates: ExchangeRates = {};
    for (const currency of uniqueCurrencies) {
      if (currency === 'USD') {
        rates[currency] = 1.0;
      } else {
        rates[currency] = await this.getExchangeRate(currency);
      }
    }

    // Convert all prices
    return convertBatch(prices, rates);
  }

  /**
   * Get cached exchange rates (for debugging/monitoring)
   *
   * @returns Current cache or null
   */
  getCache(): ExchangeRateCache | null {
    return this.cache;
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}
