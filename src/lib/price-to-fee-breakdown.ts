/**
 * Price Data to FeeBreakdown Transformation Utility
 *
 * Feature 05: Fee Transparency Integration with Price Aggregation (Feature 04)
 * BDD Reference: features/05-fee-transparency.feature:111-139
 * Tests: __tests__/price-to-fee-breakdown.test.ts (7 tests)
 *
 * Transforms PriceData (from marketplace aggregation) to FeeBreakdown format
 * for rendering with the FeeBreakdown component.
 *
 * Critical Gotchas Addressed:
 * - Buyer vs seller fees (only buyer fees shown in breakdown)
 * - Hidden markup detection (CS.MONEY bot markup)
 * - Decimal precision (Math.round for 2 decimal places)
 * - Edge case: fees under $0.01
 */

import type { PriceData, Platform } from '@/types/price';
import type { FeeBreakdown } from '@/types/fees';

/**
 * Platform fee configuration for detailed fee notes
 * Matches data from prisma/migrations/20251109_add_platform_fee_config/migration.sql
 */
const PLATFORM_FEE_NOTES: Record<Platform, string> = {
  steam: '10% Steam fee + 5% game-specific fee',
  csfloat: '2% sale fee, No buyer fees',
  csmoney: '7% platform fee + ~20% bot markup (estimated)',
  tradeit: '2-60% fee varies by item and trade method',
  buff163: '2.5% sale fee',
  dmarket: '2-10% fee varies by item liquidity',
};

/**
 * Detect if platform has hidden markup (e.g., CS.MONEY bot pricing)
 */
function hasHiddenMarkup(platform: Platform): boolean {
  return platform === 'csmoney';
}

/**
 * Transform PriceData to FeeBreakdown format
 *
 * Logic:
 * - basePrice = priceData.price
 * - platformFee = buyer fee only (what user actually pays)
 * - hiddenMarkup = detected bot markup (CS.MONEY)
 * - totalCost = priceData.totalCost
 * - Seller fees mentioned in feeNote but not shown as platformFee
 */
export function transformPriceDataToFeeBreakdown(priceData: PriceData): FeeBreakdown {
  const { price, fees, totalCost, platform } = priceData;

  // Handle zero-price items
  if (price === 0) {
    return {
      basePrice: 0,
      platformFee: 0,
      hiddenMarkup: 0,
      totalCost: 0,
      effectiveFeePercent: '0%',
      feeNote: 'Free item - no fees',
      hasWarning: false,
    };
  }

  // Calculate buyer fee (what user actually pays)
  const buyerFeePercent = fees.buyer;
  let platformFee = 0;
  let hiddenMarkup = 0;

  if (hasHiddenMarkup(platform)) {
    // CS.MONEY: All buyer fee is hidden markup
    const hiddenMarkupRaw = (price * buyerFeePercent) / 100;
    hiddenMarkup = Math.round(hiddenMarkupRaw * 100) / 100;
    platformFee = 0; // No separate platform fee
  } else {
    // Normal platform: buyer fee is platform fee
    const platformFeeRaw = (price * buyerFeePercent) / 100;
    platformFee = Math.round(platformFeeRaw * 100) / 100;
    hiddenMarkup = 0; // No hidden markup
  }

  // Calculate effective fee percentage (what buyer actually pays)
  const totalBuyerFee = platformFee + hiddenMarkup;
  const effectiveFeePercent = price > 0 ? (totalBuyerFee / price) * 100 : 0;
  const effectiveFeePercentStr = effectiveFeePercent === 0 ? '0%' : effectiveFeePercent.toFixed(2) + '%';

  // Build fee note
  let feeNote = PLATFORM_FEE_NOTES[platform] || 'Platform fees apply';

  // Check if fee is under $0.01
  if (platformFee === 0 && buyerFeePercent > 0) {
    feeNote += ' - Fee less than $0.01';
  } else if (buyerFeePercent === 0 && fees.seller > 0) {
    // Seller pays, not buyer
    feeNote = `${fees.seller}% sale fee (seller pays, not buyer)`;
  }

  // Warning for hidden markup
  const hasWarning = hasHiddenMarkup(platform);
  const warningMessage = hasWarning
    ? `⚠️ Includes ~${buyerFeePercent}% estimated bot markup`
    : undefined;

  return {
    basePrice: price,
    platformFee,
    hiddenMarkup,
    totalCost,
    effectiveFeePercent: effectiveFeePercentStr,
    feeNote,
    hasWarning,
    warningMessage,
  };
}
