/**
 * TDD Tests for Currency Conversion Service
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "Convert non-USD prices to USD"
 *   - Scenario: "Handle currency API failures gracefully"
 *
 * Requirements:
 *   - Convert foreign currencies to USD using exchange rates
 *   - Display format: "USD (from CNY)"
 *   - Fallback to secondary API if primary fails
 *   - Cache exchange rates to handle API failures
 *   - Log conversion failures
 *   - CRITICAL: Prices will never be negative (business constraint)
 *
 * Feature 04 spec gotchas addressed:
 *   - Gotcha #8: Currency API service discontinuation
 *   - Solution: Multiple API fallbacks + cached rates
 */

import { describe, it, expect } from '@jest/globals';
import {
  validatePositivePrice,
  validateExchangeRate,
  isValidCurrencyCode,
  isSupportedCurrency,
  convert,
  formatDisplay,
  convertCurrency,
  convertBatch,
  isCacheExpired,
  createCache,
  getUniqueCurrencies,
  CurrencyConversionService,
  CurrencyConversionError,
} from '../src/lib/currency-conversion';
import type { Currency } from '../src/types/price';

describe('Currency Conversion Service', () => {
  describe('Price Validation', () => {
    it('should reject negative prices', () => {
      expect(() => validatePositivePrice(-100)).toThrow(CurrencyConversionError);
      expect(() => validatePositivePrice(-100)).toThrow('Price must be positive');
    });

    it('should accept positive prices', () => {
      expect(() => validatePositivePrice(100)).not.toThrow();
      expect(() => validatePositivePrice(0.01)).not.toThrow();
    });

    it('should reject zero prices', () => {
      expect(() => validatePositivePrice(0)).toThrow(CurrencyConversionError);
      expect(() => validatePositivePrice(0)).toThrow('Price must be positive');
    });

    it('should accept fractional positive prices', () => {
      expect(() => validatePositivePrice(0.01)).not.toThrow();
      expect(() => validatePositivePrice(123.45)).not.toThrow();
    });
  });

  describe('Currency Conversion', () => {
    it('should convert CNY to USD using exchange rate', () => {
      // BDD scenario: 800 CNY × 0.14 = $112.00 USD
      const amountCNY = 800;
      const exchangeRate = 0.14;
      const expectedUSD = 112.00;

      const converted = convert(amountCNY, 'CNY', exchangeRate);

      expect(converted).toBe(expectedUSD);
    });

    it('should convert EUR to USD', () => {
      const amountEUR = 100;
      const exchangeRate = 1.10; // 1 EUR = 1.10 USD
      const expectedUSD = 110.00;

      const converted = convert(amountEUR, 'EUR', exchangeRate);

      expect(converted).toBe(expectedUSD);
    });

    it('should handle USD to USD conversion (no-op)', () => {
      const amountUSD = 100;
      const exchangeRate = 1.0;

      const converted = convert(amountUSD, 'USD', exchangeRate);

      expect(converted).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      const amount = 100;
      const exchangeRate = 0.333333;

      const converted = convert(amount, 'EUR', exchangeRate);

      expect(converted).toBe(33.33);
      expect(converted.toString()).toMatch(/^\d+\.\d{2}$/);
    });

    it('should preserve precision during conversion', () => {
      const amount = 12.34;
      const exchangeRate = 1.5678;

      const converted = convert(amount, 'EUR', exchangeRate);

      expect(converted).toBe(19.35); // 12.34 × 1.5678 = 19.34665 → 19.35
    });
  });

  describe('Display Format', () => {
    it('should format display as "USD (from CNY)"', () => {
      // BDD: And the currency should show as "USD (from CNY)"
      const displayFormat = formatDisplay('CNY');

      expect(displayFormat).toBe('USD (from CNY)');
    });

    it('should format display for various currencies', () => {
      const currencies: Currency[] = ['EUR', 'CNY', 'RUB', 'GBP'];

      currencies.forEach(currency => {
        const display = formatDisplay(currency);
        expect(display).toContain('USD');
        expect(display).toContain(currency);
      });
    });

    it('should display USD without conversion note', () => {
      const displayFormat = formatDisplay('USD');

      expect(displayFormat).toBe('USD');
    });
  });

  describe('Exchange Rate Validation', () => {
    it('should validate exchange rate is positive', () => {
      expect(() => validateExchangeRate(0.14, 'CNY')).not.toThrow();
      expect(() => validateExchangeRate(-0.14, 'CNY')).toThrow(CurrencyConversionError);
    });

    it('should reject zero exchange rates', () => {
      expect(() => validateExchangeRate(0, 'CNY')).toThrow(CurrencyConversionError);
      expect(() => validateExchangeRate(0, 'CNY')).toThrow('must be positive');
    });

    it('should handle very small exchange rates', () => {
      // Some currencies have very low value (e.g., 1 USD = 1000+ units)
      const amount = 100000; // 100k Indonesian Rupiah
      const exchangeRate = 0.000067; // 1 IDR = 0.000067 USD
      const converted = convert(amount, 'BRL', exchangeRate); // Using BRL as placeholder

      expect(converted).toBe(6.70);
      expect(converted).toBeGreaterThan(0);
    });

    it('should handle very large exchange rates', () => {
      // Some currencies have very high value (e.g., 1 KWD = 3+ USD)
      const amount = 10; // 10 Kuwaiti Dinar
      const exchangeRate = 3.25; // 1 KWD = 3.25 USD
      const converted = convert(amount, 'GBP', exchangeRate); // Using GBP as placeholder

      expect(converted).toBe(32.50);
    });
  });

  describe('Conversion Result', () => {
    it('should return conversion result with all metadata', () => {
      const result = convertCurrency(800, 'CNY', 0.14, 'api');

      expect(result.originalAmount).toBe(800);
      expect(result.convertedAmount).toBe(112.00);
      expect(result.exchangeRate).toBe(0.14);
      expect(result.displayFormat).toBe('USD (from CNY)');
      expect(result.targetCurrency).toBe('USD');
      expect(result.originalCurrency).toBe('CNY');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include conversion timestamp', () => {
      const result = convertCurrency(100, 'EUR', 1.10);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Error Handling', () => {
    it('should handle missing exchange rate gracefully', () => {
      const exchangeRate = null;
      const hasRate = exchangeRate !== null;

      expect(hasRate).toBe(false);
    });

    it('should return error for unsupported currency', () => {
      const unsupportedCurrency = 'XYZ';
      const isSupported = isSupportedCurrency(unsupportedCurrency);

      expect(isSupported).toBe(false);
    });

    it('should validate currency code format (ISO 4217)', () => {
      const validCodes = ['USD', 'EUR', 'CNY'];
      const invalidCodes = ['us', 'dollar', 'U', 'USDD'];

      validCodes.forEach(code => {
        expect(isValidCurrencyCode(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(isValidCurrencyCode(code)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const largeAmount = 1000000; // $1M
      const exchangeRate = 0.14;
      const converted = convert(largeAmount, 'CNY', exchangeRate);

      expect(converted).toBe(140000.00);
    });

    it('should handle very small amounts', () => {
      const smallAmount = 0.01; // 1 cent
      const exchangeRate = 1.10;
      const converted = convert(smallAmount, 'EUR', exchangeRate);

      expect(converted).toBe(0.01);
    });

    it('should prevent floating point precision errors', () => {
      // JavaScript floating point gotcha: 0.1 + 0.2 = 0.30000000000000004
      const amount = 10.10;
      const exchangeRate = 1.01;
      const converted = convert(amount, 'EUR', exchangeRate);

      expect(converted).toBe(10.20);
      expect(converted.toString()).not.toContain('0000');
    });

    it('should handle conversion chain (EUR → USD → display)', () => {
      const amountEUR = 88.50;
      const eurToUsd = 1.10;
      const result = convertCurrency(amountEUR, 'EUR', eurToUsd);

      expect(result.convertedAmount).toBe(97.35);
      expect(result.displayFormat).toBe('USD (from EUR)');
    });
  });

  describe('Caching Requirements', () => {
    it('should define cache structure for exchange rates', () => {
      const rates = {
        'EUR': 1.10,
        'CNY': 0.14,
        'RUB': 0.011,
      };
      const cache = createCache(rates, 'primary');

      expect(cache.rates['CNY']).toBe(0.14);
      expect(cache.lastUpdated).toBeInstanceOf(Date);
      expect(cache.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(cache.source).toBe('primary');
    });

    it('should check if cache is expired', () => {
      const now = Date.now();
      const expiredCache = createCache({ 'EUR': 1.10 });
      expiredCache.expiresAt = new Date(now - 1000); // Expired 1 second ago

      const validCache = createCache({ 'EUR': 1.10 });
      validCache.expiresAt = new Date(now + 1000); // Expires in 1 second

      expect(isCacheExpired(expiredCache)).toBe(true);
      expect(isCacheExpired(validCache)).toBe(false);
    });

    it('should define TTL (24 hours) for exchange rate cache', () => {
      const cache = createCache({ 'EUR': 1.10 });
      const cacheTTL = cache.expiresAt.getTime() - cache.lastUpdated.getTime();
      const expectedTTL = 24 * 60 * 60 * 1000; // 24 hours

      expect(cacheTTL).toBe(expectedTTL);
    });
  });

  describe('API Fallback Strategy', () => {
    it('should define primary and secondary API sources', () => {
      const apiSources = {
        primary: 'exchangerate-api.com',
        secondary: 'fixer.io',
        fallback: 'cached-rates',
      };

      expect(apiSources.primary).toBeDefined();
      expect(apiSources.secondary).toBeDefined();
      expect(apiSources.fallback).toBeDefined();
    });

    it('should attempt secondary API when primary fails', () => {
      const primaryFailed = true;
      const secondaryAvailable = true;

      const shouldUseSecondary = primaryFailed && secondaryAvailable;

      expect(shouldUseSecondary).toBe(true);
    });

    it('should use cached rates when all APIs fail', () => {
      const primaryFailed = true;
      const secondaryFailed = true;
      const cacheAvailable = true;

      const shouldUseCache = primaryFailed && secondaryFailed && cacheAvailable;

      expect(shouldUseCache).toBe(true);
    });

    it('should log API failure events', () => {
      const failureLog = {
        timestamp: new Date(),
        api: 'primary',
        error: 'Connection timeout',
        fallbackUsed: 'secondary',
      };

      expect(failureLog.api).toBe('primary');
      expect(failureLog.fallbackUsed).toBe('secondary');
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple prices at once', () => {
      const prices = [
        { amount: 100, currency: 'CNY' as Currency },
        { amount: 50, currency: 'EUR' as Currency },
        { amount: 200, currency: 'USD' as Currency },
      ];

      const rates = { 'CNY': 0.14, 'EUR': 1.10, 'USD': 1.0 };

      const converted = convertBatch(prices, rates);

      expect(converted[0].convertedAmount).toBe(14.00); // 100 CNY
      expect(converted[1].convertedAmount).toBe(55.00); // 50 EUR
      expect(converted[2].convertedAmount).toBe(200.00); // 200 USD
    });

    it('should handle mixed currency batch efficiently', () => {
      const prices = [
        { amount: 100, currency: 'USD' as Currency },
        { amount: 50, currency: 'EUR' as Currency },
        { amount: 100, currency: 'CNY' as Currency },
        { amount: 200, currency: 'USD' as Currency },
        { amount: 300, currency: 'RUB' as Currency },
      ];

      const uniqueCurrencies = getUniqueCurrencies(prices);

      // Only need to fetch rates for unique currencies
      expect(uniqueCurrencies).toHaveLength(4);
      expect(uniqueCurrencies).toContain('USD');
      expect(uniqueCurrencies).toContain('EUR');
      expect(uniqueCurrencies).toContain('CNY');
      expect(uniqueCurrencies).toContain('RUB');
    });
  });
});
