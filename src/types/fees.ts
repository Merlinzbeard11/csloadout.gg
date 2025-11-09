/**
 * Fee Transparency Type Definitions
 *
 * BDD Reference: features/05-fee-transparency.feature
 *
 * Critical Gotchas Addressed:
 * - JavaScript decimal precision (Gotcha: 0.1 + 0.2 !== 0.3)
 * - Currency calculations (Gotcha: Always use integer cents, convert to dollars for display)
 * - Percentage calculations (Gotcha: 3% of $1.37 = $0.03425 rounds to $0.03)
 * - PostgreSQL DECIMAL precision (Gotcha: Use DECIMAL(10,2) for money)
 */

/**
 * Platform fee configuration stored in database
 * Maps to platform_fee_config table in PostgreSQL
 */
export interface PlatformFeeConfig {
  platform: string;
  buyerFeePercent: number; // e.g., 3.0 for 3%
  sellerFeePercent: number; // e.g., 15.0 for 15%
  hiddenMarkupPercent: number; // e.g., 20.0 for CS.MONEY bot markup
  feeNotes: string;
  lastVerified?: Date;
  sourceUrl?: string;
}

/**
 * Fee breakdown for buyer total cost calculation
 * BDD Scenario: features/05-fee-transparency.feature:20-52
 */
export interface FeeBreakdown {
  basePrice: number; // Original listing price (e.g., 10.00)
  platformFee: number; // Buyer fee in dollars (e.g., 0.30 for 3%)
  hiddenMarkup: number; // Hidden bot markup in dollars (e.g., 200.00 for CS.MONEY)
  totalCost: number; // Total buyer pays (basePrice + platformFee + hiddenMarkup)
  effectiveFeePercent: string; // Formatted percentage (e.g., "3.00%")
  feeNote?: string; // Human-readable fee explanation
  hasWarning: boolean; // True if hidden fees or unusual fees
  warningMessage?: string; // Warning text (e.g., "⚠️ Includes ~20% estimated bot markup")
}

/**
 * Seller proceeds calculation
 * BDD Scenario: features/05-fee-transparency.feature:58-90
 */
export interface SellerProceeds {
  salePrice: number; // Listing price (e.g., 100.00)
  platformFee: number; // Negative fee amount (e.g., -15.00 for Steam)
  sellerReceives: number; // Net proceeds after fees (e.g., 85.00)
  effectiveFeePercent: string; // Formatted percentage (e.g., "15.00%")
  badgeText?: string; // Badge text (e.g., "Low Fees: 2%")
}

/**
 * Input for buyer fee calculation
 */
export interface FeeCalculationInput {
  basePrice: number;
  platform: string;
}

/**
 * Input for seller proceeds calculation
 */
export interface SellerProceedsInput {
  salePrice: number;
  platform: string;
}

/**
 * Cross-platform fee comparison result
 * BDD Scenario: features/05-fee-transparency.feature:96-109
 */
export interface PlatformFeeComparison {
  platform: string;
  basePrice: number;
  fees: number;
  totalCost: number;
  savingsVsHighest: number;
  isBestPrice: boolean;
}

/**
 * Arbitrage opportunity calculation
 * BDD Scenario: features/05-fee-transparency.feature:198-219
 */
export interface ArbitrageOpportunity {
  buyFrom: string;
  buyTotal: number;
  sellOn: string;
  sellProceeds: number;
  profit: number;
  roi: string; // Formatted as percentage (e.g., "10.5%")
  isProfitable: boolean;
}

/**
 * Utility function to format currency with 2 decimal precision
 * Addresses Gotcha: JavaScript decimal precision
 */
export function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Utility function to format percentage with 2 decimal precision
 * Addresses Gotcha: Percentage calculation precision
 */
export function formatPercent(decimal: number): string {
  return (decimal * 100).toFixed(2) + '%';
}

/**
 * Utility function to safely calculate percentage of amount
 * Addresses Gotcha: 0.1 + 0.2 !== 0.3 in JavaScript
 * Returns result rounded to 2 decimal places
 */
export function calculatePercentage(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100 * 100) / 100;
}
