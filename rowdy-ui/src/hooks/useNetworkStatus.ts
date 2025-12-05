import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether there are Firestore writes waiting to sync */
  hasPendingWrites: boolean;
  /** Whether the current data came from cache (not server) */
  isFromCache: boolean;
  /** Timestamp of last successful server sync */
  lastSyncedAt: Date | null;
  /** Update pending writes status (called by data hooks) */
  setPendingWrites: (pending: boolean) => void;
  /** Update cache status (called by data hooks) */
  setFromCache: (fromCache: boolean) => void;
  /** Mark a successful sync */
  markSynced: () => void;
}

/**
 * Hook to track network connectivity and Firestore sync status.
 * 
 * Provides:
 * - Browser online/offline status
 * - Firestore pending writes tracking
 * - Cache vs server data awareness
 * - Last sync timestamp
 * 
 * Usage:
 * ```tsx
 * const { isOnline, hasPendingWrites, isFromCache } = useNetworkStatus();
 * 
 * // In your Firestore snapshot handler:
 * onSnapshot(docRef, (snap) => {
 *   setPendingWrites(snap.metadata.hasPendingWrites);
 *   setFromCache(snap.metadata.fromCache);
 *   if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
 *     markSynced();
 *   }
 * });
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setPendingWrites = useCallback((pending: boolean) => {
    setHasPendingWrites(pending);
  }, []);

  const setFromCache = useCallback((fromCache: boolean) => {
    setIsFromCache(fromCache);
  }, []);

  const markSynced = useCallback(() => {
    setLastSyncedAt(new Date());
    setHasPendingWrites(false);
    setIsFromCache(false);
  }, []);

  return {
    isOnline,
    hasPendingWrites,
    isFromCache,
    lastSyncedAt,
    setPendingWrites,
    setFromCache,
    markSynced,
  };
}

/**
 * Derived sync status for UI display
 */
export type SyncStatus = 
  | "online"           // Online, no pending writes, data from server
  | "syncing"          // Online, has pending writes
  | "offline"          // Offline
  | "offline-pending"  // Offline with pending writes (needs attention)
  | "cached";          // Online but viewing cached data

export function getSyncStatus(status: NetworkStatus): SyncStatus {
  const { isOnline, hasPendingWrites, isFromCache } = status;

  if (!isOnline) {
    return hasPendingWrites ? "offline-pending" : "offline";
  }

  if (hasPendingWrites) {
    return "syncing";
  }

  if (isFromCache) {
    return "cached";
  }

  return "online";
}
