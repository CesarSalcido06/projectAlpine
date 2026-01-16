/**
 * Project Alpine - Authentication Context
 *
 * Manages user authentication state and provides auth functions.
 * Handles login, logout, registration, and session management.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, LoginPayload, RegisterPayload } from '@/lib/types';
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  checkSetup,
} from '@/lib/api';

// ============================================================
// TYPES
// ============================================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsSetup: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = user !== null;

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  }, []);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    async function checkAuth() {
      setIsLoading(true);
      try {
        // First check if any users exist
        const setupStatus = await checkSetup();
        setNeedsSetup(!setupStatus.hasUsers);

        if (!setupStatus.hasUsers) {
          // No users exist - redirect to register for first user setup
          if (pathname !== '/register') {
            router.push('/register');
          }
          setIsLoading(false);
          return;
        }

        // Check current user
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // Handle redirects based on auth status
        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

        if (!currentUser && !isPublicRoute) {
          // Not authenticated and on protected route - redirect to login
          router.push('/login');
        } else if (currentUser && isPublicRoute) {
          // Authenticated but on public route - redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  /**
   * Login with username and password
   */
  const login = useCallback(async (payload: LoginPayload) => {
    const response = await apiLogin(payload);
    setUser(response.user);
    router.push('/');
  }, [router]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push('/login');
  }, [router]);

  /**
   * Register a new user
   */
  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await apiRegister(payload);
    setUser(response.user);
    setNeedsSetup(false);
    router.push('/');
  }, [router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    needsSetup,
    login,
    logout,
    register,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
