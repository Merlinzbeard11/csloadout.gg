"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

interface SearchBoxProps {
  defaultValue?: string
}

export function SearchBox({ defaultValue = "" }: SearchBoxProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)

  // Debounced search function
  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }

      // Reset to page 1 when searching
      params.delete("page")

      const queryString = params.toString()
      router.push(`/items${queryString ? `?${queryString}` : ""}`)
    },
    [router, searchParams],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      updateSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, updateSearch])

  const handleClear = () => {
    setQuery("")
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cs2-light/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full bg-cs2-dark border border-cs2-blue/20 rounded-lg pl-12 pr-12 py-3 text-cs2-light placeholder:text-cs2-light/40 focus:outline-none focus:border-cs2-blue/50 transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-cs2-light/50 hover:text-cs2-light transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
