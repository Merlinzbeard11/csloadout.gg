import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { CommandPalette } from "@/components/command-palette"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "CSLoadout.gg - CS2 Item Encyclopedia & Trading Helper",
  description:
    "Search faster. Trade smarter. Real-time market snapshots, float & pattern analytics, and a dual-mode 3D viewer.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          {children}
          <CommandPalette />
          <Toaster />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
