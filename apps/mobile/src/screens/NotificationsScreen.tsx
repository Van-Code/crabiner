/**
 * Notifications Screen
 * Lists user notifications with mark as read functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../api/client';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{
        notifications: Notification[];
        unreadCount: number;
      }>('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiPost('/api/notifications/read', {
        notificationIds: [notificationId],
      });

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiPost('/api/notifications/read', { all: true });
      setNotifications(
        notifications.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.postId) {
      navigation.navigate('PostDetail' as never, { postId: notification.data.postId } as never);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={
            item.type === 'reply'
              ? 'chatbubble'
              : item.type === 'mention'
              ? 'at'
              : 'information-circle'
          }
          size={24}
          color={!item.read ? '#007AFF' : '#999'}
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
          <Text style={styles.markAllButtonText}>Mark All as Read ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No notifications yet.{'\n'}
            You'll be notified when someone replies to your posts!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 10,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    alignSelf: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
    lineHeight: 24,
  },
});
