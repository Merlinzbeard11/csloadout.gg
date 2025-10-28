"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Search, TrendingUp, Bookmark, Bell, Wallet } from "lucide-react"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search items, collections, patterns..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              router.push("/search")
              setOpen(false)
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search Items</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push("/watchlist")
              setOpen(false)
            }}
          >
            <Bookmark className="mr-2 h-4 w-4" />
            <span>Watchlist</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push("/alerts")
              setOpen(false)
            }}
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Alerts</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push("/portfolio")
              setOpen(false)
            }}
          >
            <Wallet className="mr-2 h-4 w-4" />
            <span>Portfolio</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Trending">
          <CommandItem
            onSelect={() => {
              router.push("/item/ak-47-case-hardened")
              setOpen(false)
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            <span>AK-47 | Case Hardened</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              router.push("/item/m4a4-howl")
              setOpen(false)
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            <span>M4A4 | Howl</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
