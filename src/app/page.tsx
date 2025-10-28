import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Search, Bell, Bookmark, Wallet, ArrowRight } from "lucide-react"
import Link from "next/link"
import { mockSearchResults } from "@/lib/mock-data"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
          <div className="container px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20" variant="outline">
                Real-time market snapshots
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 text-balance">
                The pro encyclopedia for CS2 items
              </h1>
              <p className="text-xl text-muted-foreground mb-8 text-pretty leading-relaxed">
                Search faster. Trade smarter. Real-time market snapshots, float & pattern analytics, and a dual-mode 3D
                viewer.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <Link href="/search">
                    <Search className="h-5 w-5" />
                    Start Searching
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2 bg-transparent">
                  <Link href="/price-dashboard">
                    View Price Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Items */}
        <section className="container px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Trending Items</h2>
              <p className="text-muted-foreground">Top movers in the last 7 days</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/search">View All</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockSearchResults.map((item) => (
              <Link key={item.id} href={`/item/${item.id}`}>
                <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                  <CardHeader className="pb-4">
                    <div className="aspect-[2/1] rounded-md overflow-hidden bg-muted mb-4">
                      <img
                        src={item.images.thumb || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                      <Badge variant="outline" className="shrink-0">
                        {item.rarity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold font-mono">${item.best_price.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.best_price.market}</p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 text-sm font-semibold ${item.delta_7d.startsWith("+") ? "text-primary" : "text-destructive"}`}
                        >
                          {item.delta_7d.startsWith("+") ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {item.delta_7d}
                        </div>
                        <p className="text-xs text-muted-foreground">7d change</p>
                      </div>
                    </div>
                    {item.lowest_float && (
                      <div className="mt-4 pt-4 border-t border-border/40">
                        <p className="text-xs text-muted-foreground">
                          Lowest float: <span className="font-mono text-foreground">{item.lowest_float}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Curated Filters */}
        <section className="border-y border-border/40 bg-muted/20">
          <div className="container px-4 py-16">
            <h2 className="text-3xl font-bold mb-8">Quick Filters</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/search?filter=budget-dopplers">
                <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Budget Dopplers
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription>Doppler skins under $150</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/search?filter=low-float">
                <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Low Float Bangers
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription>Items with ≤0.02 float value</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/search?filter=katowice-2014">
                <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Katowice 2014
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription>Legendary tournament stickers</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="container px-4 py-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Your Trading Toolkit</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <Bookmark className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Watchlist</CardTitle>
                <CardDescription>Track your favorite items and get notified of price changes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/watchlist">View Watchlist</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader>
                <Bell className="h-10 w-10 text-secondary mb-4" />
                <CardTitle>Price Alerts</CardTitle>
                <CardDescription>Set custom alerts for price drops, float values, and rare patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/alerts">Manage Alerts</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <Wallet className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Portfolio</CardTitle>
                <CardDescription>Track your inventory value and profit/loss over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/portfolio">View Portfolio</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader>
                <Search className="h-10 w-10 text-secondary mb-4" />
                <CardTitle>Advanced Search</CardTitle>
                <CardDescription>Filter by float, pattern, wear, and 10+ marketplaces</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/search">Start Searching</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
