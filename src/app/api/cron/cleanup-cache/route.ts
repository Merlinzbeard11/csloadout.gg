import { NextResponse } from 'next/server';
import { cleanupExpiredCache } from '@/lib/db';

/**
 * Cache Cleanup Cron Endpoint
 * GET /api/cron/cleanup-cache
 *
 * Removes expired cache entries from price_cache table
 * Scheduled to run every 30 minutes via Vercel Cron
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-cache",
 *     "schedule": "0 /30 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Verify request is from Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');

    // In production, verify this matches CRON_SECRET environment variable
    if (process.env.NODE_ENV === 'production') {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        console.warn('CRON_SECRET not configured - skipping auth check');
      } else if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Clean up expired cache entries
    const deletedCount = await cleanupExpiredCache();

    console.log(`Cache cleanup completed: ${deletedCount} entries deleted`);

    return NextResponse.json({
      success: true,
      deletedEntries: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache cleanup failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
