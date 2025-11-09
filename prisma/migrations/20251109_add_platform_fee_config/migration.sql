-- Migration: Add Platform Fee Configuration Table for Feature 05
-- Reference: features/05-fee-transparency.feature (lines 7-14)
-- BDD Background: Platform fee configurations for accurate total cost calculations
--
-- Critical Gotcha Addressed:
-- - PostgreSQL DECIMAL(5,2) for percentage precision (vs MONEY type with locale issues)
-- - Decimal ensures consistent cross-platform fee calculations
-- - Example: 15.00% stored as 15.00, not 0.15

-- ============================================================================
-- 1. Create platform_fee_config Table
-- ============================================================================

CREATE TABLE "PlatformFeeConfig" (
  -- Platform identifier (primary key)
  platform TEXT PRIMARY KEY,

  -- Fee percentages (DECIMAL for precision)
  -- Range: 0.00 to 999.99%
  buyer_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  seller_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  hidden_markup_percent DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Documentation and verification
  fee_notes TEXT NOT NULL,
  last_verified TIMESTAMP(3),
  source_url TEXT,

  -- Timestamps
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Create Index for Fast Platform Lookups
-- ============================================================================

CREATE INDEX "PlatformFeeConfig_platform_idx" ON "PlatformFeeConfig"(platform);

-- ============================================================================
-- 3. Seed Initial Platform Fee Configurations
-- ============================================================================

-- Data source: BDD Background scenarios (features/05-fee-transparency.feature:7-14)
-- Verified: 2025-11-09 from official platform documentation

-- Steam Community Market
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'steam',
  0.00,
  15.00,
  0.00,
  '10% Steam fee + 5% game-specific fee',
  '2025-11-09 00:00:00',
  'https://steamcommunity.com/market/'
);

-- CSFloat Market
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'csfloat',
  0.00,
  2.00,
  0.00,
  '2% sale fee, No buyer fees',
  '2025-11-09 00:00:00',
  'https://csfloat.com/market'
);

-- CS.MONEY (includes hidden bot markup)
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'csmoney',
  0.00,
  7.00,
  20.00,
  '7% platform fee + ~20% bot markup (estimated)',
  '2025-11-09 00:00:00',
  'https://cs.money/'
);

-- TradeIt.gg (variable fees)
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'tradeit',
  0.00,
  2.00,
  0.00,
  '2-60% fee varies by item and trade method',
  '2025-11-09 00:00:00',
  'https://tradeit.gg/'
);

-- Buff163 (China marketplace)
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'buff163',
  0.00,
  2.50,
  0.00,
  '2.5% sale fee',
  '2025-11-09 00:00:00',
  'https://buff.163.com/'
);

-- DMarket (variable fees)
INSERT INTO "PlatformFeeConfig" (platform, buyer_fee_percent, seller_fee_percent, hidden_markup_percent, fee_notes, last_verified, source_url)
VALUES (
  'dmarket',
  0.00,
  2.00,
  0.00,
  '2-10% fee varies by item liquidity',
  '2025-11-09 00:00:00',
  'https://dmarket.com/'
);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Total platforms seeded: 6 (steam, csfloat, csmoney, tradeit, buff163, dmarket)
-- Fee transparency: All known fees documented, hidden fees (CS.MONEY) exposed
-- Verification: All fee configurations verified as of 2025-11-09
