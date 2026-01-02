/**
 * In-memory auth state module for React Native
 * Stores access token in memory only (NOT AsyncStorage)
 * Refresh token stored in SecureStore
 */

import * as SecureStore from 'expo-secure-store';

// In-memory storage
let accessToken: string | null = null;
let currentUser: User | null = null;
let authListeners: Array<(user: User | null) => void> = [];

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
}

const REFRESH_TOKEN_KEY = 'refreshToken';

// ============================================
// Access Token Management (In-Memory Only)
// ============================================

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// ============================================
// User Management
// ============================================

export function getUser(): User | null {
  return currentUser;
}

export function setUser(user: User | null): void {
  currentUser = user;
  notifyAuthListeners(user);
}

export function isAuthenticated(): boolean {
  return !!accessToken && !!currentUser;
}

// ============================================
// Combined Auth Management
// ============================================

export function setAuth(token: string, user: User): void {
  accessToken = token;
  currentUser = user;
  notifyAuthListeners(user);
}

export function clearAuth(): void {
  accessToken = null;
  currentUser = null;
  notifyAuthListeners(null);
}

// ============================================
// Refresh Token Management (Secure Storage)
// ============================================

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to set refresh token:', error);
    throw error;
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear refresh token:', error);
  }
}

// ============================================
// Auth State Listeners
// ============================================

export function addAuthListener(listener: (user: User | null) => void): () => void {
  authListeners.push(listener);

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(l => l !== listener);
  };
}

function notifyAuthListeners(user: User | null): void {
  authListeners.forEach(listener => listener(user));
}
