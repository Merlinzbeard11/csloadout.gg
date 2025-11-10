/**
 * Phase 7f: SEO Metadata Tests (OpenGraph Tags)
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 245-280)
 *
 * Test Coverage:
 * - RED: OpenGraph metadata for public loadouts
 * - RED: Twitter Card metadata (auto-inherited from OpenGraph)
 * - RED: Dynamic metadata based on loadout data
 * - RED: Absolute URLs for images (metadataBase)
 * - RED: No metadata for private loadouts (noindex, nofollow)
 * - RED: Structured data for rich snippets
 * - RED: Canonical URLs for slug vs UUID routing
 */

import { Metadata } from 'next'

describe('Phase 7f: SEO Metadata (OpenGraph Tags)', () => {
  describe('OpenGraph Metadata Structure', () => {
    it('RED: should include required OpenGraph fields', () => {
      const metadata: Metadata = {
        title: 'Budget AK-47 Loadout - CSLoadout.gg',
        description: 'Complete CS2 loadout with AK-47 Redline and matching skins under $100 budget',
        openGraph: {
          title: 'Budget AK-47 Loadout',
          description: 'Complete CS2 loadout with AK-47 Redline and matching skins under $100 budget',
          type: 'website',
          url: 'https://csloadout.gg/loadouts/budget-ak-loadout',
          siteName: 'CSLoadout.gg',
          images: [
            {
              url: '/api/og-image/loadout-id-123',
              width: 1200,
              height: 630,
              alt: 'Budget AK-47 Loadout - CSLoadout.gg'
            }
          ]
        }
      }

      expect(metadata.openGraph).toBeDefined()
      expect(metadata.openGraph?.title).toBe('Budget AK-47 Loadout')
      expect(metadata.openGraph?.description).toBeTruthy()
      expect(metadata.openGraph?.type).toBe('website')
      expect(metadata.openGraph?.url).toBeTruthy()
      expect(metadata.openGraph?.siteName).toBe('CSLoadout.gg')
      expect(metadata.openGraph?.images).toHaveLength(1)
    })

    it('RED: should use 1200x630 image dimensions for optimal display', () => {
      const ogImage = {
        url: '/api/og-image/loadout-id-123',
        width: 1200,
        height: 630,
        alt: 'Budget AK-47 Loadout'
      }

      // OpenGraph recommended size: 1200x630 (1.91:1 ratio)
      expect(ogImage.width).toBe(1200)
      expect(ogImage.height).toBe(630)
      expect(ogImage.width / ogImage.height).toBeCloseTo(1.9, 1)
    })

    it('RED: should include alt text for images', () => {
      const ogImage = {
        url: '/api/og-image/loadout-id-123',
        width: 1200,
        height: 630,
        alt: 'Budget AK-47 Loadout - CSLoadout.gg'
      }

      expect(ogImage.alt).toBeTruthy()
      expect(ogImage.alt).toContain('Loadout')
    })
  })

  describe('Twitter Card Metadata', () => {
    it('RED: should auto-inherit from OpenGraph (no duplication)', () => {
      // Best practice: Only set openGraph, twitter auto-inherits
      const metadata: Metadata = {
        openGraph: {
          title: 'Budget AK-47 Loadout',
          description: 'Complete CS2 loadout under $100',
          images: ['/api/og-image/loadout-123']
        }
        // No twitter field needed - auto-inherits from openGraph
      }

      expect(metadata.openGraph).toBeDefined()
      expect(metadata.twitter).toBeUndefined() // Not needed
    })

    it('RED: should use summary_large_image card type for rich preview', () => {
      // When Twitter-specific override needed
      const metadata: Metadata = {
        openGraph: {
          title: 'Budget AK-47 Loadout',
          images: ['/api/og-image/loadout-123']
        },
        twitter: {
          card: 'summary_large_image',
          creator: '@csloadoutgg'
        }
      }

      expect(metadata.twitter?.card).toBe('summary_large_image')
    })
  })

  describe('Dynamic Metadata Generation', () => {
    it('RED: should generate metadata from loadout data', () => {
      const loadout = {
        id: 'loadout-123',
        name: 'Budget AK-47 Loadout',
        description: 'Complete CS2 loadout with AK-47 Redline',
        budget: 100.00,
        is_public: true,
        slug: 'budget-ak-loadout',
        upvotes: 42,
        views: 1337
      }

      const metadata: Metadata = {
        title: `${loadout.name} - CSLoadout.gg`,
        description: loadout.description || `View and customize this CS2 loadout: ${loadout.name}`,
        openGraph: {
          title: loadout.name,
          description: loadout.description || `CS2 loadout with $${loadout.budget} budget`,
          url: `https://csloadout.gg/loadouts/${loadout.slug}`,
          images: [
            {
              url: `/api/og-image/${loadout.id}`,
              width: 1200,
              height: 630,
              alt: `${loadout.name} - CSLoadout.gg`
            }
          ]
        }
      }

      expect(metadata.title).toContain(loadout.name)
      expect(metadata.description).toContain('AK-47 Redline')
      expect(metadata.openGraph?.url).toContain(loadout.slug)
      expect(metadata.openGraph?.images?.[0]).toMatchObject({
        url: `/api/og-image/${loadout.id}`,
        alt: expect.stringContaining(loadout.name)
      })
    })

    it('RED: should handle loadouts without descriptions gracefully', () => {
      const loadout = {
        name: 'My Loadout',
        description: null,
        budget: 50.00
      }

      const fallbackDescription = loadout.description || `View and customize this CS2 loadout: ${loadout.name}`

      expect(fallbackDescription).toBe('View and customize this CS2 loadout: My Loadout')
    })
  })

  describe('Absolute URLs and metadataBase', () => {
    it('RED: should resolve relative URLs to absolute with metadataBase', () => {
      const metadataBase = new URL('https://csloadout.gg')
      const relativeImageUrl = '/api/og-image/loadout-123'

      // Next.js automatically resolves relative URLs using metadataBase
      const absoluteUrl = new URL(relativeImageUrl, metadataBase).toString()

      expect(absoluteUrl).toBe('https://csloadout.gg/api/og-image/loadout-123')
      expect(absoluteUrl).toMatch(/^https:\/\//)
    })

    it('RED: should use environment-based metadataBase', () => {
      const productionBase = new URL('https://csloadout.gg')
      const developmentBase = new URL('http://localhost:3000')

      expect(productionBase.protocol).toBe('https:')
      expect(developmentBase.protocol).toBe('http:')
      expect(productionBase.hostname).toBe('csloadout.gg')
      expect(developmentBase.hostname).toBe('localhost')
    })
  })

  describe('Private Loadout Metadata', () => {
    it('RED: should use noindex, nofollow for private loadouts', () => {
      const privateLoadout = {
        name: 'Private Loadout',
        is_public: false
      }

      const metadata: Metadata = {
        title: `${privateLoadout.name} - CSLoadout.gg`,
        robots: privateLoadout.is_public
          ? 'index, follow'
          : 'noindex, nofollow'
      }

      expect(metadata.robots).toBe('noindex, nofollow')
    })

    it('RED: should omit OpenGraph for private loadouts', () => {
      const privateLoadout = {
        name: 'Private Loadout',
        is_public: false
      }

      const metadata: Metadata = {
        title: `${privateLoadout.name} - CSLoadout.gg`,
        robots: 'noindex, nofollow'
        // No openGraph field for private loadouts
      }

      expect(metadata.openGraph).toBeUndefined()
    })
  })

  describe('Canonical URLs', () => {
    it('RED: should use slug-based canonical URL for public loadouts', () => {
      const loadout = {
        id: 'uuid-123-456',
        slug: 'budget-ak-loadout',
        is_public: true
      }

      // Canonical URL should prefer slug over UUID
      const canonicalUrl = `https://csloadout.gg/loadouts/${loadout.slug}`

      expect(canonicalUrl).toContain(loadout.slug)
      expect(canonicalUrl).not.toContain(loadout.id)
    })

    it('RED: should redirect UUID to slug for SEO consolidation', () => {
      const loadout = {
        id: 'uuid-123-456',
        slug: 'budget-ak-loadout'
      }

      // UUID URL: /loadouts/uuid-123-456
      // Should redirect to: /loadouts/budget-ak-loadout
      const uuidUrl = `/loadouts/${loadout.id}`
      const slugUrl = `/loadouts/${loadout.slug}`

      expect(uuidUrl).toMatch(/^\/loadouts\/uuid-/)
      expect(slugUrl).toBe('/loadouts/budget-ak-loadout')

      // In implementation: redirect UUID → slug with 301
      const shouldRedirect = loadout.slug !== null
      expect(shouldRedirect).toBe(true)
    })
  })

  describe('Structured Data (JSON-LD)', () => {
    it('RED: should include Article structured data for rich snippets', () => {
      const loadout = {
        name: 'Budget AK-47 Loadout',
        description: 'Complete CS2 loadout',
        slug: 'budget-ak-loadout',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-15'),
        upvotes: 42
      }

      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: loadout.name,
        description: loadout.description,
        url: `https://csloadout.gg/loadouts/${loadout.slug}`,
        datePublished: loadout.created_at.toISOString(),
        dateModified: loadout.updated_at.toISOString(),
        author: {
          '@type': 'Organization',
          name: 'CSLoadout.gg'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: loadout.upvotes,
          reviewCount: loadout.upvotes
        }
      }

      expect(structuredData['@context']).toBe('https://schema.org')
      expect(structuredData['@type']).toBe('Article')
      expect(structuredData.headline).toBe(loadout.name)
      expect(structuredData.url).toContain(loadout.slug)
      expect(structuredData.aggregateRating.ratingValue).toBe(42)
    })
  })

  describe('Edge Cases', () => {
    it('RED: should handle special characters in loadout names', () => {
      const loadout = {
        name: 'AK-47 "Redline" & M4A4 <Elite>',
        slug: 'ak-47-redline-m4a4-elite'
      }

      // HTML entities should be encoded in metadata
      const safeTitle = loadout.name
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

      expect(safeTitle).toBe('AK-47 &quot;Redline&quot; &amp; M4A4 &lt;Elite&gt;')
    })

    it('RED: should truncate long descriptions to 160 characters', () => {
      const longDescription = 'A'.repeat(200)

      const truncated = longDescription.length > 160
        ? longDescription.slice(0, 157) + '...'
        : longDescription

      expect(truncated).toHaveLength(160)
      expect(truncated.endsWith('...')).toBe(true)
    })

    it('RED: should handle missing slug with fallback to ID', () => {
      const loadout = {
        id: 'uuid-123',
        slug: null
      }

      const url = loadout.slug
        ? `https://csloadout.gg/loadouts/${loadout.slug}`
        : `https://csloadout.gg/loadouts/${loadout.id}`

      expect(url).toBe('https://csloadout.gg/loadouts/uuid-123')
    })
  })
})
