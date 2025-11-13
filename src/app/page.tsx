import Link from "next/link"
import { Search, DollarSign, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--cs2-darker)" }}>
      <div className="container mx-auto max-w-[1200px] px-4 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center mb-24">
          <h1
            className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight"
            style={{ color: "var(--cs2-light)" }}
          >
            csloadout.gg
          </h1>
          <p
            className="text-xl md:text-2xl mb-10 max-w-3xl text-balance"
            style={{ color: "var(--cs2-light)", opacity: 0.9 }}
          >
            Find the best CS2 skin deals across 26+ marketplaces
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link href="/items">
              <Button
                size="lg"
                className="text-lg px-8 py-6 font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: "var(--cs2-orange)",
                  color: "white",
                }}
              >
                Browse Items
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 font-semibold transition-all hover:scale-105 bg-transparent"
              style={{
                backgroundColor: "var(--cs2-blue)",
                color: "white",
                borderColor: "var(--cs2-blue)",
              }}
            >
              Sign in with Steam
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="transition-all hover:shadow-xl hover:-translate-y-1 border"
            style={{
              backgroundColor: "var(--cs2-dark)",
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            <CardContent className="p-8">
              <div
                className="rounded-full w-14 h-14 flex items-center justify-center mb-6"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <Search className="w-7 h-7" style={{ color: "var(--cs2-blue)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--cs2-light)" }}>
                26+ Marketplaces
              </h3>
              <p className="leading-relaxed" style={{ color: "var(--cs2-light)", opacity: 0.8 }}>
                Compare prices from CSFloat, Buff163, Steam Market, Skinport, and more
              </p>
            </CardContent>
          </Card>

          <Card
            className="transition-all hover:shadow-xl hover:-translate-y-1 border"
            style={{
              backgroundColor: "var(--cs2-dark)",
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            <CardContent className="p-8">
              <div
                className="rounded-full w-14 h-14 flex items-center justify-center mb-6"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <DollarSign className="w-7 h-7" style={{ color: "var(--cs2-blue)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--cs2-light)" }}>
                True Cost Transparency
              </h3>
              <p className="leading-relaxed" style={{ color: "var(--cs2-light)", opacity: 0.8 }}>
                See total costs including all fees and charges
              </p>
            </CardContent>
          </Card>

          <Card
            className="transition-all hover:shadow-xl hover:-translate-y-1 border"
            style={{
              backgroundColor: "var(--cs2-dark)",
              borderColor: "rgba(59, 130, 246, 0.2)",
            }}
          >
            <CardContent className="p-8">
              <div
                className="rounded-full w-14 h-14 flex items-center justify-center mb-6"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <Zap className="w-7 h-7" style={{ color: "var(--cs2-blue)" }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--cs2-light)" }}>
                Price Alerts
              </h3>
              <p className="leading-relaxed" style={{ color: "var(--cs2-light)", opacity: 0.8 }}>
                Get notified when items drop to your target price
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
