"use client"

import Link from "next/link"
import { Search, Bell, Bookmark, Wallet, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export function NavHeader() {
  const [currency, setCurrency] = useState<"USD" | "BTC" | "ETH" | "USDC">("USD")

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="font-mono text-lg font-bold text-primary-foreground">CS</span>
          </div>
          <span className="text-xl font-bold">
            CSLoadout<span className="text-primary">.gg</span>
          </span>
        </Link>

        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items, collections, patterns... (⌘K)"
              className="pl-10 bg-muted/50"
              onFocus={(e) => {
                e.preventDefault()
                e.target.blur()
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <span className="font-mono">{currency}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Currency</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrency("USD")}>USD ($)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("BTC")}>BTC (₿)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("ETH")}>ETH (Ξ)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("USDC")}>USDC</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/watchlist">
              <Bookmark className="h-5 w-5" />
              <span className="sr-only">Watchlist</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/alerts">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                3
              </Badge>
              <span className="sr-only">Alerts</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/portfolio">
              <Wallet className="h-5 w-5" />
              <span className="sr-only">Portfolio</span>
            </Link>
          </Button>

          <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
            <Link href="/auth">
              <User className="h-4 w-4" />
              Sign in with Steam
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
