import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getCacheStats } from '@/lib/db';

/**
 * Database Health Check Endpoint
 * GET /api/health/db
 *
 * Returns database connection status and cache statistics
 */
export async function GET() {
  try {
    // Check database connection
    const isHealthy = await checkDatabaseHealth();

    if (!isHealthy) {
      return NextResponse.json(
        {
          healthy: false,
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Get cache statistics
    const stats = await getCacheStats();

    return NextResponse.json(
      {
        healthy: true,
        database: 'connected',
        cache: {
          totalEntries: stats.totalEntries,
          validEntries: stats.validEntries,
          expiredEntries: stats.expiredEntries,
          hitRate: `${stats.cacheHitRate}%`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
