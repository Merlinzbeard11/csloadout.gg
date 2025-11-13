/**
 * Email Service - Resend Integration
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1e: Email Notifications)
 * Tests: __tests__/email-notifications.test.ts
 *
 * Technology: Resend (resend.com)
 * - Perpetual free tier: 3000 emails/month
 * - Next.js native integration
 * - React Email templates
 *
 * Responsibilities:
 * - Send price alert notification emails
 * - Check email suppression list before sending
 * - Format email content with React Email templates
 * - Handle Resend API errors gracefully
 * - Log email sending attempts
 * - GDPR-compliant unsubscribe links
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key from dashboard
 */

import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { render } from '@react-email/components'
import PriceAlertEmail from '@/emails/price-alert'

// Lazy-load Resend client to avoid errors during build time
// when environment variables may not be available
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

export interface ISendPriceAlertEmailParams {
  to: string
  itemName: string
  targetPrice: number
  triggeredPrice: number
  platform: string
  listingUrl: string
  alertId: string
}

export interface IEmailResult {
  success: boolean
  error?: string
  emailId?: string
  emailData?: {
    subject: string
    html: string
  }
}

class EmailService {
  /**
   * Send price alert notification email
   * BDD Scenario: "Send email notification when alert triggers" (line 143)
   */
  async sendPriceAlertEmail(params: ISendPriceAlertEmailParams): Promise<IEmailResult> {
    try {
      const { to, itemName, targetPrice, triggeredPrice, platform, listingUrl, alertId } = params

      // Step 1: Check suppression list
      // BDD Scenario: "Check suppression list before sending email" (line 159)
      const suppressed = await prisma.emailSuppressionList.findUnique({
        where: { email: to }
      })

      if (suppressed) {
        console.log(`Email suppressed for ${to}: ${suppressed.reason}`)
        return {
          success: false,
          error: `Email address is suppressed: ${suppressed.reason}`
        }
      }

      // Step 2: Generate email HTML using React Email
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?alert=${alertId}&token=${this.generateUnsubscribeToken(alertId)}`

      const emailHtml = await render(
        PriceAlertEmail({
          itemName,
          targetPrice,
          triggeredPrice,
          platform,
          listingUrl,
          manageAlertsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts`,
          unsubscribeUrl
        })
      )

      // Step 3: Format subject line
      // BDD: "email subject should be '🔔 Price Alert: AK-47 Redline is now $7.95'" (line 148)
      const subject = `🔔 Price Alert: ${itemName} is now $${triggeredPrice.toFixed(2)}`

      // Step 4: Send email via Resend
      const resend = getResendClient()
      const { data, error } = await resend.emails.send({
        from: 'CS Loadout Alerts <alerts@csloadout.gg>',
        to: [to],
        subject,
        html: emailHtml
      })

      if (error) {
        console.error('Resend API error:', error)
        return {
          success: false,
          error: error.message || 'Failed to send email'
        }
      }

      return {
        success: true,
        emailId: data?.id,
        emailData: {
          subject,
          html: emailHtml
        }
      }
    } catch (error) {
      console.error('Email service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate one-click unsubscribe token
   * BDD: "unsubscribe should be one-click (no login required)" (line 156)
   */
  private generateUnsubscribeToken(alertId: string): string {
    // Simple token: hash of alert ID + secret
    // Production: Use JWT or cryptographically secure token
    const crypto = require('crypto')
    const secret = process.env.UNSUBSCRIBE_SECRET || 'dev-secret-change-in-production'
    return crypto
      .createHash('sha256')
      .update(`${alertId}:${secret}`)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Verify unsubscribe token
   */
  verifyUnsubscribeToken(alertId: string, token: string): boolean {
    const expectedToken = this.generateUnsubscribeToken(alertId)
    return token === expectedToken
  }
}

export const emailService = new EmailService()
