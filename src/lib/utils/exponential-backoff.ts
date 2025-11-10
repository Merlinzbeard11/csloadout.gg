/**
 * Exponential Backoff Utility for HTTP Rate Limiting
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Exponential backoff on 429 error (lines 94-103)
 *
 * Best Practices (2025):
 * - Respect Retry-After header when provided
 * - Use exponential backoff: 2s → 4s → 8s → 16s...
 * - Limit maximum retries to prevent infinite loops
 * - Double delay after each retry
 *
 * References:
 * - AWS Prescriptive Guidance: Retry with backoff pattern
 * - OpenAI Cookbook: How to handle rate limits
 * - Microsoft Graph API: Rate limiting best practices
 */

/**
 * Fetch with automatic exponential backoff on HTTP 429 errors
 *
 * @param url - URL to fetch
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 2000ms)
 * @returns Promise<Response>
 * @throws Error if rate limit exceeded after max retries
 */
export async function fetchWithExponentialBackoff(
  url: string,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url)
    lastResponse = response

    // If not rate limited, return immediately
    if (response.status !== 429) {
      return response
    }

    // If this was the last retry, fail
    if (attempt === maxRetries) {
      throw new Error('Rate limit exceeded, try again later')
    }

    // Calculate delay
    const retryAfterHeader = response.headers.get('Retry-After')
    let delay: number

    if (retryAfterHeader) {
      // Respect Retry-After header (in seconds)
      delay = parseInt(retryAfterHeader, 10) * 1000
    } else {
      // Use exponential backoff: 2s, 4s, 8s, 16s...
      delay = baseDelay * Math.pow(2, attempt)
    }

    // Wait before retrying
    await sleep(delay)
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Rate limit exceeded, try again later')
}

/**
 * Sleep utility
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
