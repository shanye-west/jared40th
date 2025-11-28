import { useCallback, useRef, useEffect } from "react";

// Browser-compatible timeout type
type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * A hook that provides debounced save functionality per unique key.
 * Each key (e.g., hole number) has its own debounce timer, so typing
 * on different holes doesn't cancel each other's saves.
 * 
 * @param saveFn - The actual save function to call after debounce
 * @param delay - Debounce delay in milliseconds (default 400ms)
 * @returns A debounced save function that accepts (key, data)
 */
export function useDebouncedSave<T>(
  saveFn: (key: string, data: T) => void | Promise<void>,
  delay: number = 400
) {
  // Map of key -> timeout ID for per-key debouncing
  const timersRef = useRef<Map<string, TimeoutId>>(new Map());
  // Map of key -> pending data (for cleanup/flush)
  const pendingRef = useRef<Map<string, T>>(new Map());
  // Track if component is mounted
  const mountedRef = useRef(true);

  // Cleanup on unmount - flush all pending saves
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear all timers and flush pending saves
      timersRef.current.forEach((timer, key) => {
        clearTimeout(timer);
        const pendingData = pendingRef.current.get(key);
        if (pendingData !== undefined) {
          // Fire immediately on unmount to prevent data loss
          saveFn(key, pendingData);
        }
      });
      timersRef.current.clear();
      pendingRef.current.clear();
    };
  }, [saveFn]);

  const debouncedSave = useCallback(
    (key: string, data: T) => {
      // Store the pending data
      pendingRef.current.set(key, data);

      // Clear existing timer for this key
      const existingTimer = timersRef.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          const dataToSave = pendingRef.current.get(key);
          if (dataToSave !== undefined) {
            saveFn(key, dataToSave);
            pendingRef.current.delete(key);
          }
        }
        timersRef.current.delete(key);
      }, delay);

      timersRef.current.set(key, timer);
    },
    [saveFn, delay]
  );

  // Allow immediate flush of a specific key (e.g., on blur)
  const flush = useCallback(
    (key: string) => {
      const timer = timersRef.current.get(key);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(key);
      }
      const pendingData = pendingRef.current.get(key);
      if (pendingData !== undefined) {
        saveFn(key, pendingData);
        pendingRef.current.delete(key);
      }
    },
    [saveFn]
  );

  // Flush all pending saves
  const flushAll = useCallback(() => {
    timersRef.current.forEach((timer, key) => {
      clearTimeout(timer);
      const pendingData = pendingRef.current.get(key);
      if (pendingData !== undefined) {
        saveFn(key, pendingData);
      }
    });
    timersRef.current.clear();
    pendingRef.current.clear();
  }, [saveFn]);

  return { debouncedSave, flush, flushAll };
}
