/**
 * Jest Test Environment Setup
 * Sets environment variables required for tests
 */

// Set test VAPID keys for web-push library
// These are dummy keys valid only for testing
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BJ2nXkboNM4QHQgstsntqTbjIKmqD70Obe-fRgqGunjBEcZnORMsnc_WE1UxGKu8NpV9dchzQw7xLfOZVp5qtuw'
process.env.VAPID_PRIVATE_KEY = 'ht073Vuwp_vdjlRjdlaweR9hd57f-KFmmB6z1MGFmDk'
process.env.VAPID_SUBJECT = 'mailto:test@csloadout.gg'

// Other test environment variables
process.env.RESEND_API_KEY = 're_test_key'
process.env.UNSUBSCRIBE_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.CRON_SECRET = 'test-cron-secret'
