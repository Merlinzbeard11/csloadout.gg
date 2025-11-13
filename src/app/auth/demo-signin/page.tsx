"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Check, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

function SignInContent() {
  const searchParams = useSearchParams()
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setShowError(true)
    }
  }, [searchParams])

  const handleSteamSignIn = () => {
    // Redirect to Steam authentication endpoint
    window.location.href = "/api/auth/steam"
  }

  return (
    <div className="min-h-screen bg-cs2-darker flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[500px]">
        {/* Error Alert */}
        {showError && (
          <Alert className="mb-6 bg-red-950/50 border-red-500/50 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Authentication failed. Please try again.</span>
              <button onClick={() => setShowError(false)} className="hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Sign-in Card */}
        <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-cs2-light mb-2">Sign in to csloadout.gg</h1>
            <p className="text-cs2-light/70 text-sm">Access price alerts, inventory import, and loadout builder</p>
          </div>

          {/* Steam Sign-in Button */}
          <button
            onClick={handleSteamSignIn}
            className="w-full h-14 bg-[#171a21] hover:bg-[#1f2329] transition-colors rounded-lg flex items-center justify-center gap-3 mb-8"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49l2.91-4.37a3.008 3.008 0 0 1-1.75-2.73c0-1.66 1.34-3 3-3 1.39 0 2.57.95 2.91 2.23l4.42 2.11c.03-.23.05-.47.05-.73 0-5.52-4.48-10-10-10zm0 16c-3.31 0-6-2.69-6-6 0-.34.03-.67.08-1l2.46 1.18c-.03.27-.04.55-.04.82 0 2.21 1.79 4 4 4s4-1.79 4-4c0-.34-.04-.67-.12-.98l2.91-1.39c.11.77.17 1.55.17 2.37 0 3.31-2.69 6-6 6z"
                fill="currentColor"
              />
            </svg>
            <span className="text-white font-medium">Sign in with Steam</span>
          </button>

          {/* Benefits List */}
          <div className="mb-6">
            <h2 className="text-cs2-light font-semibold mb-4">Why sign in?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-cs2-light/80 text-sm">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Import your Steam inventory</span>
              </li>
              <li className="flex items-start gap-3 text-cs2-light/80 text-sm">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Set unlimited price alerts</span>
              </li>
              <li className="flex items-start gap-3 text-cs2-light/80 text-sm">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Save and share loadouts</span>
              </li>
              <li className="flex items-start gap-3 text-cs2-light/80 text-sm">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Track market trends</span>
              </li>
            </ul>
          </div>

          {/* Guest Option */}
          <div className="text-center pt-4 border-t border-cs2-blue/10">
            <Link href="/items" className="text-sm text-cs2-light/60 hover:text-cs2-blue transition-colors">
              Continue as Guest
            </Link>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-xs text-cs2-light/40 text-center mt-6">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="hover:underline transition-all">
            Terms
          </Link>
          {" & "}
          <Link href="/privacy" className="hover:underline transition-all">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cs2-darker flex items-center justify-center"><div className="text-cs2-light">Loading...</div></div>}>
      <SignInContent />
    </Suspense>
  )
}
