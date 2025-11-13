import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  query?: string
}

export function Pagination({ currentPage, totalPages, query }: PaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (page > 1) params.set("page", page.toString())
    const queryString = params.toString()
    return `/items${queryString ? `?${queryString}` : ""}`
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="bg-cs2-dark border border-cs2-blue/20 hover:border-cs2-blue/50 text-cs2-light px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <button
          disabled
          className="bg-cs2-dark/50 border border-cs2-blue/10 text-cs2-light/30 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-cs2-light/50">
                ...
              </span>
            )
          }

          const pageNumber = page as number
          const isCurrentPage = pageNumber === currentPage

          return isCurrentPage ? (
            <div
              key={pageNumber}
              className="bg-cs2-blue text-white px-4 py-2 rounded-lg font-semibold min-w-[2.5rem] text-center"
            >
              {pageNumber}
            </div>
          ) : (
            <Link
              key={pageNumber}
              href={buildUrl(pageNumber)}
              className="bg-cs2-dark border border-cs2-blue/20 hover:border-cs2-blue/50 text-cs2-light px-4 py-2 rounded-lg transition-colors min-w-[2.5rem] text-center"
            >
              {pageNumber}
            </Link>
          )
        })}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="bg-cs2-dark border border-cs2-blue/20 hover:border-cs2-blue/50 text-cs2-light px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <button
          disabled
          className="bg-cs2-dark/50 border border-cs2-blue/10 text-cs2-light/30 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
