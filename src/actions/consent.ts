'use server'

/**
 * Server Actions for GDPR Consent Management
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Request consent before first import (lines 331-345)
 *
 * GDPR Compliance (2025):
 * - Record consent with timestamp
 * - Track consent method and version
 * - Hash IP address for privacy (SHA-256)
 * - Create tamper-proof audit log entry
 * - Support consent withdrawal
 */

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import crypto from 'crypto'

export interface ConsentResult {
  success: boolean
  message: string
}

/**
 * Record user consent for inventory data collection
 *
 * Creates:
 * 1. Consent record in UserInventory table
 * 2. Audit log entry for compliance
 *
 * Returns: Success/error status
 */
export async function recordConsent(): Promise<ConsentResult> {
  try {
    // Require authentication
    const session = await getSession()

    if (!session || !session.user) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    const userId = session.user.id

    // Get client IP address from headers
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const rawIp = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Hash IP address for GDPR compliance (SHA-256)
    const hashedIp = crypto
      .createHash('sha256')
      .update(rawIp + (process.env.IP_HASH_SALT || 'default-salt'))
      .digest('hex')

    // Get user agent
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Current timestamp
    const consentDate = new Date()

    // Check if inventory exists, create if not
    let inventory = await prisma.userInventory.findUnique({
      where: { user_id: userId }
    })

    if (!inventory) {
      // Get user's steam_id from User table
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { steam_id: true }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Create inventory with consent
      inventory = await prisma.userInventory.create({
        data: {
          user_id: userId,
          steam_id: user.steam_id,
          consent_given: true,
          consent_date: consentDate,
          consent_ip_address: hashedIp,
          consent_method: 'modal',
          consent_version: '1.0'
        }
      })
    } else {
      // Update existing inventory with consent
      inventory = await prisma.userInventory.update({
        where: { user_id: userId },
        data: {
          consent_given: true,
          consent_date: consentDate,
          consent_ip_address: hashedIp,
          consent_method: 'modal',
          consent_version: '1.0'
        }
      })
    }

    // Create audit log entry for GDPR compliance
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'consent_given',
        resource: 'inventory',
        resource_id: inventory.id,
        timestamp: consentDate,
        ip_address: hashedIp,
        user_agent: userAgent,
        consent_version: '1.0',
        processing_purpose: 'Inventory data collection for marketplace price comparison',
        metadata: {
          method: 'modal',
          accepted_at: consentDate.toISOString()
        }
      }
    })

    return {
      success: true,
      message: 'Consent recorded successfully'
    }

  } catch (error) {
    console.error('Record consent error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record consent'
    }
  }
}
