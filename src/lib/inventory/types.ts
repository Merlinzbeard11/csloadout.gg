/**
 * Inventory Sync Service Type Definitions
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * Type definitions for inventory synchronization service:
 * - Sync options (consent, force refresh)
 * - Sync results (success, error states)
 * - Error types (privacy, rate limits, GDPR)
 */

export interface InventorySyncOptions {
  consentGiven?: boolean // GDPR consent requirement
  force?: boolean // Bypass cache, force fresh fetch
}

export interface InventorySyncResult {
  success: boolean
  itemsImported?: number
  unmatchedItems?: number
  totalValue?: number
  cached?: boolean
  error?: 'PRIVATE_INVENTORY' | 'RATE_LIMITED' | 'CONSENT_REQUIRED' | 'DATABASE_ERROR' | 'NETWORK_ERROR'
  message?: string
}
