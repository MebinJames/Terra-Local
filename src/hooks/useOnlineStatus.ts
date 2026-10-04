import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [forceAirGap, setForceAirGap] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('terralocal_airgap_mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleAirGap = () => {
    setForceAirGap((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('terralocal_airgap_mode', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return {
    isOnline: browserOnline && !forceAirGap,
    browserOnline,
    forceAirGap,
    toggleAirGap,
  };
}
