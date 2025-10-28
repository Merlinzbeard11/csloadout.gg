"use client"

import { useState, Suspense } from "react"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { SearchFilters } from "@/components/search-filters"
import { SearchResults } from "@/components/search-results"
import { SearchSkeleton } from "@/components/search-skeleton"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"
import { useSearchParams } from "next/navigation"

function SearchPageContent() {
  const searchParams = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    query: searchParams.get("q") || "",
    type: searchParams.get("type") || "",
    rarity: searchParams.get("rarity") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minFloat: searchParams.get("minFloat") || "",
    maxFloat: searchParams.get("maxFloat") || "",
    weapon: searchParams.get("weapon") || "",
    weaponCategory: searchParams.get("weapon_category") || "",
    containerType: searchParams.get("container_type") || "",
    collection: searchParams.get("collection") || "",
  })

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24">
                <SearchFilters filters={filters} onFiltersChange={setFilters} />
              </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-4 right-4 z-40">
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button size="lg" className="rounded-full shadow-lg gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                  <SearchFilters filters={filters} onFiltersChange={setFilters} />
                </SheetContent>
              </Sheet>
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <Suspense fallback={<SearchSkeleton />}>
                <SearchResults filters={filters} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchPageContent />
    </Suspense>
  )
}
