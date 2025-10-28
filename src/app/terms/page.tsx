import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <Card>
            <CardContent className="prose prose-invert max-w-none pt-6">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using CSLoadout.gg, you accept and agree to be bound by the terms and provision of this
                agreement.
              </p>

              <h2>2. Use License</h2>
              <p>
                Permission is granted to temporarily access the materials on CSLoadout.gg for personal, non-commercial
                transitory viewing only.
              </p>

              <h2>3. Disclaimer</h2>
              <p>
                The materials on CSLoadout.gg are provided on an 'as is' basis. CSLoadout.gg makes no warranties,
                expressed or implied, and hereby disclaims and negates all other warranties including, without
                limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or
                non-infringement of intellectual property or other violation of rights.
              </p>

              <h2>4. Limitations</h2>
              <p>
                In no event shall CSLoadout.gg or its suppliers be liable for any damages (including, without
                limitation, damages for loss of data or profit, or due to business interruption) arising out of the use
                or inability to use the materials on CSLoadout.gg.
              </p>

              <h2>5. Accuracy of Materials</h2>
              <p>
                The materials appearing on CSLoadout.gg could include technical, typographical, or photographic errors.
                CSLoadout.gg does not warrant that any of the materials on its website are accurate, complete or
                current.
              </p>

              <h2>6. Links</h2>
              <p>
                CSLoadout.gg has not reviewed all of the sites linked to its website and is not responsible for the
                contents of any such linked site.
              </p>

              <h2>7. Modifications</h2>
              <p>
                CSLoadout.gg may revise these terms of service for its website at any time without notice. By using this
                website you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
