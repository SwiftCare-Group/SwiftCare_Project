import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

type RefreshCallback = () => void | Promise<void>;

/**
 * Runs the latest refresh callback whenever an Expo Router screen gains focus.
 * This is important for tab screens, which can stay mounted while the user
 * navigates elsewhere and therefore do not rerun a mount-only useEffect.
 */
export function useRefreshOnFocus(
  refresh: RefreshCallback,
  enabled = true,
): void {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      void Promise.resolve(refreshRef.current()).catch(error => {
        if (__DEV__) {
          console.warn('[SwiftCare] Focus refresh failed:', error);
        }
      });
    }, [enabled]),
  );
}
