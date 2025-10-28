import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function DisclosuresPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Disclosures</h1>

          <Alert className="mb-8 border-secondary/50 bg-secondary/10">
            <AlertTriangle className="h-5 w-5 text-secondary" />
            <AlertTitle>Important Notice</AlertTitle>
            <AlertDescription>
              CSLoadout.gg is an independent trading tool and is not affiliated with, endorsed by, or sponsored by Valve
              Corporation.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="prose prose-invert max-w-none pt-6">
              <h2>No Gambling Policy</h2>
              <p className="font-semibold text-lg">
                CSLoadout.gg is strictly a trading encyclopedia and market analysis tool. We do not offer, facilitate,
                or promote any form of gambling.
              </p>
              <p>Our platform provides:</p>
              <ul>
                <li>Market price data and historical trends</li>
                <li>Item information and pattern databases</li>
                <li>Trading tools and portfolio tracking</li>
                <li>Price alerts and watchlists</li>
              </ul>
              <p>We do NOT provide:</p>
              <ul>
                <li>Case opening or unboxing services</li>
                <li>Betting or wagering of any kind</li>
                <li>Loot boxes or randomized rewards</li>
                <li>Any games of chance</li>
              </ul>

              <h2>Trademark Notice</h2>
              <p>
                Counter-Strike, CS2, CS:GO, Steam, and all related logos and designs are trademarks or registered
                trademarks of Valve Corporation. All item names, images, and related content are property of their
                respective owners.
              </p>

              <h2>Data Sources</h2>
              <p>
                Price data is aggregated from publicly available marketplace APIs and community sources. We make no
                guarantees about the accuracy, completeness, or timeliness of this data. Always verify prices on the
                actual marketplace before making trading decisions.
              </p>

              <h2>No Financial Advice</h2>
              <p>
                CSLoadout.gg provides informational tools only. Nothing on this site constitutes financial, investment,
                or trading advice. Users are responsible for their own trading decisions and should conduct their own
                research.
              </p>

              <h2>Age Restrictions</h2>
              <p>
                Users must be at least 13 years old to use CSLoadout.gg. Users under 18 should have parental permission
                before using trading features.
              </p>

              <h2>Third-Party Services</h2>
              <p>
                CSLoadout.gg integrates with third-party marketplaces and services. We are not responsible for the
                policies, practices, or content of these external services.
              </p>

              <h2>Contact</h2>
              <p>
                For questions about these disclosures or our policies, please contact us at legal@csloadout.gg or
                support@csloadout.gg
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
