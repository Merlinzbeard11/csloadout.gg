/**
 * /auth/error - Authentication Error Page
 * 
 * BDD Reference: features/06-steam-authentication.feature
 *   Scenario: Handle authentication timeout
 *   Scenario: Handle Steam service unavailable
 */

import Link from 'next/link';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description:
      'There is a problem with the server configuration. Please contact support if this error persists.',
  },
  Verification: {
    title: 'Verification Failed',
    description:
      'Failed to verify your Steam identity. This could be due to a network issue or Steam service being temporarily unavailable.',
  },
  Cancelled: {
    title: 'Sign-In Cancelled',
    description: 'You cancelled the Steam sign-in process. No worries - you can try again anytime.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'Something went wrong during the sign-in process. Please try again.',
  },
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorType = searchParams.error || 'Default';
  const error = errorMessages[errorType] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">{error.title}</h2>
          <p className="mt-2 text-gray-600">{error.description}</p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            Back to Homepage
          </Link>
        </div>

        {errorType === 'Verification' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Make sure you're logged into Steam in your browser before trying
              to sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
