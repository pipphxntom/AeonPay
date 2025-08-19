import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from './useRealtime';

interface NotificationPreferences {
  planReady: boolean;
  guardrail: boolean;
  swapMatched: boolean;
  paymentComplete: boolean;
  referralEarned: boolean;
}

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UseNotificationsReturn {
  permission: NotificationPermission;
  preferences: NotificationPreferences;
  pushSupported: boolean;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;
  showInAppNotification: (type: string, title: string, message: string, options?: any) => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  planReady: true,
  guardrail: true,
  swapMatched: true,
  paymentComplete: true,
  referralEarned: true
};

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [pushSupported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);
  
  const { subscribe, publish } = useRealtime();

  // Initialize notification system
  useEffect(() => {
    // Check current permission
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });
    }

    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('aeonpay-notification-preferences');
    if (savedPrefs) {
      try {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) });
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('[Notifications] Service worker registered:', registration);
        })
        .catch(error => {
          console.error('[Notifications] Service worker registration failed:', error);
        });
    }
  }, []);

  // Listen for realtime events and show in-app notifications
  useEffect(() => {
    const handleRealtimeEvent = (event: string, data: any) => {
      if (!preferences[event as keyof NotificationPreferences]) return;

      const notificationConfig = getNotificationConfig(event, data);
      if (notificationConfig) {
        showInAppNotification(event, notificationConfig.title, notificationConfig.body, data);
      }
    };

    // Subscribe to user-specific events
    subscribe('user:notifications', handleRealtimeEvent);

    return () => {
      // Cleanup handled by useRealtime
    };
  }, [subscribe, preferences]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      
      setPermission({
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default'
      });

      if (result === 'granted') {
        // Test notification
        new Notification('AeonPay Notifications Enabled!', {
          body: 'You\'ll now receive updates about your plans and transactions.',
          icon: '/icon-192x192.png',
          tag: 'permission-granted'
        });
      }

      return result === 'granted';
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return false;
    }
  }, []);

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<void> => {
    const newPreferences = { ...preferences, ...prefs };
    setPreferences(newPreferences);
    
    // Save to localStorage
    localStorage.setItem('aeonpay-notification-preferences', JSON.stringify(newPreferences));
    
    // Update service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_NOTIFICATION_PREFERENCES',
        preferences: newPreferences
      });
    }
  }, [preferences]);

  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!pushSupported) {
      console.warn('[Notifications] Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return convertSubscription(existingSubscription);
      }

      // VAPID public key would be set via environment variable
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.log('[Notifications] VAPID key not configured, skipping push subscription');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(convertSubscription(subscription))
      });

      if (!response.ok) {
        throw new Error('Failed to register push subscription');
      }

      return convertSubscription(subscription);
    } catch (error) {
      console.error('[Notifications] Push subscription failed:', error);
      return null;
    }
  }, [pushSupported]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!pushSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        
        if (success) {
          // Notify server
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
        }
        
        return success;
      }
      
      return true;
    } catch (error) {
      console.error('[Notifications] Push unsubscription failed:', error);
      return false;
    }
  }, [pushSupported]);

  const showInAppNotification = useCallback((type: string, title: string, message: string, options?: any) => {
    // Emit custom event for in-app toast notifications
    const event = new CustomEvent('aeonpay:notification', {
      detail: {
        type,
        title,
        message,
        ...options
      }
    });
    
    document.dispatchEvent(event);

    // Also show browser notification if permission granted and page not focused
    if (permission.granted && document.hidden) {
      new Notification(title, {
        body: message,
        icon: '/icon-192x192.png',
        tag: `aeonpay-${type}`,
        data: options
      });
    }
  }, [permission.granted]);

  return {
    permission,
    preferences,
    pushSupported,
    requestPermission,
    updatePreferences,
    subscribeToPush,
    unsubscribeFromPush,
    showInAppNotification
  };
}

// Helper functions
function getNotificationConfig(event: string, data: any) {
  const configs = {
    planReady: {
      title: 'Plan Ready! 🎉',
      body: `${data.memberName} completed the plan setup. Time to start spending!`
    },
    swapMatched: {
      title: 'Swap Match Found! 💰',
      body: `Someone wants to swap ₹${data.amount} ${data.fromType} for ${data.toType}`
    },
    paymentComplete: {
      title: 'Payment Successful ✅',
      body: `₹${data.amount} paid to ${data.merchantName}`
    },
    guardrail: {
      title: 'Spending Alert 🚨',
      body: `This ₹${data.amount} payment will exceed your plan limit`
    },
    referralEarned: {
      title: 'Campus Karma Earned! ⭐',
      body: `+${data.points} points from referral. You're building your reputation!`
    }
  };

  return configs[event as keyof typeof configs];
}

function convertSubscription(subscription: globalThis.PushSubscription): PushSubscription {
  const key = subscription.getKey('p256dh');
  const token = subscription.getKey('auth');

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: key ? arrayBufferToBase64(key) : '',
      auth: token ? arrayBufferToBase64(token) : ''
    }
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}