import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import type { MarketPrice } from "@/lib/types"

interface MarketPriceTableProps {
  markets: MarketPrice[]
}

export function MarketPriceTable({ markets }: MarketPriceTableProps) {
  const sortedMarkets = [...markets].sort((a, b) => a.price - b.price)
  const lowestPrice = sortedMarkets[0].price
  const highestPrice = sortedMarkets[sortedMarkets.length - 1].price
  const spread = ((highestPrice - lowestPrice) / lowestPrice) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Spread: </span>
          <span className="font-semibold">{spread.toFixed(2)}%</span>
        </div>
        {spread > 5 && (
          <Badge variant="secondary" className="gap-1">
            Potential arbitrage opportunity
          </Badge>
        )}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Spread</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMarkets.map((market, index) => {
              const fee = market.price * 0.05
              const net = market.price - fee
              const spreadPercent = ((market.price - lowestPrice) / lowestPrice) * 100

              return (
                <TableRow key={market.name}>
                  <TableCell className="font-semibold">
                    {market.name}
                    {index === 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Lowest
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">${market.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${fee.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">${net.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {index === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-destructive">+{spreadPercent.toFixed(2)}%</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View on {market.name}</span>
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
