# Feature 33: Mobile Apps (iOS & Android)

## Overview
Native mobile applications for iOS and Android providing full csloadout.gg experience optimized for mobile devices. Includes push notifications, offline mode, camera-based inspect link scanning, mobile-optimized UI, and biometric authentication. Extends platform reach to mobile users and enables on-the-go trading, portfolio tracking, and market monitoring.

## User Segments
- **Primary**: Mobile Traders, On-the-Go Users
- **Secondary**: Bulk Traders, Collectors, Crafters
- **Tertiary**: Casual Users, Portfolio Managers

## User Stories

### As a Mobile Trader
- I want to receive push notifications when prices cross my alert thresholds
- I want to scan Steam inspect links with my camera to quickly check pattern/float
- I want to manage my portfolio on my phone during commute
- I want biometric login (Face ID/Touch ID) for quick secure access
- I want offline access to my saved items and portfolio

### As a Bulk Trader
- I want mobile push alerts when wholesale deals are posted
- I want to approve bulk transactions from my phone
- I want to monitor my multi-account inventory on mobile
- I want real-time notifications for escrow status changes

### As a Collector
- I want mobile notifications when my followed patterns are listed
- I want to browse craft gallery on my phone
- I want to share crafts/loadouts directly from mobile
- I want to save items for later viewing (offline mode)

### As a Crafter
- I want to use craft simulator on mobile
- I want push notifications when my crafts get likes/comments
- I want to photograph Steam screenshots and extract inspect links
- I want to create loadouts on mobile

### As the Platform
- I want to increase user engagement with push notifications
- I want to capture mobile-first user segment
- I want to enable camera-based features (scan inspect links)
- I want to increase daily active users (DAU)

## Research & Context

### Mobile Platform Strategy

1. **Technology Stack**
   - **React Native**: Cross-platform (iOS + Android) with single codebase
   - **Expo**: Development framework for rapid iteration
   - **TypeScript**: Type safety across mobile codebase
   - **React Navigation**: Native navigation patterns
   - **Redux Toolkit**: State management
   - **React Native Paper**: Material Design components

2. **Push Notifications**
   - **FCM (Firebase Cloud Messaging)**: Android notifications
   - **APNs (Apple Push Notification service)**: iOS notifications
   - **Expo Push Notifications**: Unified cross-platform API
   - **Notification Types**: Price alerts, deal alerts, social interactions, escrow updates

3. **Camera Integration**
   - **expo-camera**: Access device camera
   - **OCR (Optical Character Recognition)**: Extract inspect links from screenshots
   - **QR Code Scanning**: Quick sharing between users
   - **Barcode Scanning**: Potential integration with physical CS2 merchandise

4. **Offline Mode**
   - **AsyncStorage**: Local data persistence
   - **Redux Persist**: Persist Redux state
   - **Offline Queue**: Queue mutations when offline, sync when online
   - **Cached Images**: Store item images for offline viewing

5. **Biometric Authentication**
   - **expo-local-authentication**: Face ID, Touch ID, fingerprint
   - **Secure Token Storage**: Keychain (iOS), Keystore (Android)
   - **Biometric Re-Auth**: For sensitive operations (transactions)

### Competitor Mobile Apps

- **Steam Mobile**: Basic trading, inventory management, notifications
- **CSGOEmpire Mobile**: Casino-focused, poor UX
- **Buff163 Mobile**: Chinese market, good UX but region-locked
- **Opportunity**: First comprehensive CS2 market app with full feature parity to web

## Technical Requirements

### Database Schema Extensions

```sql
-- Mobile device tokens for push notifications
CREATE TABLE mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Device details
  device_token VARCHAR(500) NOT NULL, -- FCM/APNs token
  device_type VARCHAR(20) NOT NULL, -- 'ios' or 'android'
  device_name VARCHAR(255), -- User-provided name
  device_model VARCHAR(255), -- 'iPhone 15 Pro', 'Pixel 8'
  os_version VARCHAR(50), -- 'iOS 17.2', 'Android 14'

  -- App details
  app_version VARCHAR(50), -- '1.0.0'
  build_number INTEGER, -- 42

  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '{}', -- { "price_alerts": true, "social": false }

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_mobile_devices_user_id (user_id),
  INDEX idx_mobile_devices_token (device_token)
);

-- Push notification logs
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_device_id UUID NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,

  -- Notification details
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Custom payload
  notification_type VARCHAR(50), -- 'price_alert', 'deal_alert', 'social', 'escrow'

  -- Delivery
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,

  -- User interaction
  opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_push_notifications_device_id (mobile_device_id, created_at DESC),
  INDEX idx_push_notifications_status (status)
);

-- Offline sync queue (for mobile clients)
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mobile_device_id UUID REFERENCES mobile_devices(id) ON DELETE CASCADE,

  -- Operation details
  operation_type VARCHAR(50) NOT NULL, -- 'create_alert', 'like_craft', 'update_profile'
  operation_data JSONB NOT NULL, -- Operation payload

  -- Sync status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'conflict', 'failed'
  synced_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_offline_sync_queue_user_id (user_id, status)
);
```

