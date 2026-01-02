/**
 * Crabiner Mobile App
 * Expo React Native app for missed connections
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import {
  initializePushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getNotificationData,
  setBadgeCount,
} from './src/utils/notifications';
import { getUser } from './src/auth/authState';
import { apiGet } from './src/api/client';

export default function App() {
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Initialize push notifications when user is authenticated
    const user = getUser();
    if (user) {
      setupPushNotifications();
    }
  }, []);

  const setupPushNotifications = async () => {
    try {
      const token = await initializePushNotifications();
      setPushToken(token);

      // Set up notification listeners
      const receivedSubscription = addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        // Update badge count
        updateBadgeCount();
      });

      const responseSubscription = addNotificationResponseListener((response) => {
        console.log('Notification tapped:', response);
        const data = getNotificationData(response);

        // Handle deep linking based on notification data
        if (data.postId) {
          // Navigate to post detail - this would need navigation ref
          console.log('Navigate to post:', data.postId);
        }
      });

      // Cleanup listeners on unmount
      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  };

  const updateBadgeCount = async () => {
    try {
      const user = getUser();
      if (!user) return;

      const data = await apiGet<{ unreadCount: number }>('/api/notifications');
      await setBadgeCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
