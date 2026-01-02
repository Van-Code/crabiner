/**
 * Tests for API client
 * Ensures proper authorization header injection and 401 retry logic
 */

import { apiFetch, apiJson, apiGet, apiPost } from '../src/api/client';
import { setAuth, clearAuth, setRefreshToken } from '../src/auth/authState';

// Mock fetch
global.fetch = jest.fn();

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'http://localhost:3000',
      },
    },
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('mock-refresh-token')),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAuth();
  });

  describe('Authorization Header Injection', () => {
    test('should add Authorization header when token exists', async () => {
      setAuth('test-access-token', {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers;
      expect(headers.get('Authorization')).toBe('Bearer test-access-token');
    });

    test('should not add Authorization header when no token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiFetch('/api/test');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('401 Auto-Retry', () => {
    test('should retry once on 401 after refreshing token', async () => {
      setAuth('old-access-token', {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });
      await setRefreshToken('refresh-token');

      // First call returns 401
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        })
        // Refresh token call returns new tokens
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            user: {
              id: 1,
              email: 'test@example.com',
              name: 'Test User',
            },
          }),
        })
        // Retry call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const response = await apiFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(response.ok).toBe(true);
    });

    test('should not retry more than once to prevent infinite loops', async () => {
      setAuth('test-token', {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });

      // Always return 401
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        ok: false,
      });

      const response = await apiFetch('/api/test');

      // Should only try: original call + refresh call = 2 times
      // (refresh fails so no retry of original call)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(response.ok).toBe(false);
    });

    test('should clear auth if refresh fails', async () => {
      setAuth('test-token', {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      });
      await setRefreshToken('refresh-token');

      // First call returns 401, then refresh fails
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        })
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        });

      await apiFetch('/api/test');

      // Auth should be cleared after failed refresh
      const { getAccessToken } = require('../src/auth/authState');
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    test('apiJson should parse JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await apiJson('/api/test');
      expect(result).toEqual({ data: 'test' });
    });

    test('apiJson should throw on error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Test error' }),
      });

      await expect(apiJson('/api/test')).rejects.toThrow('Test error');
    });

    test('apiGet should make GET request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await apiGet('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('apiPost should make POST request with body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiPost('/api/test', { key: 'value' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
        })
      );
    });
  });
});
