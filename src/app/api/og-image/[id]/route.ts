/**
 * OpenGraph Image API Route (Phase 7f)
 *
 * Generates dynamic OG images for loadout social sharing
 * Returns 1200x630 PNG optimized for OpenGraph and Twitter Cards
 *
 * Future enhancement (Phase 7g+): Implement @vercel/og for dynamic image generation
 * Current: Returns placeholder redirect to static fallback
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO Phase 7g+: Implement dynamic OG image generation with @vercel/og
  // For now, redirect to static fallback image

  const fallbackImageUrl = new URL('/og-fallback.png', request.url)

  return NextResponse.redirect(fallbackImageUrl, 302)
}
