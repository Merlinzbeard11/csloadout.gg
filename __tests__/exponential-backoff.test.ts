/**
 * TDD Tests for Exponential Backoff Utility (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Exponential backoff on 429 error (lines 94-103)
 *
 * Requirements:
 * - Wait 2 seconds before retry #1
 * - Wait 4 seconds before retry #2
 * - Wait 8 seconds before retry #3
 * - Fail after 3 retries with "Rate limit exceeded, try again later"
 * - Respect Retry-After header if provided
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { fetchWithExponentialBackoff } from '@/lib/utils/exponential-backoff'

describe('Exponential Backoff Utility (TDD - RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return response immediately on success', async () => {
    const mockResponse = new Response('OK', { status: 200 })
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    const result = await fetchWithExponentialBackoff('https://test.com')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(200)
  })

  it('should retry with 2 second delay after first 429', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock200)

    const startTime = Date.now()
    const promise = fetchWithExponentialBackoff('https://test.com')

    // Fast-forward time by 2 seconds
    await jest.advanceTimersByTimeAsync(2000)

    const result = await promise
    const elapsed = Date.now() - startTime

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(elapsed).toBeGreaterThanOrEqual(2000)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })

  it('should retry with 4 second delay after second 429', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock200)

    const promise = fetchWithExponentialBackoff('https://test.com')

    // First retry after 2s
    await jest.advanceTimersByTimeAsync(2000)

    // Second retry after 4s
    await jest.advanceTimersByTimeAsync(4000)

    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })

  it('should retry with 8 second delay after third 429', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock200)

    const promise = fetchWithExponentialBackoff('https://test.com')

    // First retry after 2s
    await jest.advanceTimersByTimeAsync(2000)

    // Second retry after 4s
    await jest.advanceTimersByTimeAsync(4000)

    // Third retry after 8s
    await jest.advanceTimersByTimeAsync(8000)

    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(4)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })

  it('should fail after 3 retries with clear error message', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })

    ;(global.fetch as jest.Mock).mockResolvedValue(mock429)

    // Start the promise and immediately set up rejection expectation
    const promise = expect(fetchWithExponentialBackoff('https://test.com')).rejects.toThrow('Rate limit exceeded, try again later')

    // Advance through all retries
    await jest.advanceTimersByTimeAsync(2000) // First retry
    await jest.advanceTimersByTimeAsync(4000) // Second retry
    await jest.advanceTimersByTimeAsync(8000) // Third retry

    // Wait for rejection to complete
    await promise

    expect(global.fetch).toHaveBeenCalledTimes(4) // Initial + 3 retries

    jest.useRealTimers()
  })

  it('should respect Retry-After header when present', async () => {
    jest.useFakeTimers()

    const mock429WithHeader = new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '10' }
    })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429WithHeader)
      .mockResolvedValueOnce(mock200)

    const promise = fetchWithExponentialBackoff('https://test.com')

    // Should wait 10 seconds (from Retry-After header)
    await jest.advanceTimersByTimeAsync(10000)

    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })

  it('should use exponential backoff when Retry-After header is missing', async () => {
    jest.useFakeTimers()

    const mock429NoHeader = new Response('Too Many Requests', { status: 429 })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429NoHeader)
      .mockResolvedValueOnce(mock429NoHeader)
      .mockResolvedValueOnce(mock200)

    const promise = fetchWithExponentialBackoff('https://test.com')

    // Should use exponential backoff: 2s, then 4s
    await jest.advanceTimersByTimeAsync(2000)
    await jest.advanceTimersByTimeAsync(4000)

    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })

  it('should handle non-429 errors immediately without retry', async () => {
    const mock500 = new Response('Internal Server Error', { status: 500 })
    ;(global.fetch as jest.Mock).mockResolvedValue(mock500)

    const result = await fetchWithExponentialBackoff('https://test.com')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(500)
  })

  it('should allow custom max retries', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })
    ;(global.fetch as jest.Mock).mockResolvedValue(mock429)

    // Start the promise and immediately set up rejection expectation
    const promise = expect(fetchWithExponentialBackoff('https://test.com', 5)).rejects.toThrow('Rate limit exceeded, try again later')

    // Advance through 5 retries (using async version)
    await jest.advanceTimersByTimeAsync(2000)
    await jest.advanceTimersByTimeAsync(4000)
    await jest.advanceTimersByTimeAsync(8000)
    await jest.advanceTimersByTimeAsync(16000)
    await jest.advanceTimersByTimeAsync(32000)

    // Wait for rejection to complete
    await promise

    expect(global.fetch).toHaveBeenCalledTimes(6) // Initial + 5 retries

    jest.useRealTimers()
  })

  it('should allow custom base delay', async () => {
    jest.useFakeTimers()

    const mock429 = new Response('Too Many Requests', { status: 429 })
    const mock200 = new Response('OK', { status: 200 })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mock200)

    const promise = fetchWithExponentialBackoff('https://test.com', 3, 1000)

    // Should wait 1 second (custom base delay)
    await jest.advanceTimersByTimeAsync(1000)

    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)

    jest.useRealTimers()
  })
})
