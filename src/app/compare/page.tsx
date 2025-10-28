"use client"

import { Suspense, useState } from "react"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X } from "lucide-react"
import { mockItems } from "@/lib/mock-data"
import Link from "next/link"

function ComparePageContent() {
  const [selectedItems, setSelectedItems] = useState(mockItems.slice(0, 3))

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Compare Items</h1>
            <p className="text-muted-foreground">Side-by-side comparison of up to 4 items</p>
          </div>

          {selectedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-xl font-semibold mb-2">No items to compare</p>
                <p className="text-muted-foreground mb-6">Add items from search results to start comparing</p>
                <Button asChild>
                  <Link href="/search">Browse Items</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Item Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {selectedItems.map((item) => (
                  <Card key={item.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader className="pb-4">
                      <div className="aspect-square rounded-md overflow-hidden bg-muted mb-4">
                        <img
                          src={item.images.thumb || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {item.rarity}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold font-mono">${item.markets[0].price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{item.markets[0].name}</p>
                    </CardContent>
                  </Card>
                ))}
                {selectedItems.length < 4 && (
                  <Card className="border-dashed flex items-center justify-center">
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Add another item</p>
                      <Button variant="outline" asChild>
                        <Link href="/search">Browse</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Attribute</TableHead>
                          {selectedItems.map((item) => (
                            <TableHead key={item.id} className="text-center">
                              {item.name.split("|")[0].trim()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold">Rarity</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center">
                              <Badge variant="outline">{item.rarity}</Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Lowest Price</TableCell>
                          {selectedItems.map((item) => {
                            const lowestPrice = Math.min(...item.markets.map((m) => m.price))
                            return (
                              <TableCell key={item.id} className="text-center font-mono font-semibold">
                                ${lowestPrice.toLocaleString()}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Float Range</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center font-mono">
                              {item.float_min?.toFixed(2)} - {item.float_max?.toFixed(2)}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Collection</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center text-sm">
                              {item.collection}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Release Year</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center">
                              {item.release_year}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Rare Patterns</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center">
                              {item.known_rare_patterns ? item.known_rare_patterns.length : "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Popularity</TableCell>
                          {selectedItems.map((item) => (
                            <TableCell key={item.id} className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${item.popularity * 100}%` }} />
                                </div>
                                <span className="text-xs">{(item.popularity * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Market Comparison */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Market Prices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Market</TableHead>
                          {selectedItems.map((item) => (
                            <TableHead key={item.id} className="text-center">
                              {item.name.split("|")[0].trim()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["Steam", "Buff", "DMarket", "Skinport"].map((marketName) => (
                          <TableRow key={marketName}>
                            <TableCell className="font-semibold">{marketName}</TableCell>
                            {selectedItems.map((item) => {
                              const market = item.markets.find((m) => m.name === marketName)
                              return (
                                <TableCell key={item.id} className="text-center font-mono">
                                  {market ? `$${market.price.toLocaleString()}` : "—"}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageContent />
    </Suspense>
  )
}
