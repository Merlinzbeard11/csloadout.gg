/**
 * AffiliateDisclosure Component
 *
 * FTC-compliant affiliate disclosure that must appear BEFORE any affiliate links.
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "Display FTC-compliant affiliate disclosure"
 *
 * FTC Compliance Requirements:
 *   1. Proximity: Visible BEFORE affiliate links
 *   2. Prominence: Font size easily readable
 *   3. Presentation: Simple language - no jargon
 *   4. Placement: Near affiliate links, not hidden in footer
 *
 * Legal Requirement: FTC mandates clear and conspicuous disclosures
 * when earning affiliate commissions.
 *
 * Enforcement: FTC can impose civil or criminal penalties for deceptive disclosures.
 */

'use client';

import React from 'react';

export interface AffiliateDisclosureProps {
  /**
   * Optional additional CSS classes for styling customization
   */
  className?: string;

  /**
   * Optional additional message to display after the main disclosure
   */
  additionalMessage?: string;
}

export default function AffiliateDisclosure({
  className = '',
  additionalMessage,
}: AffiliateDisclosureProps) {
  return (
    <div className={`bg-gray-100 p-4 mb-4 rounded-lg ${className}`}>
      <p className="text-sm text-gray-700">
        <strong>Disclosure:</strong> We earn a commission when you purchase
        through our links at no extra cost to you. This helps us keep
        csloadout.gg free for everyone.
      </p>

      {additionalMessage && (
        <p className="text-sm text-gray-600 mt-2">{additionalMessage}</p>
      )}
    </div>
  );
}
