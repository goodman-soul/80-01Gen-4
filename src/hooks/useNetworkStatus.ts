import { useState, useEffect, useCallback, useRef } from 'react';

interface UseNetworkStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  simulateToggleMs?: number;
}

interface UseNetworkStatusResult {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}): UseNetworkStatusResult {
  const { onOnline, onOffline, simulateToggleMs } = options;
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    onOnlineRef.current = onOnline;
    onOfflineRef.current = onOffline;
  }, [onOnline, onOffline]);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    onOnlineRef.current?.();
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(false);
    onOfflineRef.current?.();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  useEffect(() => {
    if (!simulateToggleMs || simulateToggleMs <= 0) return;

    const interval = setInterval(() => {
      setIsOnline(prev => {
        const next = !prev;
        if (next) {
          setWasOffline(true);
          onOnlineRef.current?.();
        } else {
          setWasOffline(false);
          onOfflineRef.current?.();
        }
        return next;
      });
    }, simulateToggleMs);

    return () => clearInterval(interval);
  }, [simulateToggleMs]);

  return { isOnline, wasOffline };
}