### Mobile App Structure (React Native)

#### `mobile/App.tsx`

```typescript
import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { AuthProvider } from './src/providers/AuthProvider';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </NotificationProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
```

### Services

#### `mobile/src/services/PushNotificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/config';

export class PushNotificationService {
  /**
   * Register device for push notifications
   */
  async registerDevice(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions denied');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Register with backend
    await this.registerWithBackend(token);

    return token;
  }

  /**
   * Register device token with backend
   */
  private async registerWithBackend(deviceToken: string): Promise<void> {
    const deviceInfo = {
      device_token: deviceToken,
      device_type: Platform.OS, // 'ios' or 'android'
      device_model: Device.modelName,
      os_version: Device.osVersion,
      app_version: '1.0.0', // From app.json
    };

    await fetch(`${API_BASE_URL}/api/mobile/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(deviceInfo),
    });
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string> {
    // Implementation depends on auth strategy
    return 'token';
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Handle notification received
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ): void {
    // Notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(onNotificationReceived);

    // Notification tapped
    Notifications.addNotificationResponseReceivedListener(onNotificationTapped);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: any): Promise<void> {
    await fetch(`${API_BASE_URL}/api/mobile/devices/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(preferences),
    });
  }
}

export const pushNotificationService = new PushNotificationService();
```

#### `mobile/src/services/InspectLinkScannerService.ts`

```typescript
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { API_BASE_URL } from '@/config';

