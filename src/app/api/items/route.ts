import { NextRequest, NextResponse } from "next/server"
import { getAllItems, searchItems, itemToSearchResult } from "@/lib/items"

/**
 * GET /api/items
 * Search and filter CS2 items
 * Query params: q, type, rarity, minPrice, maxPrice, weapon, collection
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams

  const query = searchParams.get("q") || ""
  const type = searchParams.get("type") || ""
  const rarity = searchParams.get("rarity") || ""
  const weapon = searchParams.get("weapon") || ""
  const weaponCategory = searchParams.get("weapon_category") || searchParams.get("category") || ""
  const containerType = searchParams.get("container_type") || ""
  const collection = searchParams.get("collection") || ""
  const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : null
  const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : null

  // Pagination parameters
  const DEFAULT_LIMIT = 100
  const MAX_LIMIT = 1000
  const limit = searchParams.get("limit")
    ? Math.min(parseInt(searchParams.get("limit")!), MAX_LIMIT)
    : DEFAULT_LIMIT
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
  const offset = (page - 1) * limit

  try {
    // Start with all items or search results
    let items = query ? searchItems(query) : getAllItems()

    // Apply filters
    if (type) {
      items = items.filter(item => item.type === type)
    }

    if (rarity) {
      items = items.filter(item => item.rarity === rarity)
    }

    if (weapon) {
      items = items.filter(item => item.weapon === weapon)
    }

    if (weaponCategory) {
      items = items.filter(item => item.weapon_category === weaponCategory)
    }

    if (containerType) {
      items = items.filter(item => item.container_type === containerType)
    }

    if (collection) {
      items = items.filter(item => item.collection === collection)
    }

    // Get total count before pagination
    const totalItems = items.length

    // Apply pagination
    const paginatedItems = items.slice(offset, offset + limit)

    // Convert to search result format
    const results = paginatedItems.map(item => itemToSearchResult(item))

    // Apply price filters (if we had real prices)
    // For now, we'll skip price filtering since itemToSearchResult returns placeholder prices

    const queryTime = Date.now() - startTime

    return NextResponse.json({
      results,
      query_time_ms: queryTime,
      total: totalItems,
      page,
      limit,
      total_pages: Math.ceil(totalItems / limit),
      filters: {
        query,
        type,
        rarity,
        weapon,
        weapon_category: weaponCategory,
        container_type: containerType,
        collection,
      },
    })
  } catch (error) {
    console.error("Error fetching items:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch items",
        results: [],
        query_time_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
