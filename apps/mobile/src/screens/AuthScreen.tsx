/**
 * Authentication Screen
 * Google Sign-In for mobile users
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useGoogleAuth, handleGoogleResponse } from '../auth/googleAuth';

export default function AuthScreen() {
  const { request, response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      handleGoogleResponse(response).then((result) => {
        setLoading(false);
        if (!result.success) {
          Alert.alert('Sign In Failed', result.error || 'Unknown error');
        }
      });
    }
  }, [response]);

  const handleSignIn = async () => {
    if (!request) return;
    setLoading(true);
    await promptAsync();
    // Loading state will be managed by the response effect
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🦀🔗</Text>
        <Text style={styles.title}>Crabiner</Text>
        <Text style={styles.subtitle}>Missed Connections Rediscovered</Text>

        <TouchableOpacity
          style={[styles.button, (!request || loading) && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={!request || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.description}>
          Connect with people you've crossed paths with.{'\n'}
          Share your missed connections.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 72,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