export class InspectLinkScannerService {
  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Scan inspect link from camera
   */
  async scanInspectLink(): Promise<string | null> {
    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
    });

    if (result.canceled) return null;

    // Extract text using OCR (backend API)
    const text = await this.performOCR(result.assets[0].uri);

    // Extract inspect link using regex
    const inspectLink = this.extractInspectLink(text);

    return inspectLink;
  }

  /**
   * Perform OCR using backend API
   */
  private async performOCR(imageUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'screenshot.jpg',
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/mobile/ocr`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.text || '';
  }

  /**
   * Extract Steam inspect link from text
   */
  private extractInspectLink(text: string): string | null {
    // Regex for Steam inspect links
    const regex = /steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview\s+[A-Z0-9%]+/i;
    const match = text.match(regex);

    return match ? match[0] : null;
  }

  /**
   * Parse inspect link to get pattern/float info
   */
  async parseInspectLink(inspectLink: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/inspect-link/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inspect_link: inspectLink }),
    });

    return await response.json();
  }
}

export const inspectLinkScannerService = new InspectLinkScannerService();
```

#### `mobile/src/services/OfflineSyncService.ts`

```typescript
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config';

export class OfflineSyncService {
  private offlineQueue: any[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.setupConnectivityListener();
    this.loadOfflineQueue();
  }

  /**
   * Setup connectivity listener
   */
  private setupConnectivityListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      // Sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncOfflineQueue();
      }
    });
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueJSON = await AsyncStorage.getItem('offline_queue');
      this.offlineQueue = queueJSON ? JSON.parse(queueJSON) : [];
    } catch (error) {
      console.error('Failed to load offline queue', error);
    }
  }

  /**
   * Save offline queue to storage
   */
  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue', error);
    }
  }

  /**
   * Queue operation for offline sync
   */
  async queueOperation(operationType: string, operationData: any): Promise<void> {
    const operation = {
      id: Math.random().toString(36).substring(7),
      operation_type: operationType,
      operation_data: operationData,
      timestamp: Date.now(),
    };

    this.offlineQueue.push(operation);
    await this.saveOfflineQueue();

    // Attempt immediate sync if online
    if (this.isOnline) {
      await this.syncOfflineQueue();
    }
  }

  /**
   * Sync offline queue with server
   */
  private async syncOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const operations = [...this.offlineQueue];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);

        // Remove from queue on success
        this.offlineQueue = this.offlineQueue.filter((op) => op.id !== operation.id);
      } catch (error) {
        console.error('Failed to sync operation', error);
        // Keep in queue for retry
      }
    }

    await this.saveOfflineQueue();
  }

  /**
   * Execute queued operation
   */
  private async executeOperation(operation: any): Promise<void> {
    const endpoint = this.getEndpointForOperation(operation.operation_type);

    await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(operation.operation_data),
    });
  }

  /**
   * Get API endpoint for operation type
   */
  private getEndpointForOperation(operationType: string): string {
    const endpoints: Record<string, string> = {
      'create_alert': '/api/alerts',
      'like_craft': '/api/crafts/like',
      'update_profile': '/api/profile',
      'save_item': '/api/saved-items',
    };

    return endpoints[operationType] || '/api/sync';
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineSyncService = new OfflineSyncService();
```

#### `mobile/src/services/BiometricAuthService.ts`

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class BiometricAuthService {
  /**
   * Check if biometric auth is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    return compatible && enrolled;
  }

  /**
   * Get supported biometric types
   */
  async getSupportedBiometricTypes(): Promise<string[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return types.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Touch ID / Fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris Scan';
        default:
          return 'Biometric';
      }
    });
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  }

  /**
   * Enable biometric login
   */
  async enableBiometricLogin(): Promise<void> {
    await AsyncStorage.setItem('biometric_enabled', 'true');
  }

  /**
   * Disable biometric login
   */
  async disableBiometricLogin(): Promise<void> {
    await AsyncStorage.setItem('biometric_enabled', 'false');
  }

  /**
   * Check if biometric login is enabled
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem('biometric_enabled');
    return enabled === 'true';
  }
}

export const biometricAuthService = new BiometricAuthService();
```

### Backend API Endpoints for Mobile

#### `src/app/api/mobile/devices/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/mobile/devices - Register mobile device
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { device_token, device_type, device_model, os_version, app_version } = await req.json();

    // Check if device already registered
    const existing = await db.mobile_devices.findFirst({
      where: { device_token },
    });

    if (existing) {
      // Update existing device
      await db.mobile_devices.update({
        where: { id: existing.id },
        data: {
          device_model,
          os_version,
          app_version,
          last_active_at: new Date(),
          is_active: true,
        },
      });

      return NextResponse.json({ success: true, device_id: existing.id });
    }

    // Create new device
    const device = await db.mobile_devices.create({
      data: {
        user_id: session.user.id,
        device_token,
        device_type,
        device_model,
        os_version,
        app_version,
      },
    });

    return NextResponse.json({ success: true, device_id: device.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/mobile/ocr/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

// POST /api/mobile/ocr - Perform OCR on uploaded image
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to buffer
    const buffer = Buffer.from(await image.arrayBuffer());

    // Perform OCR using Tesseract.js
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Mobile Screens (Examples)

#### `mobile/src/screens/HomeScreen.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

export const HomeScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state: any) => state.auth.user);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch latest data
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      className="flex-1 bg-gray-50"
    >
      {/* Portfolio Summary */}
      <View className="bg-white p-4 mb-2">
        <Text className="text-lg font-semibold mb-2">Portfolio Value</Text>
        <Text className="text-3xl font-bold text-blue-600">$12,450.00</Text>
        <Text className="text-sm text-green-600">+$245 (2.0%) today</Text>
      </View>

      {/* Quick Actions */}
      <View className="bg-white p-4 mb-2">
        <Text className="text-lg font-semibold mb-3">Quick Actions</Text>
        <View className="flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={() => navigation.navigate('ScanInspectLink')}
            className="bg-blue-50 p-4 rounded-lg flex-1"
          >
            <Text className="text-blue-600 font-medium">Scan Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Alerts')}
            className="bg-green-50 p-4 rounded-lg flex-1"
          >
            <Text className="text-green-600 font-medium">Price Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View className="bg-white p-4">
        <Text className="text-lg font-semibold mb-3">Recent Activity</Text>
        {/* Activity list */}
      </View>
    </ScrollView>
  );
};
```

#### `mobile/src/screens/ScanInspectLinkScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { inspectLinkScannerService } from '@/services/InspectLinkScannerService';

