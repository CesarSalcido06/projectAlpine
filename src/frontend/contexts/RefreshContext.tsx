/**
 * Project Alpine - Refresh Context
 *
 * Provides a way for components to trigger refreshes across the app
 * when data changes, eliminating the need for manual page refreshes.
 */

'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface RefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
  lastRefresh: Date;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Function to trigger a refresh
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh periodically
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRefresh();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [triggerRefresh]);

  // Refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if more than 10 seconds have passed since last refresh
      const now = new Date();
      if (now.getTime() - lastRefresh.getTime() > 10000) {
        triggerRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lastRefresh, triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh, lastRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}
