/**
 * Push Notifications Module for Expo
 * Handles registration, permissions, and notification handling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiPost, apiDelete } from '../api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  postId?: string;
  replyId?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Request notification permissions
 * @returns True if permissions granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return false;
  }

  return true;
}

/**
 * Get Expo push token
 * @returns Expo push token or null if failed
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id-here', // Replace with actual project ID
    });

    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 * @param token - Expo push token
 * @param deviceInfo - Optional device information
 * @returns True if registration succeeded
 */
export async function registerPushToken(
  token: string,
  deviceInfo?: object
): Promise<boolean> {
  try {
    await apiPost('/api/push/register', {
      platform: 'expo',
      token,
      deviceInfo: deviceInfo || {
        platform: Platform.OS,
        version: Platform.Version,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

/**
 * Unregister push token from backend
 * @param token - Expo push token
 * @returns True if unregistration succeeded
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    await apiDelete('/api/push/unregister', {
      body: JSON.stringify({ token }),
    });

    return true;
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    return false;
  }
}

/**
 * Initialize push notifications
 * Requests permissions and registers token with backend
 * @returns Push token if successful, null otherwise
 */
export async function initializePushNotifications(): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  const token = await getExpoPushToken();

  if (!token) {
    return null;
  }

  const registered = await registerPushToken(token);

  if (!registered) {
    return null;
  }

  return token;
}

/**
 * Add notification received listener
 * Called when app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener
 * Called when user taps on notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get notification data from notification response
 */
export function getNotificationData(
  response: Notifications.NotificationResponse
): NotificationData {
  return response.notification.request.content.data as NotificationData;
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
