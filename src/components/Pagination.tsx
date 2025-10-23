'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Generate page numbers with truncation for many pages
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Pattern: [1, ..., 4, 5, 6, ..., last]
    const pages: (number | 'ellipsis')[] = [1];

    if (currentPage <= 3) {
      // Near start: [1, 2, 3, 4, ..., last]
      pages.push(2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near end: [1, ..., last-3, last-2, last-1, last]
      pages.push('ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Middle: [1, ..., current-1, current, current+1, ..., last]
      pages.push('ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex justify-center items-center gap-2 mt-8" aria-label="Pagination Navigation">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all
          ${currentPage === 1
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }
        `}
        aria-label="Previous page"
      >
        Previous
      </button>

      {/* Page Numbers */}
      <div className="flex gap-2">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-gray-500"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${page === currentPage
                  ? 'bg-csgo-orange text-white font-bold shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }
              `}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all
          ${currentPage === totalPages
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }
        `}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
