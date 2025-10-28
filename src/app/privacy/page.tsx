import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <Card>
            <CardContent className="prose prose-invert max-w-none pt-6">
              <h2>Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, use our services,
                or communicate with us.
              </p>

              <h2>How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
              </ul>

              <h2>Information Sharing</h2>
              <p>
                We do not share your personal information with third parties except as described in this policy or with
                your consent.
              </p>

              <h2>Data Security</h2>
              <p>
                We take reasonable measures to help protect your personal information from loss, theft, misuse, and
                unauthorized access.
              </p>

              <h2>Cookies</h2>
              <p>
                We use cookies and similar tracking technologies to collect and use personal information about you. You
                can control cookies through your browser settings.
              </p>

              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
              </ul>

              <h2>Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at privacy@csloadout.gg</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
