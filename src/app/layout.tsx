import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS Loadout - Find the Cheapest CS2 Skins",
  description: "Compare CS2 skin prices across 26+ marketplaces and find the best deals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
