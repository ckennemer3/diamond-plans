'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state once on the client (avoid SSR mismatch)
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
    }
    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 text-sm font-semibold py-1.5 px-4"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Offline mode — using cached plan</span>
    </div>
  );
}
