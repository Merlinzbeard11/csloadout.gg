import type { Metadata } from "next";
import "./globals.css";
import { HeaderNav } from "@/components/header-nav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "csloadout.gg - CS2 Item Database & Price Comparison",
  description: "Browse 7,000+ CS2 items and compare prices across marketplaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-cs2-dark text-cs2-light">
        <HeaderNav />
        <main className="flex-1">{children}</main>

        {/* Legal compliance footer - BDD requirement from features/01-item-database.feature:82-87 */}
        <footer className="bg-cs2-dark border-t border-cs2-blue/20 py-6 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-gray-400 space-y-2">
            <p>csloadout.gg is not affiliated with Valve Corporation</p>
            <p>CS2, Counter-Strike, Steam trademarks are property of Valve</p>
            <p>Prices are estimates</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
