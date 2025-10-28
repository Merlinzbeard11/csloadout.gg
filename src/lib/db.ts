/**
 * Database Connection Utility
 * PostgreSQL connection pool for csloadout.gg price caching
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// ============================================================
// Connection Pool Configuration
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings optimized for Next.js serverless
  max: 10, // Maximum 10 concurrent connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5 seconds
});

// Handle pool errors globally
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// ============================================================
// Type Definitions
// ============================================================

export interface PriceCacheRow {
  id: number;
  item_name: string;
  marketplace: string;
  price: number;
  currency: string;
  float_value: number | null;
  cached_at: Date;
  expires_at: Date;
}

export interface CachedPrice {
  marketplace: string;
  price: number;
  currency: string;
  floatValue?: number;
  cachedAt: Date;
  expiresAt: Date;
  source: 'cache' | 'fresh' | 'stale_cache';
  warning?: string;
}

// ============================================================
// Core Database Functions
// ============================================================

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn(`Slow query detected (${duration}ms):`, text);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================================
// Price Cache Specific Functions
// ============================================================

/**
 * Get valid cached prices for an item (not expired)
 */
export async function getCachedPrices(
  itemName: string
): Promise<CachedPrice[]> {
  const result = await query<PriceCacheRow>(
    `SELECT * FROM price_cache
     WHERE item_name = $1
       AND expires_at > NOW()
     ORDER BY marketplace`,
    [itemName]
  );

  return result.rows.map(row => ({
    marketplace: row.marketplace,
    price: Number(row.price),
    currency: row.currency,
    floatValue: row.float_value ? Number(row.float_value) : undefined,
    cachedAt: row.cached_at,
    expiresAt: row.expires_at,
    source: 'cache',
  }));
}

/**
 * Get ALL cached prices for an item (including expired, for fallback)
 */
export async function getAllCachedPrices(
  itemName: string
): Promise<CachedPrice[]> {
  const result = await query<PriceCacheRow>(
    `SELECT * FROM price_cache
     WHERE item_name = $1
     ORDER BY marketplace`,
    [itemName]
  );

  return result.rows.map(row => ({
    marketplace: row.marketplace,
    price: Number(row.price),
    currency: row.currency,
    floatValue: row.float_value ? Number(row.float_value) : undefined,
    cachedAt: row.cached_at,
    expiresAt: row.expires_at,
    source: row.expires_at > new Date() ? 'cache' : 'stale_cache',
  }));
}

/**
 * Upsert price into cache (insert or update if exists)
 */
export async function upsertPrice(
  itemName: string,
  marketplace: string,
  price: number,
  currency: string = 'USD',
  floatValue?: number,
  ttlMinutes: number = 5
): Promise<void> {
  await query(
    `INSERT INTO price_cache (
      item_name,
      marketplace,
      price,
      currency,
      float_value,
      cached_at,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '${ttlMinutes} minutes')
    ON CONFLICT (item_name, marketplace)
    DO UPDATE SET
      price = EXCLUDED.price,
      currency = EXCLUDED.currency,
      float_value = EXCLUDED.float_value,
      cached_at = EXCLUDED.cached_at,
      expires_at = EXCLUDED.expires_at`,
    [itemName, marketplace, price, currency, floatValue || null]
  );
}

/**
 * Extend cache expiry (for API failure fallback)
 */
export async function extendCacheExpiry(
  itemName: string,
  marketplace: string,
  extensionMinutes: number = 5
): Promise<void> {
  await query(
    `UPDATE price_cache
     SET expires_at = NOW() + INTERVAL '${extensionMinutes} minutes'
     WHERE item_name = $1 AND marketplace = $2`,
    [itemName, marketplace]
  );
}

/**
 * Clean up expired cache entries (run via cron job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const result = await query(
    `DELETE FROM price_cache WHERE expires_at < NOW()`
  );
  return result.rowCount || 0;
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheHitRate: number;
}> {
  const result = await query<{
    total_entries: string;
    valid_entries: string;
    expired_entries: string;
    cache_hit_rate: string;
  }>(
    `SELECT
      COUNT(*)::INTEGER AS total_entries,
      COUNT(*) FILTER (WHERE expires_at > NOW())::INTEGER AS valid_entries,
      COUNT(*) FILTER (WHERE expires_at <= NOW())::INTEGER AS expired_entries,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE expires_at > NOW())::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE
          0
      END AS cache_hit_rate
    FROM price_cache`
  );

  const row = result.rows[0];
  return {
    totalEntries: Number(row.total_entries),
    validEntries: Number(row.valid_entries),
    expiredEntries: Number(row.expired_entries),
    cacheHitRate: Number(row.cache_hit_rate),
  };
}

// ============================================================
// Health Check
// ============================================================

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// ============================================================
// Export Pool for Advanced Usage
// ============================================================

export { pool };
