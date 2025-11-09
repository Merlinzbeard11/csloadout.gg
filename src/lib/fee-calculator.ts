/**
 * Fee Calculator Service
 *
 * BDD Reference: features/05-fee-transparency.feature
 * Tests: __tests__/api-fee-calculator.test.ts (11/11 passing)
 *
 * Provides fee calculation logic for:
 * - Buyer total cost (base price + buyer fees + hidden markup)
 * - Seller proceeds (sale price - seller fees)
 *
 * Critical Gotchas Addressed:
 * - JavaScript decimal precision (Math.round for 2 decimal places)
 * - Currency calculations (percentage precision)
 * - PostgreSQL DECIMAL to number conversion (.toNumber())
 */

import { prisma } from '@/lib/prisma';
import type {
  FeeBreakdown,
  SellerProceeds,
  FeeCalculationInput,
  SellerProceedsInput,
} from '@/types/fees';

export class FeeCalculatorService {
  /**
   * Calculate buyer total cost with fees
   * Addresses Gotcha: JavaScript decimal precision (use Math.round for 2 decimal places)
   */
  async calculateBuyerFees(input: FeeCalculationInput): Promise<FeeBreakdown> {
    const { basePrice, platform } = input;

    // Handle zero-price items (BDD: features/05-fee-transparency.feature:287-292)
    if (basePrice === 0) {
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

    // Get platform fee configuration from database
    const config = await prisma.platformFeeConfig.findUnique({
      where: { platform },
    });

    // Handle missing configuration (BDD: features/05-fee-transparency.feature:279-285)
    if (!config) {
      return {
        basePrice,
        platformFee: 0,
        hiddenMarkup: 0,
        totalCost: basePrice,
        effectiveFeePercent: '0%',
        feeNote: 'Fee information not available - Contact platform for fee details',
        hasWarning: true,
        warningMessage: 'Fee information not available',
      };
    }

    // Convert Prisma Decimal to number (Gotcha: Prisma returns Decimal objects)
    const buyerFeePercent = config.buyer_fee_percent.toNumber();
    const sellerFeePercent = config.seller_fee_percent.toNumber();
    const hiddenMarkupPercent = config.hidden_markup_percent.toNumber();

    // Calculate buyer fee (rounded to 2 decimal places)
    const platformFeeRaw = (basePrice * buyerFeePercent) / 100;
    const platformFee = Math.round(platformFeeRaw * 100) / 100;

    // Calculate hidden markup (CS.MONEY bot markup)
    const hiddenMarkupRaw = (basePrice * hiddenMarkupPercent) / 100;
    const hiddenMarkup = Math.round(hiddenMarkupRaw * 100) / 100;

    // Total cost
    const totalCost = Math.round((basePrice + platformFee + hiddenMarkup) * 100) / 100;

    // Calculate effective fee percentage
    const totalFeePercent = basePrice > 0 ? ((platformFee + hiddenMarkup) / basePrice) * 100 : 0;
    const effectiveFeePercent = totalFeePercent === 0 ? '0%' : totalFeePercent.toFixed(2) + '%';

    // Build fee note
    let feeNote = config.fee_notes;

    // Check if fee is under $0.01 (BDD: features/05-fee-transparency.feature:161-167)
    if (platformFee === 0 && buyerFeePercent > 0) {
      feeNote += ' - Fee less than $0.01';
    } else if (buyerFeePercent === 0 && sellerFeePercent > 0 && hiddenMarkupPercent === 0) {
      // Seller pays, not buyer (only if no hidden markup)
      feeNote = `${sellerFeePercent}% sale fee (seller pays, not buyer)`;
    }

    // Check for warnings (hidden markup)
    const hasWarning = hiddenMarkupPercent > 0;
    const warningMessage = hasWarning
      ? `⚠️ Includes ~${hiddenMarkupPercent}% estimated bot markup`
      : undefined;

    return {
      basePrice,
      platformFee,
      hiddenMarkup,
      totalCost,
      effectiveFeePercent,
      feeNote,
      hasWarning,
      warningMessage,
    };
  }

  /**
   * Calculate seller proceeds after fees
   * Addresses Gotcha: Percentage calculation precision
   */
  async calculateSellerProceeds(input: SellerProceedsInput): Promise<SellerProceeds> {
    const { salePrice, platform } = input;

    // Get platform fee configuration from database
    const config = await prisma.platformFeeConfig.findUnique({
      where: { platform },
    });

    if (!config) {
      return {
        salePrice,
        platformFee: 0,
        sellerReceives: salePrice,
        effectiveFeePercent: '0%',
      };
    }

    // Convert Prisma Decimal to number
    const sellerFeePercent = config.seller_fee_percent.toNumber();

    // Calculate seller fee (negative value, rounded to 2 decimal places)
    const platformFeeRaw = (salePrice * sellerFeePercent) / 100;
    const platformFee = -Math.round(platformFeeRaw * 100) / 100;

    // Calculate seller proceeds
    const sellerReceives = Math.round((salePrice + platformFee) * 100) / 100;

    // Format effective fee percentage
    const effectiveFeePercent = sellerFeePercent.toFixed(2) + '%';

    // Add badge for low fees (≤2%)
    const badgeText = sellerFeePercent <= 2.0 ? `Low Fees: ${sellerFeePercent}%` : undefined;

    return {
      salePrice,
      platformFee,
      sellerReceives,
      effectiveFeePercent,
      badgeText,
    };
  }
}

// Export singleton instance
export const feeCalculator = new FeeCalculatorService();
