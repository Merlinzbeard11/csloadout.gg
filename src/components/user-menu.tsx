"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, Package, Crosshair, Bell, LogOut } from "lucide-react"

interface UserMenuProps {
  personaName: string
  avatar: string
  steamId: string
}

export function UserMenu({ personaName, avatar, steamId }: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      const data = await response.json()
      if (data.success && data.redirectTo) {
        window.location.href = data.redirectTo
      }
    } catch (error) {
      console.error('Sign out failed:', error)
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => setOpen(!open)}
        >
          <Image
            src={avatar}
            alt={personaName}
            width={32}
            height={32}
            className="rounded-full"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground z-50">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{personaName}</p>
          <p className="text-xs text-muted-foreground">Steam ID: {steamId}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/inventory" className="flex items-center cursor-pointer">
            <Package className="mr-2 h-4 w-4" />
            <span>Inventory</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/loadouts" className="flex items-center cursor-pointer">
            <Crosshair className="mr-2 h-4 w-4" />
            <span>My Loadouts</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/alerts" className="flex items-center cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>Price Alerts</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
