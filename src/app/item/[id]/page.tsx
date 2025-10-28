import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { ItemDetail } from "@/components/item-detail"
import { getItemById } from "@/lib/items"
import { getItemWithPrices } from "@/lib/api-client"
import { notFound } from "next/navigation"

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Get item metadata from our items database
  const itemMetadata = getItemById(id)

  if (!itemMetadata) {
    notFound()
  }

  // Fetch live prices from API and merge with metadata
  const item = await getItemWithPrices(itemMetadata)

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <ItemDetail item={item} />
      </main>
      <Footer />
    </div>
  )
}
