import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { logout } from '../services/authService';

const INACTIVITY_MS  = (parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 15) * 60 * 1000;
const WARNING_BEFORE = 2 * 60 * 1000; // 2 menit sebelum timeout

/**
 * Hook auto-logout setelah 15 menit inaktif.
 * @returns {{ showWarning: boolean, remainingSeconds: number, extendSession: Function }}
 */
export function useSessionTimeout() {
  const { userData, clearUser } = useAuthStore();
  const [showWarning, setShowWarning]       = useState(false);
  const [remainingSeconds, setRemaining]     = useState(0);
  const timeoutRef  = useRef(null);
  const warningRef  = useRef(null);
  const countdownRef = useRef(null);

  const doLogout = useCallback(async () => {
    setShowWarning(false);
    await logout(userData);
    clearUser();
  }, [userData, clearUser]);

  const resetTimers = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);

    if (!userData) return;

    // Warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemaining(WARNING_BEFORE / 1000);
      countdownRef.current = setInterval(() => {
        setRemaining(s => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
    }, INACTIVITY_MS - WARNING_BEFORE);

    // Logout timer
    timeoutRef.current = setTimeout(doLogout, INACTIVITY_MS);
  }, [userData, doLogout]);

  // Extend session (reset timers)
  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!userData) return;

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    const onActivity = () => resetTimers();

    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    resetTimers();

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
  }, [userData, resetTimers]);

  return { showWarning, remainingSeconds, extendSession, forceLogout: doLogout };
}
