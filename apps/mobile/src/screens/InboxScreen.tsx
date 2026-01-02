/**
 * Inbox Screen
 * Shows posts with replies and unread counts
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
import { apiGet } from '../api/client';

interface InboxItem {
  post_id: number;
  post_title: string;
  last_reply_at: string;
  unread_count: number;
  total_replies: number;
}

export default function InboxScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadInbox();
    }, [])
  );

  const loadInbox = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ items: InboxItem[] }>('/api/inbox');
      setItems(data.items);
    } catch (error: any) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: InboxItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() =>
        navigation.navigate('PostDetail' as never, { postId: item.post_id } as never)
      }
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.post_title}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread_count}</Text>
          </View>
        )}
      </View>

      <View style={styles.itemMeta}>
        <Text style={styles.metaText}>
          <Ionicons name="chatbubble-outline" size={14} /> {item.total_replies} replies
        </Text>
        <Text style={styles.metaText}>
          Last: {new Date(item.last_reply_at).toLocaleDateString()}
        </Text>
      </View>
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
      <FlatList
        data={items}
        keyExtractor={(item) => item.post_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No posts with replies yet.{'\n'}
            Create a post and wait for connections!
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
  listContent: {
    padding: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
    lineHeight: 24,
  },
});
