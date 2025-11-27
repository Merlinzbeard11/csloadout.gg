"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

interface SearchBoxProps {
  defaultValue?: string
}

export function SearchBox({ defaultValue = "" }: SearchBoxProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)
  const initialQuery = useRef(defaultValue)

  useEffect(() => {
    // Only navigate if query actually changed from initial value
    if (query === initialQuery.current) {
      return
    }

    const timer = setTimeout(() => {
      // Build URL with just the search query, reset to page 1
      const params = new URLSearchParams()
      if (query) {
        params.set("q", query)
      }
      const queryString = params.toString()
      router.push(`/items${queryString ? `?${queryString}` : ""}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, router])

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
