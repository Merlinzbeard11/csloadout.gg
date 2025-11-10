'use client'

/**
 * Pagination Client Component
 *
 * BDD Phase 7c: features/08-budget-loadout-builder-phase7.feature (lines 154-160)
 *
 * Displays pagination controls for loadout gallery:
 * - Previous/Next buttons
 * - Page numbers
 * - Preserves search params (filters, sort)
 */

import Link from 'next/link'

interface PaginationProps {
  currentPage: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}

export function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  const buildPageUrl = (page: number): string => {
    const params = new URLSearchParams()

    // Preserve existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && value) {
        params.set(key, value)
      }
    })

    // Set new page
    if (page > 1) {
      params.set('page', page.toString())
    }

    const queryString = params.toString()
    return `/loadouts${queryString ? `?${queryString}` : ''}`
  }

  // Generate page numbers to display
  const pageNumbers: (number | '...')[] = []

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Show: 1 ... current-1 current current+1 ... totalPages
    pageNumbers.push(1)

    if (currentPage > 3) {
      pageNumbers.push('...')
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
      pageNumbers.push(i)
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push('...')
    }

    pageNumbers.push(totalPages)
  }

  return (
    <nav
      className="flex items-center justify-center gap-2"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Previous
        </Link>
      ) : (
        <span className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed">
          Previous
        </span>
      )}

      {/* Page Numbers */}
      {pageNumbers.map((pageNum, index) =>
        pageNum === '...' ? (
          <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
            ...
          </span>
        ) : (
          <Link
            key={pageNum}
            href={buildPageUrl(pageNum)}
            className={`
              px-4 py-2 border rounded-md text-sm font-medium
              ${
                pageNum === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-current={pageNum === currentPage ? 'page' : undefined}
          >
            {pageNum}
          </Link>
        )
      )}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Next
        </Link>
      ) : (
        <span className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed">
          Next
        </span>
      )}
    </nav>
  )
}
