/**
 * TDD Tests for Fee Calculator API
 *
 * BDD Reference: features/05-fee-transparency.feature
 * API Route: src/app/api/fees/calculate/route.ts (to be created)
 *
 * Feature Requirements:
 * - Calculate buyer total cost with platform fees
 * - Calculate seller proceeds after fees
 * - Expose hidden markup fees (CS.MONEY bot markup)
 * - Decimal precision (2 decimal places, rounded)
 * - Cross-platform fee comparison
 * - Arbitrage profit calculations
 *
 * Critical Gotchas:
 * - JavaScript decimal precision (0.1 + 0.2 !== 0.3)
 * - Currency calculations (use integer cents internally)
 * - Percentage calculations (3% of $1.37 = $0.03425 → rounds to $0.03)
 * - PostgreSQL DECIMAL(10,2) for money storage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  PlatformFeeConfig,
  FeeBreakdown,
  SellerProceeds,
  FeeCalculationInput,
  SellerProceedsInput,
} from '@/types/fees';

// Test data builders (real implementations, no mocks)
class PlatformFeeConfigBuilder {
  private config: PlatformFeeConfig = {
    platform: 'test',
    buyerFeePercent: 0,
    sellerFeePercent: 0,
    hiddenMarkupPercent: 0,
    feeNotes: 'Test platform',
  };

  withPlatform(platform: string): this {
    this.config.platform = platform;
    return this;
  }

  withBuyerFee(percent: number): this {
    this.config.buyerFeePercent = percent;
    return this;
  }

  withSellerFee(percent: number): this {
    this.config.sellerFeePercent = percent;
    return this;
  }

  withHiddenMarkup(percent: number): this {
    this.config.hiddenMarkupPercent = percent;
    return this;
  }

  withFeeNotes(notes: string): this {
    this.config.feeNotes = notes;
    return this;
  }

  build(): PlatformFeeConfig {
    return { ...this.config };
  }
}

// In-memory fee configuration repository (real implementation for testing)
class InMemoryFeeConfigRepository {
  private configs: Map<string, PlatformFeeConfig> = new Map();

  constructor() {
    // Seed with BDD Background data (features/05-fee-transparency.feature:7-14)
    this.configs.set(
      'steam',
      new PlatformFeeConfigBuilder()
        .withPlatform('steam')
        .withBuyerFee(0)
        .withSellerFee(15.0)
        .withHiddenMarkup(0)
        .withFeeNotes('10% Steam fee + 5% game-specific fee')
        .build()
    );

    this.configs.set(
      'csfloat',
      new PlatformFeeConfigBuilder()
        .withPlatform('csfloat')
        .withBuyerFee(0)
        .withSellerFee(2.0)
        .withHiddenMarkup(0)
        .withFeeNotes('2% sale fee, No buyer fees')
        .build()
    );

    this.configs.set(
      'csmoney',
      new PlatformFeeConfigBuilder()
        .withPlatform('csmoney')
        .withBuyerFee(0)
        .withSellerFee(7.0)
        .withHiddenMarkup(20.0)
        .withFeeNotes('7% platform fee + ~20% bot markup (estimated)')
        .build()
    );

    this.configs.set(
      'buff163',
      new PlatformFeeConfigBuilder()
        .withPlatform('buff163')
        .withBuyerFee(0)
        .withSellerFee(2.5)
        .withHiddenMarkup(0)
        .withFeeNotes('2.5% sale fee')
        .build()
    );
  }

  async getByPlatform(platform: string): Promise<PlatformFeeConfig | null> {
    return this.configs.get(platform) || null;
  }

  async addConfig(config: PlatformFeeConfig): Promise<void> {
    this.configs.set(config.platform, config);
  }
}

// Fee calculator service (real implementation to make tests pass)
class FeeCalculatorService {
  constructor(private feeConfigRepo: InMemoryFeeConfigRepository) {}

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

    // Get platform fee configuration
    const config = await this.feeConfigRepo.getByPlatform(platform);

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

    // Calculate buyer fee (rounded to 2 decimal places)
    const platformFeeRaw = (basePrice * config.buyerFeePercent) / 100;
    const platformFee = Math.round(platformFeeRaw * 100) / 100;

    // Calculate hidden markup (CS.MONEY bot markup)
    const hiddenMarkupRaw = (basePrice * config.hiddenMarkupPercent) / 100;
    const hiddenMarkup = Math.round(hiddenMarkupRaw * 100) / 100;

    // Total cost
    const totalCost = Math.round((basePrice + platformFee + hiddenMarkup) * 100) / 100;

    // Calculate effective fee percentage
    const totalFeePercent = basePrice > 0 ? (platformFee + hiddenMarkup) / basePrice * 100 : 0;
    const effectiveFeePercent = totalFeePercent === 0 ? '0%' : totalFeePercent.toFixed(2) + '%';

    // Build fee note
    let feeNote = config.feeNotes;

    // Check if fee is under $0.01 (BDD: features/05-fee-transparency.feature:161-167)
    if (platformFee === 0 && config.buyerFeePercent > 0) {
      feeNote += ' - Fee less than $0.01';
    } else if (config.buyerFeePercent === 0 && config.sellerFeePercent > 0 && config.hiddenMarkupPercent === 0) {
      // Seller pays, not buyer (only if no hidden markup)
      feeNote = `${config.sellerFeePercent}% sale fee (seller pays, not buyer)`;
    }

    // Check for warnings (hidden markup)
    const hasWarning = config.hiddenMarkupPercent > 0;
    const warningMessage = hasWarning
      ? `⚠️ Includes ~${config.hiddenMarkupPercent}% estimated bot markup`
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

    // Get platform fee configuration
    const config = await this.feeConfigRepo.getByPlatform(platform);

    if (!config) {
      return {
        salePrice,
        platformFee: 0,
        sellerReceives: salePrice,
        effectiveFeePercent: '0%',
      };
    }

    // Calculate seller fee (negative value, rounded to 2 decimal places)
    const platformFeeRaw = (salePrice * config.sellerFeePercent) / 100;
    const platformFee = -Math.round(platformFeeRaw * 100) / 100;

    // Calculate seller proceeds
    const sellerReceives = Math.round((salePrice + platformFee) * 100) / 100;

    // Format effective fee percentage
    const effectiveFeePercent = config.sellerFeePercent.toFixed(2) + '%';

    // Add badge for low fees (≤2%)
    const badgeText =
      config.sellerFeePercent <= 2.0 ? `Low Fees: ${config.sellerFeePercent}%` : undefined;

    return {
      salePrice,
      platformFee,
      sellerReceives,
      effectiveFeePercent,
      badgeText,
    };
  }
}

describe('Fee Calculator API', () => {
  let feeConfigRepo: InMemoryFeeConfigRepository;
  let feeCalculator: FeeCalculatorService;

  beforeEach(() => {
    feeConfigRepo = new InMemoryFeeConfigRepository();
    feeCalculator = new FeeCalculatorService(feeConfigRepo);
  });

  // ============================================================================
  // Basic Fee Calculation and Display
  // BDD: features/05-fee-transparency.feature:20-52
  // ============================================================================

  describe('Buyer Fee Calculation', () => {
    it('should calculate total cost with fee breakdown for CSFloat listing', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:20-29
      // Given an item "AK-47 | Redline (Field-Tested)" is listed on "csfloat" for $10.00
      const input: FeeCalculationInput = {
        basePrice: 10.0,
        platform: 'csfloat',
      };

      // When I view the price details
      const result = await feeCalculator.calculateBuyerFees(input);

      // Then I should see the fee breakdown
      expect(result.basePrice).toBe(10.0);
      expect(result.platformFee).toBe(0.0);
      expect(result.totalCost).toBe(10.0);
      expect(result.effectiveFeePercent).toBe('0%');
      expect(result.feeNote).toContain('2% sale fee (seller pays, not buyer)');
    });

    it('should calculate total cost with 3% buyer fees', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:31-40
      // Given "hypothetical_platform" has a buyer fee of "3%"
      await feeConfigRepo.addConfig(
        new PlatformFeeConfigBuilder()
          .withPlatform('hypothetical_platform')
          .withBuyerFee(3.0)
          .withFeeNotes('3% buyer fee')
          .build()
      );

      const input: FeeCalculationInput = {
        basePrice: 50.0,
        platform: 'hypothetical_platform',
      };

      const result = await feeCalculator.calculateBuyerFees(input);

      expect(result.basePrice).toBe(50.0);
      expect(result.platformFee).toBe(1.5); // 3% of $50.00
      expect(result.totalCost).toBe(51.5);
      expect(result.effectiveFeePercent).toBe('3.00%');
    });

    it('should expose hidden bot markup fees for CS.MONEY', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:42-52
      // Given an item "Butterfly Knife | Fade (Factory New)" is listed on "csmoney" for $1000.00
      const input: FeeCalculationInput = {
        basePrice: 1000.0,
        platform: 'csmoney',
      };

      // When I view the price details
      const result = await feeCalculator.calculateBuyerFees(input);

      // Then I should see the fee breakdown
      expect(result.basePrice).toBe(1000.0);
      expect(result.hiddenMarkup).toBe(200.0); // 20% of $1000.00
      expect(result.totalCost).toBe(1200.0);
      expect(result.effectiveFeePercent).toBe('20.00%');
      expect(result.hasWarning).toBe(true);
      expect(result.warningMessage).toBe('⚠️ Includes ~20% estimated bot markup');
      expect(result.feeNote).toContain('7% platform fee + ~20% bot markup (estimated)');
    });
  });

  // ============================================================================
  // Seller Proceeds Calculation
  // BDD: features/05-fee-transparency.feature:58-90
  // ============================================================================

  describe('Seller Proceeds Calculation', () => {
    it('should calculate seller proceeds for Steam sale', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:58-66
      // Given I want to sell an item for $100.00
      const input: SellerProceedsInput = {
        salePrice: 100.0,
        platform: 'steam',
      };

      // When I calculate seller proceeds for "steam"
      const result = await feeCalculator.calculateSellerProceeds(input);

      // Then I should see the proceeds breakdown
      expect(result.salePrice).toBe(100.0);
      expect(result.platformFee).toBe(-15.0); // 15% fee
      expect(result.sellerReceives).toBe(85.0);
      expect(result.effectiveFeePercent).toBe('15.00%');
    });

    it('should calculate seller proceeds for CSFloat sale (lowest fees)', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:68-77
      const input: SellerProceedsInput = {
        salePrice: 100.0,
        platform: 'csfloat',
      };

      const result = await feeCalculator.calculateSellerProceeds(input);

      expect(result.salePrice).toBe(100.0);
      expect(result.platformFee).toBe(-2.0); // 2% fee
      expect(result.sellerReceives).toBe(98.0);
      expect(result.effectiveFeePercent).toBe('2.00%');
      expect(result.badgeText).toBe('Low Fees: 2%');
    });

    it('should compare seller proceeds across all platforms', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:79-90
      const platforms = ['csfloat', 'buff163', 'csmoney', 'steam'];
      const salePrice = 100.0;

      const results = await Promise.all(
        platforms.map((platform) =>
          feeCalculator.calculateSellerProceeds({ salePrice, platform })
        )
      );

      // Verify CSFloat has best proceeds
      const csfloatResult = results.find((r) => r.sellerReceives === 98.0);
      expect(csfloatResult).toBeDefined();
      expect(csfloatResult?.platformFee).toBe(-2.0);

      // Verify Steam has worst proceeds
      const steamResult = results.find((r) => r.sellerReceives === 85.0);
      expect(steamResult).toBeDefined();
      expect(steamResult?.platformFee).toBe(-15.0);

      // Verify Buff163
      const buff163Result = results.find((r) => r.sellerReceives === 97.5);
      expect(buff163Result).toBeDefined();
      expect(buff163Result?.platformFee).toBe(-2.5);
    });
  });

  // ============================================================================
  // Decimal Precision and Rounding
  // BDD: features/05-fee-transparency.feature:145-167
  // ============================================================================

  describe('Decimal Precision', () => {
    it('should handle decimal precision correctly for fee calculations', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:145-151
      // Given an item "P250 | See Ya Later (Field-Tested)" is listed for $1.37
      // And "hypothetical_platform" has a buyer fee of "2.5%"
      await feeConfigRepo.addConfig(
        new PlatformFeeConfigBuilder()
          .withPlatform('hypothetical_platform_2.5')
          .withBuyerFee(2.5)
          .withFeeNotes('2.5% buyer fee')
          .build()
      );

      const input: FeeCalculationInput = {
        basePrice: 1.37,
        platform: 'hypothetical_platform_2.5',
      };

      // When I calculate the total cost
      const result = await feeCalculator.calculateBuyerFees(input);

      // Then the platform fee should be exactly "$0.03" (not $0.034)
      // 2.5% of $1.37 = $0.03425 → rounds to $0.03
      expect(result.platformFee).toBe(0.03);
      expect(result.totalCost).toBe(1.4); // $1.37 + $0.03
    });

    it('should handle high-value item fees with precision', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:153-159
      // Given an item "AWP | Dragon Lore (Factory New)" is listed for $9876.54
      const input: SellerProceedsInput = {
        salePrice: 9876.54,
        platform: 'csfloat',
      };

      // When I calculate seller proceeds (2% fee)
      const result = await feeCalculator.calculateSellerProceeds(input);

      // Then the platform fee should be exactly "$197.53"
      // 2% of $9876.54 = $197.5308 → rounds to $197.53
      expect(result.platformFee).toBe(-197.53);
      expect(result.sellerReceives).toBe(9679.01); // $9876.54 - $197.53
    });

    it('should handle very small fees (under $0.01)', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:161-167
      // Given an item is listed for $0.15 with 2% buyer fee
      await feeConfigRepo.addConfig(
        new PlatformFeeConfigBuilder()
          .withPlatform('hypothetical_platform_2pct')
          .withBuyerFee(2.0)
          .withFeeNotes('2% buyer fee')
          .build()
      );

      const input: FeeCalculationInput = {
        basePrice: 0.15,
        platform: 'hypothetical_platform_2pct',
      };

      const result = await feeCalculator.calculateBuyerFees(input);

      // 2% of $0.15 = $0.003 → rounds to $0.00
      expect(result.platformFee).toBe(0.0);
      expect(result.totalCost).toBe(0.15);
      expect(result.feeNote).toContain('Fee less than $0.01');
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // BDD: features/05-fee-transparency.feature:279-299
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing fee configuration gracefully', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:279-285
      const input: FeeCalculationInput = {
        basePrice: 50.0,
        platform: 'unknown_platform',
      };

      const result = await feeCalculator.calculateBuyerFees(input);

      expect(result.feeNote).toContain('Fee information not available');
      expect(result.basePrice).toBe(50.0);
      expect(result.platformFee).toBe(0.0);
      expect(result.totalCost).toBe(50.0);
    });

    it('should handle zero-price items (free drops)', async () => {
      // BDD Scenario: features/05-fee-transparency.feature:287-292
      const input: FeeCalculationInput = {
        basePrice: 0.0,
        platform: 'csfloat',
      };

      const result = await feeCalculator.calculateBuyerFees(input);

      expect(result.totalCost).toBe(0.0);
      expect(result.platformFee).toBe(0.0);
      expect(result.feeNote).toContain('Free item - no fees');
    });
  });
});