export const ScanInspectLinkScreen = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async () => {
    setScanning(true);

    const hasPermission = await inspectLinkScannerService.requestCameraPermission();
    if (!hasPermission) {
      alert('Camera permission required');
      setScanning(false);
      return;
    }

    const inspectLink = await inspectLinkScannerService.scanInspectLink();

    if (inspectLink) {
      const data = await inspectLinkScannerService.parseInspectLink(inspectLink);
      setResult(data);
    } else {
      alert('No inspect link found');
    }

    setScanning(false);
  };

  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-4">Scan Steam Inspect Link</Text>
      <Text className="text-gray-600 mb-4">
        Take a photo of a Steam screenshot containing an inspect link to extract pattern and float information.
      </Text>

      <Button title="Take Photo" onPress={handleScan} disabled={scanning} />

      {scanning && <ActivityIndicator size="large" className="mt-4" />}

      {result && (
        <View className="mt-6 bg-white p-4 rounded-lg">
          <Text className="font-semibold mb-2">Skin: {result.skin_name}</Text>
          <Text>Pattern: {result.pattern_index}</Text>
          <Text>Float: {result.float_value}</Text>
        </View>
      )}
    </View>
  );
};
```

## Success Metrics
1. **Downloads**: 50,000+ downloads within 6 months (iOS + Android combined)
2. **Daily Active Users**: 10,000+ DAU by month 6
3. **Push Notification Engagement**: 40%+ open rate
4. **App Store Rating**: 4.5+ stars on both platforms
5. **Feature Adoption**: 60%+ of mobile users enable biometric login

## Dependencies
- **Feature 31**: Public API (mobile app consumes API)
- **Feature 32**: Webhooks (push notifications)
- **Feature 15**: Portfolio Analytics (mobile portfolio view)
- **Feature 17**: Advanced Deal Alerts (mobile push alerts)

## Effort Estimate
- **React Native Setup**: 8 hours
- **Navigation & Routing**: 8 hours
- **Authentication (Biometric)**: 12 hours
- **Push Notifications**: 16 hours
- **Camera & OCR Integration**: 20 hours
- **Offline Mode**: 16 hours
- **Core Screens (10+)**: 60 hours
- **State Management (Redux)**: 12 hours
- **Backend API Endpoints**: 12 hours
- **Testing (iOS + Android)**: 24 hours
- **App Store Submissions**: 8 hours
- **Total**: ~196 hours (4.9 weeks)

## Implementation Notes
1. **Cross-Platform**: Use React Native + Expo for single codebase (iOS + Android)
2. **Push Notifications**: Expo Push Notifications for unified API
3. **Camera Features**: expo-camera + backend OCR for inspect link extraction
4. **Offline Mode**: Redux Persist + AsyncStorage for local data
5. **Biometric Auth**: expo-local-authentication for Face ID/Touch ID
6. **App Store**: Follow Apple App Store and Google Play Store guidelines

## Gotchas
1. **iOS Review**: App Store review can take 1-2 weeks, plan accordingly
2. **Push Notification Permissions**: Users must explicitly grant permission
3. **Camera Permissions**: Request at appropriate time (not on app launch)
4. **Offline Conflicts**: Handle conflicts when syncing offline changes
5. **App Size**: Keep app bundle under 100MB for cellular downloads
6. **Deep Linking**: Configure universal links (iOS) and app links (Android)

## Status Checklist
- [ ] React Native project initialized with Expo
- [ ] Navigation structure implemented
- [ ] Authentication flow built (biometric support)
- [ ] Push notification system integrated
- [ ] Camera & OCR functionality working
- [ ] Offline mode implemented with sync queue
- [ ] Core screens built (Home, Portfolio, Alerts, Scan, Profile)
- [ ] State management configured (Redux + Redux Persist)
- [ ] Backend API endpoints created
- [ ] iOS app submitted to App Store
- [ ] Android app submitted to Google Play
- [ ] Push notification testing completed
- [ ] Offline mode testing completed
- [ ] Unit tests written (80% coverage)
- [ ] Documentation completed (user guide)

## Related Features
- **Feature 31**: Public API (mobile consumes API)
- **Feature 32**: Webhooks (push notifications)
- **Feature 15**: Portfolio Analytics (mobile view)
- **Feature 17**: Deal Alerts (mobile push alerts)

## References
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [expo-local-authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Store Policies](https://play.google.com/about/developer-content-policy/)
