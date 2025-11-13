"use client"

import type { BudgetRange, SortOption } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FiltersProps {
  budgetFilter: BudgetRange
  sortBy: SortOption
  onBudgetChange: (budget: BudgetRange) => void
  onSortChange: (sort: SortOption) => void
}

export function Filters({ budgetFilter, sortBy, onBudgetChange, onSortChange }: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Budget Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-cs2-light/80">Budget:</span>
        <Select value={budgetFilter} onValueChange={(value) => onBudgetChange(value as BudgetRange)}>
          <SelectTrigger className="w-[180px] bg-cs2-dark border-cs2-blue/20 text-cs2-light">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-cs2-dark border-cs2-blue/20">
            <SelectItem value="all" className="text-cs2-light">
              All Budgets
            </SelectItem>
            <SelectItem value="under-50" className="text-cs2-light">
              Under $50
            </SelectItem>
            <SelectItem value="50-200" className="text-cs2-light">
              $50 - $200
            </SelectItem>
            <SelectItem value="200-500" className="text-cs2-light">
              $200 - $500
            </SelectItem>
            <SelectItem value="500-plus" className="text-cs2-light">
              $500+
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-cs2-light/80">Sort:</span>
        <div className="flex gap-1">
          <Button
            variant={sortBy === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("newest")}
            className={
              sortBy === "newest"
                ? "bg-cs2-blue hover:bg-cs2-blue/80 text-white"
                : "bg-transparent border-cs2-blue/20 text-cs2-light/80 hover:bg-cs2-dark hover:text-cs2-light"
            }
          >
            Newest
          </Button>
          <Button
            variant={sortBy === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("popular")}
            className={
              sortBy === "popular"
                ? "bg-cs2-blue hover:bg-cs2-blue/80 text-white"
                : "bg-transparent border-cs2-blue/20 text-cs2-light/80 hover:bg-cs2-dark hover:text-cs2-light"
            }
          >
            Most Popular
          </Button>
          <Button
            variant={sortBy === "upvotes" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("upvotes")}
            className={
              sortBy === "upvotes"
                ? "bg-cs2-blue hover:bg-cs2-blue/80 text-white"
                : "bg-transparent border-cs2-blue/20 text-cs2-light/80 hover:bg-cs2-dark hover:text-cs2-light"
            }
          >
            Most Upvotes
          </Button>
        </div>
      </div>
    </div>
  )
}
