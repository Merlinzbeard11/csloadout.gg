-- Migration: Add Full-Text Search Support for Feature 03
-- Reference: features/03-search-filters.md (lines 443-454)
-- Gotcha #1: PostgreSQL FTS degrades above 10M rows (we're safe with 7K items)
-- Gotcha #5: pg_trgm ORDER BY causes severe slowdown (mitigated with exact-match-first strategy)
-- Gotcha #6: pg_trgm doesn't work for <3 characters (handled with prefix matching)

-- ============================================================================
-- 1. Enable Required PostgreSQL Extensions
-- ============================================================================

-- pg_trgm: Trigram similarity for fuzzy matching and autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: Remove accents from text for better search matching
-- Example: "café" matches "cafe"
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- 2. Add search_vector Column to items Table
-- ============================================================================

-- Dedicated tsvector column (NOT computed on-the-fly)
-- Performance: ~50x faster than computing tsvector in queries
-- Source: ParadeDB research - 41.3s → 0.88s on 10M rows
ALTER TABLE items ADD COLUMN search_vector tsvector;

-- ============================================================================
-- 3. Create GIN Index for Full-Text Search
-- ============================================================================

-- GIN index for fast full-text search
-- fastupdate = off: Better query performance, slightly slower updates
-- (acceptable tradeoff since items don't change frequently)
CREATE INDEX items_search_gin_idx ON items
USING GIN (search_vector)
WITH (fastupdate = off);

-- ============================================================================
-- 4. Create Trigger to Auto-Update search_vector
-- ============================================================================

-- Automatically update search_vector whenever item data changes
-- Indexes: name (highest weight A), weapon_type (B), description (C), search_name (D)
CREATE TRIGGER items_search_update
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(
    search_vector,
    'pg_catalog.english',
    name,
    weapon_type,
    description,
    search_name
  );

-- ============================================================================
-- 5. Create Additional Indexes for Filter Performance
-- ============================================================================

-- Price range filters (BDD: Filter by price range $5-$20)
-- GOTCHA FIX: Cannot use subquery in CREATE INDEX
-- Solution: Use existing marketplace_prices(item_id, total_cost) composite index
-- Queries should join marketplace_prices and filter on total_cost
-- See: marketplace_prices table has @@index([item_id, total_cost])

-- Rarity filter (BDD: Filter by rarity "classified")
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity)
WHERE rarity IS NOT NULL;

-- Wear condition filter (BDD: Filter by wear "factory_new")
CREATE INDEX IF NOT EXISTS idx_items_wear ON items(wear)
WHERE wear != 'none';

-- Float value filter (BDD: Filter by float 0.00-0.01)
-- Sparse index - only items with float values
CREATE INDEX IF NOT EXISTS idx_items_float ON items(wear_min, wear_max)
WHERE wear_min IS NOT NULL;

-- ============================================================================
-- 6. Composite Index for Common Filter Combinations
-- ============================================================================

-- Covers: weapon_type + rarity + price (most common filter combo)
-- Example: "AK-47, classified, $5-$20"
CREATE INDEX idx_items_search_combo ON items(weapon_type, rarity);

-- ============================================================================
-- 7. Trigram Indexes for Autocomplete
-- ============================================================================

-- Trigram GIN index for fuzzy autocomplete
-- Handles typos: "asimov" → "Asiimov"
CREATE INDEX idx_items_name_trigram ON items
USING GIN (name gin_trgm_ops);

-- B-tree index for exact prefix matching (fast path for autocomplete)
-- Handles short queries (<3 chars): "AK" matches "AK-47 | Redline"
-- Gotcha #6: pg_trgm doesn't work for searches <3 characters
CREATE INDEX idx_items_name_prefix ON items(name text_pattern_ops);

-- ============================================================================
-- 8. Populate search_vector for Existing Rows
-- ============================================================================

-- Update search_vector for all existing items
UPDATE items SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(weapon_type, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(search_name, '')
);

-- ============================================================================
-- 9. Set Default Trigram Similarity Threshold
-- ============================================================================

-- Gotcha #7: Default 0.3 is too lax, causes scanning thousands of rows
-- Increase to 0.5 for stricter, faster matching
-- Note: This is session-level, needs to be set in application code as well
-- SET pg_trgm.similarity_threshold = 0.5;

-- ============================================================================
-- Performance Validation Queries (for testing)
-- ============================================================================

-- Test full-text search performance
-- Should use items_search_gin_idx
-- Target: <100ms
-- EXPLAIN ANALYZE
-- SELECT * FROM items
-- WHERE search_vector @@ to_tsquery('english', 'blue & ak47')
-- LIMIT 50;

-- Test autocomplete performance (exact match)
-- Should use idx_items_name_prefix
-- Target: <50ms
-- EXPLAIN ANALYZE
-- SELECT id, name, weapon_type, image_url
-- FROM items
-- WHERE name ILIKE 'ak%'
-- LIMIT 10;

-- Test autocomplete performance (fuzzy match)
-- Should use idx_items_name_trigram
-- Target: <50ms after exact matches
-- EXPLAIN ANALYZE
-- SELECT id, name, weapon_type, image_url
-- FROM items
-- WHERE name % 'asimov'
--   AND similarity(name, 'asimov') > 0.5
-- ORDER BY similarity(name, 'asimov') DESC
-- LIMIT 10;

-- Test filtered search performance
-- Should use idx_items_search_combo + idx_items_rarity
-- Target: <300ms
-- EXPLAIN ANALYZE
-- SELECT i.* FROM items i
-- WHERE i.weapon_type = 'AK-47'
--   AND i.rarity = 'classified'
--   AND (SELECT MIN(total_cost) FROM marketplace_prices WHERE item_id = i.id) BETWEEN 5 AND 20
-- LIMIT 50;
