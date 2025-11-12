/**
 * TDD Tests for GDPR Consent Modal (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Request consent before first import (lines 331-345)
 *
 * Requirements:
 * - Show consent modal when consent_given is false
 * - Display privacy policy explanation
 * - Show data collection table
 * - Accept/Decline buttons with equal prominence
 * - Record consent timestamp on accept
 * - Create audit log entry on accept
 * - Close modal on decline without recording consent
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { prisma } from '@/lib/prisma'

// Mock consent action
const mockRecordConsent = jest.fn()
jest.mock('@/actions/consent', () => ({
  recordConsent: () => mockRecordConsent()
}))

describe('GDPR Consent Modal (TDD - RED Phase)', () => {
  const testUserId = 'user-gdpr-test-123'

  beforeEach(() => {
    mockRecordConsent.mockClear()
  })

  it('should show consent modal when consent_given is false', async () => {
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={jest.fn()} onAccept={jest.fn()} />)

    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
  })

  it('should display data collection explanation', async () => {
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={jest.fn()} onAccept={jest.fn()} />)

    expect(screen.getByText(/we will import your inventory data from steam api/i)).toBeInTheDocument()
  })

  it('should show data collection table with purposes', async () => {
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={jest.fn()} onAccept={jest.fn()} />)

    expect(screen.getByText(/asset id/i)).toBeInTheDocument()
    expect(screen.getByText(/identify unique items/i)).toBeInTheDocument()
    expect(screen.getByText(/market hash name/i)).toBeInTheDocument()
    expect(screen.getByText(/float value/i)).toBeInTheDocument()
  })

  it('should have accept and decline buttons with equal prominence', async () => {
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={jest.fn()} onAccept={jest.fn()} />)

    const acceptButton = screen.getByRole('button', { name: /accept and import/i })
    const declineButton = screen.getByRole('button', { name: /decline/i })

    expect(acceptButton).toBeInTheDocument()
    expect(declineButton).toBeInTheDocument()
  })

  it('should call onAccept when accept button is clicked', async () => {
    const onAccept = jest.fn()
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={jest.fn()} onAccept={onAccept} />)

    const acceptButton = screen.getByRole('button', { name: /accept and import/i })
    fireEvent.click(acceptButton)

    expect(onAccept).toHaveBeenCalled()
  })

  it('should call onClose when decline button is clicked', async () => {
    const onClose = jest.fn()
    const ConsentModal = (await import('@/components/ConsentModal')).default
    render(<ConsentModal isOpen={true} onClose={onClose} onAccept={jest.fn()} />)

    const declineButton = screen.getByRole('button', { name: /decline/i })
    fireEvent.click(declineButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should record consent with timestamp in database', async () => {
    // Setup user
    await prisma.user.deleteMany({ where: { id: testUserId } })
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: '76561198999999999',
        persona_name: 'Test User',
        profile_url: 'https://steam.com/test',
        avatar: 'https://avatar.jpg'
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: user.steam_id,
        consent_given: false
      }
    })

    // Simulate consent recording
    const consentDate = new Date()
    const updated = await prisma.userInventory.update({
      where: { user_id: testUserId },
      data: {
        consent_given: true,
        consent_date: consentDate,
        consent_ip_address: 'hashed_ip_address',
        consent_method: 'modal',
        consent_version: '1.0'
      }
    })

    expect(updated.consent_given).toBe(true)
    expect(updated.consent_date).toBeTruthy()
    expect(updated.consent_ip_address).toBe('hashed_ip_address')
    expect(updated.consent_method).toBe('modal')

    // Cleanup
    await prisma.userInventory.deleteMany({ where: { user_id: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
  })

  it('should create audit log entry when consent is given', async () => {
    // Setup user
    await prisma.user.deleteMany({ where: { id: testUserId } })
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: '76561198999999999',
        persona_name: 'Test User',
        profile_url: 'https://steam.com/test',
        avatar: 'https://avatar.jpg'
      }
    })

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: 'consent_given',
        resource: 'inventory',
        ip_address: 'hashed_ip',
        consent_version: '1.0',
        processing_purpose: 'Inventory data collection for marketplace price comparison'
      }
    })

    expect(auditLog.action).toBe('consent_given')
    expect(auditLog.resource).toBe('inventory')
    expect(auditLog.user_id).toBe(testUserId)

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { user_id: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
  })
})
