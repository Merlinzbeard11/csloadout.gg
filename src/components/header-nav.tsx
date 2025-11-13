"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search, User, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function HeaderNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  const navItems = [
    { label: "Browse Items", href: "/items" },
    { label: "Collections", href: "/collections" },
    { label: "Loadouts", href: "/loadouts" },
    { label: "Inventory", href: "/inventory" },
  ]

  return (
    <header className="sticky top-0 z-50 bg-cs2-dark border-b border-cs2-blue/20 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-cs2-light hover:text-white transition-colors">
            <ShoppingBag className="h-6 w-6 text-cs2-orange" />
            <span>csloadout<span className="text-cs2-orange">.gg</span></span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-cs2-blue text-white"
                    : "text-cs2-light hover:bg-cs2-blue/10 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-cs2-light hover:text-white hover:bg-cs2-blue/10"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* User/Auth */}
            <Link href="/auth/signin">
              <Button
                variant="ghost"
                size="icon"
                className="text-cs2-light hover:text-white hover:bg-cs2-blue/10"
                aria-label="Sign in"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-cs2-light hover:text-white hover:bg-cs2-blue/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-cs2-blue/20">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-cs2-blue text-white"
                      : "text-cs2-light hover:bg-cs2-blue/10 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
