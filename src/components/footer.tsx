import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="container px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-bold mb-4">CSLoadout.gg</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The pro encyclopedia for CS2 items. Search faster, trade smarter.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/price-dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Price Dashboard
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-muted-foreground hover:text-foreground transition-colors">
                  Compare
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/watchlist" className="text-muted-foreground hover:text-foreground transition-colors">
                  Watchlist
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="text-muted-foreground hover:text-foreground transition-colors">
                  Alerts
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-muted-foreground hover:text-foreground transition-colors">
                  Portfolio
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclosures" className="text-muted-foreground hover:text-foreground transition-colors">
                  Disclosures
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>Not affiliated with Valve Corporation. CS2 and Counter-Strike are trademarks of Valve Corporation.</p>
          <p className="mt-2 font-semibold">No gambling. Trading tools only.</p>
          <p className="mt-4">© 2025 CSLoadout.gg. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
