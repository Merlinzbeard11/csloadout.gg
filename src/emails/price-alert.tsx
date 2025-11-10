/**
 * Price Alert Email Template
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1e: Email Notifications)
 * Requirements from line 149-151:
 * - Show target price vs triggered price
 * - Include marketplace link to buy
 * - Include "Manage your alerts" link
 * - GDPR-compliant unsubscribe footer
 *
 * Built with React Email for type-safe, component-based email templates
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components'
import * as React from 'react'

export interface PriceAlertEmailProps {
  itemName: string
  targetPrice: number
  triggeredPrice: number
  platform: string
  listingUrl: string
  manageAlertsUrl: string
  unsubscribeUrl: string
}

export const PriceAlertEmail = ({
  itemName = 'AK-47 | Redline (Field-Tested)',
  targetPrice = 8.00,
  triggeredPrice = 7.95,
  platform = 'CSFloat',
  listingUrl = 'https://csfloat.com/item/12345',
  manageAlertsUrl = 'https://csloadout.gg/alerts',
  unsubscribeUrl = 'https://csloadout.gg/api/unsubscribe?alert=xxx&token=xxx'
}: PriceAlertEmailProps) => {
  const savings = targetPrice - triggeredPrice
  const savingsPercent = ((savings / targetPrice) * 100).toFixed(1)

  return (
    <Html>
      <Head />
      <Preview>
        {itemName} dropped to ${triggeredPrice.toFixed(2)} - {savingsPercent}% below your target!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 Price Alert Triggered!</Heading>

          <Text style={text}>
            Great news! The item you're watching has dropped to your target price:
          </Text>

          <Section style={alertBox}>
            <Heading as="h2" style={itemTitle}>
              {itemName}
            </Heading>
            <Text style={priceComparison}>
              <span style={oldPrice}>Your target: ${targetPrice.toFixed(2)}</span>
              <br />
              <span style={newPrice}>Current price: ${triggeredPrice.toFixed(2)}</span>
            </Text>
            {savings > 0 && (
              <Text style={savingsStyle}>
                💰 You're saving ${savings.toFixed(2)} ({savingsPercent}%)
              </Text>
            )}
            <Text style={platformText}>
              Available on: <strong>{platform}</strong>
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={listingUrl}>
              View Listing &rarr;
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            <strong>What's next?</strong>
          </Text>
          <Text style={text}>
            • Click the button above to view the listing before it's gone
            <br />
            • This alert will trigger again if the price drops further (after 15 min cooldown)
            <br />
            • <Link href={manageAlertsUrl} style={link}>Manage your alerts</Link> to adjust or pause notifications
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>CS Loadout Price Alerts</strong>
            <br />
            Track prices, save money, build your dream loadout.
          </Text>

          <Text style={footer}>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe from this alert
            </Link>
            <br />
            <Link href={manageAlertsUrl} style={link}>
              Manage all alerts
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PriceAlertEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px'
}

const h1 = {
  color: '#1d1c1d',
  fontSize: '36px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '42px',
  textAlign: 'center' as const
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 20px'
}

const alertBox = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #e3e8ef',
  borderRadius: '8px',
  margin: '24px 20px',
  padding: '24px'
}

const itemTitle = {
  color: '#1d1c1d',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  lineHeight: '32px'
}

const priceComparison = {
  fontSize: '18px',
  lineHeight: '28px',
  margin: '12px 0'
}

const oldPrice = {
  color: '#666',
  textDecoration: 'line-through'
}

const newPrice = {
  color: '#059669',
  fontWeight: '700',
  fontSize: '24px'
}

const savingsStyle = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: '600',
  margin: '12px 0'
}

const platformText = {
  color: '#666',
  fontSize: '14px',
  margin: '12px 0 0 0'
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 20px'
}

const button = {
  backgroundColor: '#5865f2',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '100%',
  padding: '14px 20px'
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 20px'
}

const link = {
  color: '#5865f2',
  textDecoration: 'underline'
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 20px',
  textAlign: 'center' as const
}

const unsubscribeLink = {
  color: '#8898aa',
  fontSize: '12px',
  textDecoration: 'underline'
}
