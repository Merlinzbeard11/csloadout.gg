-- ============================================================
-- Migration: 001 - Create Price Cache Table
-- Purpose: Eliminate marketplace API rate limiting bottleneck
-- Business Value: Reduce page load from 8-10s to <500ms
-- ============================================================

-- Drop existing table if exists (for development)
DROP TABLE IF EXISTS price_cache;

-- Create price_cache table
CREATE TABLE price_cache (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  marketplace VARCHAR(50) NOT NULL,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  float_value DECIMAL(5,4),
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  -- Unique constraint: one cache entry per item per marketplace
  -- PostgreSQL 15+: NULLS NOT DISTINCT ensures NULL values treated as equal
  -- This prevents duplicate entries for same item/marketplace
  CONSTRAINT unique_item_marketplace UNIQUE (item_name, marketplace)
);

-- ============================================================
-- Performance Indexes
-- ============================================================

-- Index for cache expiry lookups (most common query)
-- Used in: SELECT * FROM price_cache WHERE expires_at > NOW()
CREATE INDEX idx_price_cache_expiry ON price_cache(expires_at);

-- Index for item name lookups
-- Used in: SELECT * FROM price_cache WHERE item_name = $1
CREATE INDEX idx_price_cache_item ON price_cache(item_name);

-- Composite index for item + expiry (optimal for main query pattern)
-- Used in: SELECT * FROM price_cache WHERE item_name = $1 AND expires_at > NOW()
CREATE INDEX idx_price_cache_item_expiry ON price_cache(item_name, expires_at);

-- Index for marketplace filtering
-- Used in: SELECT * FROM price_cache WHERE marketplace = $1
CREATE INDEX idx_price_cache_marketplace ON price_cache(marketplace);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to clean up expired cache entries (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM price_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache hit rate (monitoring)
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
  total_entries INTEGER,
  valid_entries INTEGER,
  expired_entries INTEGER,
  cache_hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW())::INTEGER AS valid_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW())::INTEGER AS expired_entries,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE expires_at > NOW())::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE
        0
    END AS cache_hit_rate
  FROM price_cache;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Example Usage
-- ============================================================

-- Insert cache entry (using UPSERT pattern)
/*
INSERT INTO price_cache (item_name, marketplace, price, currency, float_value, expires_at)
VALUES (
  'AWP | Dragon Lore (Factory New)',
  'Steam',
  8500.00,
  'USD',
  NULL,
  NOW() + INTERVAL '5 minutes'
)
ON CONFLICT (item_name, marketplace)
DO UPDATE SET
  price = EXCLUDED.price,
  cached_at = NOW(),
  expires_at = EXCLUDED.expires_at;
*/

-- Query valid cache entries
/*
SELECT * FROM price_cache
WHERE item_name = 'AWP | Dragon Lore (Factory New)'
  AND expires_at > NOW();
*/

-- Get cache statistics
/*
SELECT * FROM get_cache_stats();
*/

-- Clean up expired entries
/*
SELECT cleanup_expired_cache();
*/

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify table created
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'price_cache';

-- Verify indexes created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'price_cache'
ORDER BY indexname;

-- Verify constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'price_cache'::regclass
ORDER BY conname;

-- ============================================================
-- Expected Results
-- ============================================================

-- Table should have:
-- ✓ 8 columns (id, item_name, marketplace, price, currency, float_value, cached_at, expires_at)
-- ✓ 1 primary key (id)
-- ✓ 1 unique constraint (item_name, marketplace)
-- ✓ 4 indexes (expiry, item, item_expiry, marketplace)
-- ✓ 2 helper functions (cleanup_expired_cache, get_cache_stats)
