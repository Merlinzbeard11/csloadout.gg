import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { ItemDetail } from "@/components/item-detail"
import { mockItems } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = mockItems.find((i) => i.id === id)

  if (!item) {
    notFound()
  }

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
