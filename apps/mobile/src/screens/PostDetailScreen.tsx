/**
 * Post Detail Screen
 * View post with threaded replies and reply composer
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../api/client';

interface Reply {
  id: number;
  content: string;
  created_at: string;
  parent_reply_id: number | null;
}

interface Post {
  id: number;
  title: string;
  description: string;
  location: string;
  when_it_happened: string;
  created_at: string;
  reply_count: number;
}

export default function PostDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { postId } = route.params as { postId: number };

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPostAndReplies();
  }, [postId]);

  const loadPostAndReplies = async () => {
    try {
      setLoading(true);
      const [postData, repliesData] = await Promise.all([
        apiGet<Post>(`/api/posts/${postId}`),
        apiGet<{ replies: Reply[] }>(`/api/posts/${postId}/replies`),
      ]);
      setPost(postData);
      setReplies(repliesData.replies);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      await apiPost(`/api/posts/${postId}/replies`, {
        content: replyText,
      });
      setReplyText('');
      await loadPostAndReplies();
      Alert.alert('Success', 'Reply posted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.postContainer}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.description}>{post.description}</Text>

          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              <Ionicons name="location-outline" size={14} /> {post.location}
            </Text>
            <Text style={styles.metaText}>
              <Ionicons name="time-outline" size={14} /> {post.when_it_happened}
            </Text>
          </View>
        </View>

        <View style={styles.repliesHeader}>
          <Text style={styles.repliesTitle}>
            Replies ({post.reply_count})
          </Text>
        </View>

        {replies.map((reply) => (
          <View key={reply.id} style={styles.replyCard}>
            <Text style={styles.replyContent}>{reply.content}</Text>
            <Text style={styles.replyDate}>
              {new Date(reply.created_at).toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.replyComposer}>
        <TextInput
          style={styles.replyInput}
          placeholder="Write a reply..."
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
          onPress={handleSubmitReply}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  metaContainer: {
    flexDirection: 'column',
    gap: 5,
  },
  metaText: {
    fontSize: 14,
    color: '#999',
  },
  repliesHeader: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 10,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  replyCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  replyContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  replyDate: {
    fontSize: 12,
    color: '#999',
  },
  replyComposer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});
