"use client"

import { useState } from "react"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown } from "lucide-react"
import { mockItems } from "@/lib/mock-data"

export default function PriceDashboardPage() {
  const [timeRange, setTimeRange] = useState("24h")
  const markets = ["Steam", "Buff", "DMarket", "Skinport", "CSFloat"]

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Price Dashboard</h1>
            <p className="text-muted-foreground">Multi-market price comparison and arbitrage opportunities</p>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6">
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="1h">1h</TabsTrigger>
                <TabsTrigger value="24h">24h</TabsTrigger>
                <TabsTrigger value="7d">7d</TabsTrigger>
                <TabsTrigger value="30d">30d</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Top Movers */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Gainer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-1">AK-47 | Case Hardened</p>
                <p className="text-2xl font-bold text-primary">+8.3%</p>
                <p className="text-sm text-muted-foreground">Last 24h</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Top Loser
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-1">Glock-18 | Fade</p>
                <p className="text-2xl font-bold text-destructive">-2.1%</p>
                <p className="text-sm text-muted-foreground">Last 24h</p>
              </CardContent>
            </Card>
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader>
                <CardTitle className="text-base">Arbitrage Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-secondary">12</p>
                <p className="text-sm text-muted-foreground">Spread &gt; 5%</p>
              </CardContent>
            </Card>
          </div>

          {/* Price Spread Table */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Market Price Spread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-64">Item</TableHead>
                      {markets.map((market) => (
                        <TableHead key={market} className="text-center">
                          {market}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Spread</TableHead>
                      <TableHead className="text-center">Opportunity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockItems.map((item) => {
                      const prices = markets.map((marketName) => {
                        const market = item.markets.find((m) => m.name === marketName)
                        return market ? market.price : null
                      })
                      const validPrices = prices.filter((p) => p !== null) as number[]
                      const minPrice = Math.min(...validPrices)
                      const maxPrice = Math.max(...validPrices)
                      const spread = ((maxPrice - minPrice) / minPrice) * 100

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={item.images.thumb || "/placeholder.svg"}
                                alt={item.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div>
                                <p className="font-semibold text-sm">{item.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {item.rarity}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          {prices.map((price, index) => (
                            <TableCell key={markets[index]} className="text-center font-mono">
                              {price ? (
                                <span className={price === minPrice ? "text-primary font-semibold" : ""}>
                                  ${price.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge variant={spread > 5 ? "default" : "secondary"}>{spread.toFixed(2)}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {spread > 5 ? (
                              <Badge variant="secondary" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Potential
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Market Status */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Market Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {markets.map((market) => (
                  <div key={market} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-semibold">{market}</p>
                      <p className="text-xs text-muted-foreground">Last update: 2m ago</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Live
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
