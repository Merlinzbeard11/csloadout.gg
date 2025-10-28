"use client"

import { useState, useEffect } from "react"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Download, Upload, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { PortfolioEntry } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([])
  const [summary, setSummary] = useState({
    total_value: 0,
    total_cost: 0,
    profit_loss: 0,
    profit_loss_percent: "0.00",
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPortfolio = async () => {
      const response = await fetch("/api/portfolio")
      const data = await response.json()
      setPortfolio(data.entries)
      setSummary(data.summary)
      setLoading(false)
    }
    fetchPortfolio()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" })
    setPortfolio(portfolio.filter((entry) => entry.id !== id))
    toast({
      title: "Entry Deleted",
      description: `${name} has been removed from your portfolio.`,
    })
  }

  const mockChartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: summary.total_cost + (summary.profit_loss / 30) * i + Math.random() * 100,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
              <p className="text-muted-foreground">Track your inventory value and profit/loss</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">${summary.total_value.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">${summary.total_cost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card
              className={
                Number.parseFloat(summary.profit_loss_percent) >= 0
                  ? "border-primary/20 bg-primary/5"
                  : "border-destructive/20 bg-destructive/5"
              }
            >
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold font-mono ${Number.parseFloat(summary.profit_loss_percent) >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  ${summary.profit_loss.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card
              className={
                Number.parseFloat(summary.profit_loss_percent) >= 0
                  ? "border-primary/20 bg-primary/5"
                  : "border-destructive/20 bg-destructive/5"
              }
            >
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {Number.parseFloat(summary.profit_loss_percent) >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-primary" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                  <p
                    className={`text-3xl font-bold ${Number.parseFloat(summary.profit_loss_percent) >= 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {summary.profit_loss_percent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Value Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Portfolio Value Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockChartData}>
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, "Value"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Portfolio Table */}
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {portfolio.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-xl font-semibold mb-2">No entries yet</p>
                  <p className="text-muted-foreground mb-6">Add items to track your inventory value</p>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Entry
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-96">Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Buy Price</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((entry) => {
                      const totalCost = entry.buy_price * entry.quantity
                      const totalValue = entry.current_price * entry.quantity
                      const profitLoss = totalValue - totalCost
                      const profitLossPercent = ((profitLoss / totalCost) * 100).toFixed(2)

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={entry.item_image || "/placeholder.svg"}
                                alt={entry.item_name}
                                className="w-16 h-16 rounded object-cover"
                              />
                              <div>
                                <p className="font-semibold">{entry.item_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Bought {new Date(entry.buy_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{entry.quantity}</TableCell>
                          <TableCell className="text-right font-mono">${entry.buy_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${entry.current_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ${totalValue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={profitLoss >= 0 ? "text-primary" : "text-destructive"}>
                              <p className="font-mono font-semibold">${profitLoss.toLocaleString()}</p>
                              <p className="text-xs">{profitLossPercent}%</p>
                            </div>
                          </TableCell>
                          <TableCell>{entry.marketplace}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id, entry.item_name)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
