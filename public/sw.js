/**
 * Service Worker for Push Notifications
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1f: Push Notifications)
 *
 * CRITICAL GOTCHA: Service workers only work on HTTPS (or localhost for dev)
 * HTTP sites cannot use push notifications - Vercel provides HTTPS by default
 *
 * Responsibilities:
 * - Listen for push events from push service
 * - Display push notifications using Notification API
 * - Handle notification clicks (open marketplace link)
 * - Run in background (separate from main thread)
 *
 * BDD Requirements (line 175-178):
 * - Notification title: "Price Alert: {item}"
 * - Notification body: contains price
 * - Notification icon: item image
 * - Click action: open marketplace listing URL
 */

/* eslint-disable no-restricted-globals */

// Service worker version (increment to force update)
const VERSION = '1.0.0'

/**
 * Listen for push events from server
 * BDD Scenario: "Send push notification when alert triggers" (line 170)
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.error('Push event has no data')
    return
  }

  try {
    const data = event.data.json()

    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png', // BDD line 177: include item icon
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.data?.url || '/' // BDD line 178: marketplace link
      },
      actions: [
        {
          action: 'view',
          title: 'View Listing'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      requireInteraction: false, // Auto-dismiss after timeout
      tag: 'price-alert', // Replace previous notifications
      renotify: true // Notify even if tag matches previous
    }

    // BDD line 175: notification title
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  } catch (error) {
    console.error('Error handling push event:', error)
  }
})

/**
 * Handle notification click events
 * BDD Scenario: "clicking notification should open marketplace link" (line 178)
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open marketplace listing URL
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

/**
 * Service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('Service worker activated:', VERSION)
  event.waitUntil(clients.claim())
})

/**
 * Service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('Service worker installed:', VERSION)
  self.skipWaiting()
})
