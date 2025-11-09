/**
 * /auth/signin - Steam Sign-In Page
 * 
 * BDD Reference: features/06-steam-authentication.feature
 *   Scenario: Successful Steam login flow
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SignInPage() {
  // Redirect if already authenticated
  const session = await getSession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to csloadout.gg</h2>
          <p className="mt-2 text-gray-600">
            Access your favorites, price alerts, and inventory tracking
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Steam Sign-In Button */}
          <Link
            href="/api/auth/steam/login"
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#171A21] hover:bg-[#2A3F5F] transition-colors duration-200"
          >
            <svg
              className="w-6 h-6 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            Sign in with Steam
          </Link>

          {/* Info Section */}
          <div className="mt-6 space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>No passwords to remember - Steam handles everything</span>
            </div>
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>We never see your Steam password</span>
            </div>
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4L19 7"
                />
              </svg>
              <span>Session lasts 30 days - stay logged in</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
