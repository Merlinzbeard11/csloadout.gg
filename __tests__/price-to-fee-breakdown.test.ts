/**
 * TDD Tests for Price Data to FeeBreakdown Transformation
 * Feature 05: Fee Transparency Integration with Price Aggregation
 * BDD Reference: features/05-fee-transparency.feature:111-139
 *
 * Tests transformation utility that converts PriceData (Feature 04)
 * to FeeBreakdown format (Feature 05) for component integration.
 */

import { describe, it, expect } from '@jest/globals';
import { transformPriceDataToFeeBreakdown } from '../src/lib/price-to-fee-breakdown';
import type { PriceData } from '../src/types/price';
import type { FeeBreakdown } from '../src/types/fees';

describe('transformPriceDataToFeeBreakdown', () => {
  it('should transform CSFloat price data (0% buyer fees)', () => {
    const priceData: PriceData = {
      platform: 'csfloat',
      price: 5.00,
      currency: 'USD',
      fees: { seller: 2.0, buyer: 0.0, total: 2.0 },
      totalCost: 5.00,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(5.00);
    expect(result.platformFee).toBe(0.00); // Buyer fee only
    expect(result.hiddenMarkup).toBe(0.00);
    expect(result.totalCost).toBe(5.00);
    expect(result.effectiveFeePercent).toBe('0%');
    expect(result.feeNote).toContain('seller pays');
    expect(result.hasWarning).toBe(false);
  });

  it('should transform CS.MONEY price data (hidden markup)', () => {
    const priceData: PriceData = {
      platform: 'csmoney',
      price: 500.00,
      currency: 'USD',
      fees: { seller: 7.0, buyer: 20.0, total: 27.0 }, // 20% hidden markup
      totalCost: 600.00,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(500.00);
    expect(result.platformFee).toBe(0.00); // Platform fee is seller-side
    expect(result.hiddenMarkup).toBe(100.00); // 20% of 500
    expect(result.totalCost).toBe(600.00);
    expect(result.effectiveFeePercent).toBe('20.00%');
    expect(result.hasWarning).toBe(true);
    expect(result.warningMessage).toContain('bot markup');
  });

  it('should transform Steam price data (15% seller fees)', () => {
    const priceData: PriceData = {
      platform: 'steam',
      price: 10.00,
      currency: 'USD',
      fees: { seller: 15.0, buyer: 0.0, total: 15.0 },
      totalCost: 10.00,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(10.00);
    expect(result.platformFee).toBe(0.00); // Buyer sees no fee
    expect(result.hiddenMarkup).toBe(0.00);
    expect(result.totalCost).toBe(10.00);
    expect(result.effectiveFeePercent).toBe('0%');
    expect(result.feeNote).toContain('seller pays');
    expect(result.hasWarning).toBe(false);
  });

  it('should handle buyer fees (hypothetical platform)', () => {
    const priceData: PriceData = {
      platform: 'steam', // Using steam as placeholder
      price: 10.00,
      currency: 'USD',
      fees: { seller: 0.0, buyer: 5.0, total: 5.0 },
      totalCost: 10.50,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(10.00);
    expect(result.platformFee).toBe(0.50); // 5% of 10
    expect(result.hiddenMarkup).toBe(0.00);
    expect(result.totalCost).toBe(10.50);
    expect(result.effectiveFeePercent).toBe('5.00%');
    expect(result.hasWarning).toBe(false);
  });

  it('should handle decimal precision correctly', () => {
    const priceData: PriceData = {
      platform: 'csfloat',
      price: 1.37,
      currency: 'USD',
      fees: { seller: 0.0, buyer: 2.5, total: 2.5 },
      totalCost: 1.40,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(1.37);
    expect(result.platformFee).toBe(0.03); // 2.5% of 1.37 = 0.03425 → 0.03
    expect(result.totalCost).toBe(1.40);
    expect(result.effectiveFeePercent).toBe('2.19%'); // 0.03/1.37 * 100
  });

  it('should handle fees under $0.01', () => {
    const priceData: PriceData = {
      platform: 'csfloat',
      price: 0.15,
      currency: 'USD',
      fees: { seller: 0.0, buyer: 2.0, total: 2.0 },
      totalCost: 0.15,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(0.15);
    expect(result.platformFee).toBe(0.00); // 2% of 0.15 = 0.003 → rounds to 0.00
    expect(result.totalCost).toBe(0.15);
    expect(result.feeNote).toContain('Fee less than $0.01');
  });

  it('should handle zero-price items', () => {
    const priceData: PriceData = {
      platform: 'csfloat',
      price: 0.00,
      currency: 'USD',
      fees: { seller: 2.0, buyer: 0.0, total: 2.0 },
      totalCost: 0.00,
      lastUpdated: new Date(),
    };

    const result: FeeBreakdown = transformPriceDataToFeeBreakdown(priceData);

    expect(result.basePrice).toBe(0.00);
    expect(result.platformFee).toBe(0.00);
    expect(result.hiddenMarkup).toBe(0.00);
    expect(result.totalCost).toBe(0.00);
    expect(result.effectiveFeePercent).toBe('0%');
    expect(result.feeNote).toBe('Free item - no fees');
    expect(result.hasWarning).toBe(false);
  });
});
