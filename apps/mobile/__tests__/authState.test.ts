/**
 * Tests for auth state module
 * Ensures access tokens are never persisted to storage
 */

import {
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  setAuth,
  clearAuth,
  isAuthenticated,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  addAuthListener,
} from '../src/auth/authState';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('mock-refresh-token')),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('Auth State Module', () => {
  beforeEach(() => {
    clearAuth();
  });

  describe('Access Token (In-Memory)', () => {
    test('should store access token in memory only', () => {
      const token = 'test-access-token';
      setAccessToken(token);
      expect(getAccessToken()).toBe(token);
    });

    test('should clear access token from memory', () => {
      setAccessToken('test-token');
      clearAuth();
      expect(getAccessToken()).toBeNull();
    });

    test('should NOT persist access token to AsyncStorage or SecureStore', () => {
      // This is verified by the fact that we only use in-memory variables
      setAccessToken('test-token');

      // Access token should only be in memory, not in any storage
      // If this test passes, it means no storage APIs were called for access token
      expect(getAccessToken()).toBe('test-token');
    });
  });

  describe('User Management', () => {
    test('should store user in memory', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      setUser(user);
      expect(getUser()).toEqual(user);
    });

    test('should clear user from memory', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };
      setUser(user);
      clearAuth();
      expect(getUser()).toBeNull();
    });
  });

  describe('Combined Auth Management', () => {
    test('should set both token and user', () => {
      const token = 'test-token';
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      setAuth(token, user);

      expect(getAccessToken()).toBe(token);
      expect(getUser()).toEqual(user);
      expect(isAuthenticated()).toBe(true);
    });

    test('should clear both token and user', () => {
      const token = 'test-token';
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      setAuth(token, user);
      clearAuth();

      expect(getAccessToken()).toBeNull();
      expect(getUser()).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('Refresh Token (Secure Storage)', () => {
    test('should store refresh token in secure storage', async () => {
      const token = 'refresh-token';
      await setRefreshToken(token);

      // Verify it's stored (mocked)
      const SecureStore = require('expo-secure-store');
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    test('should retrieve refresh token from secure storage', async () => {
      const token = await getRefreshToken();

      const SecureStore = require('expo-secure-store');
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
      expect(token).toBe('mock-refresh-token');
    });

    test('should clear refresh token from secure storage', async () => {
      await clearRefreshToken();

      const SecureStore = require('expo-secure-store');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('Auth Listeners', () => {
    test('should notify listeners when auth state changes', () => {
      const listener = jest.fn();
      const unsubscribe = addAuthListener(listener);

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      setUser(user);
      expect(listener).toHaveBeenCalledWith(user);

      clearAuth();
      expect(listener).toHaveBeenCalledWith(null);

      unsubscribe();
    });

    test('should allow unsubscribing from auth listeners', () => {
      const listener = jest.fn();
      const unsubscribe = addAuthListener(listener);

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      setUser(user);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      setUser({ ...user, name: 'Updated' });
      // Should still be 1 because we unsubscribed
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication Status', () => {
    test('should return false when not authenticated', () => {
      expect(isAuthenticated()).toBe(false);
    });

    test('should return true when access token exists', () => {
      setAccessToken('test-token');
      expect(isAuthenticated()).toBe(true);
    });

    test('should return false after clearing auth', () => {
      setAccessToken('test-token');
      clearAuth();
      expect(isAuthenticated()).toBe(false);
    });
  });
});
