/**
 * GDPR-Compliant One-Click Unsubscribe API
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1e: Email Notifications)
 * Scenario: "Email includes GDPR-compliant unsubscribe link" (line 153)
 *
 * Requirements:
 * - One-click unsubscribe (no login required)
 * - Deactivate specific price alert
 * - Add email to suppression list (optional)
 * - Display confirmation message
 * - GDPR Article 7(3) compliance
 *
 * URL Format: /api/unsubscribe?alert={alertId}&token={token}
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email/email-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const alertId = searchParams.get('alert')
    const token = searchParams.get('token')

    // Validation
    if (!alertId || !token) {
      return NextResponse.json(
        { error: 'Missing alert ID or token' },
        { status: 400 }
      )
    }

    // Verify token
    if (!emailService.verifyUnsubscribeToken(alertId, token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 403 }
      )
    }

    // Fetch alert
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    // Deactivate alert
    await prisma.priceAlert.update({
      where: { id: alertId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    })

    // Optional: Add to suppression list if requested
    const suppressAll = searchParams.get('suppress_all') === 'true'
    if (suppressAll && alert.user.email) {
      await prisma.emailSuppressionList.upsert({
        where: { email: alert.user.email },
        create: {
          email: alert.user.email,
          reason: 'user_unsubscribed',
          suppressed_at: new Date()
        },
        update: {
          reason: 'user_unsubscribed',
          suppressed_at: new Date()
        }
      })
    }

    // Return success HTML page
    return new NextResponse(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - CS Loadout</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 48px;
      max-width: 500px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h1 {
      color: #1d1c1d;
      font-size: 32px;
      margin: 0 0 16px 0;
    }
    p {
      color: #484848;
      font-size: 16px;
      line-height: 24px;
      margin: 16px 0;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    a {
      color: #5865f2;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
    .button {
      display: inline-block;
      background-color: #5865f2;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      margin-top: 24px;
      text-decoration: none;
    }
    .button:hover {
      background-color: #4752c4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>You've been unsubscribed</h1>
    <p>You will no longer receive notifications for this price alert.</p>
    ${suppressAll ? '<p><strong>All email notifications have been disabled for your account.</strong></p>' : ''}
    <p>You can re-enable alerts anytime from your dashboard.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" class="button">
      Manage Alerts
    </a>
  </div>
</body>
</html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
