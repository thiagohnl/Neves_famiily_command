import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';

const AUTO_REFRESH_MS = 5 * 60_000;
const DAY_CHECK_MS = 30_000;

const todayISO = () => dayjs().format('YYYY-MM-DD');

export interface BoardRefresh {
  /** Bumps whenever board data should be re-fetched; add it to effect deps. */
  tick: number;
  /** Today's local date (YYYY-MM-DD); changes at midnight. */
  today: string;
  refresh: () => void;
}

export const BoardRefreshContext = createContext<BoardRefresh>({
  tick: 0,
  today: todayISO(),
  refresh: () => {},
});

export const useBoardRefresh = () => useContext(BoardRefreshContext);

/**
 * Owned once by App. The wall tablet stays open for days and its timers get
 * throttled while the screen sleeps, so instead of waiting for an exact
 * midnight tick we compare dates often and also refresh when the page wakes.
 */
export function useBoardRefreshSource(): BoardRefresh {
  const [tick, setTick] = useState(0);
  const [today, setToday] = useState(todayISO);

  const refresh = useCallback(() => {
    setToday(todayISO());
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    const dayCheck = setInterval(() => {
      if (todayISO() !== today) refresh();
    }, DAY_CHECK_MS);
    return () => clearInterval(dayCheck);
  }, [today, refresh]);

  useEffect(() => {
    const auto = setInterval(refresh, AUTO_REFRESH_MS);
    // Waking the screen can fire both events; one refresh is enough
    let lastWake = 0;
    const onWake = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastWake < 5000) return;
      lastWake = Date.now();
      refresh();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearInterval(auto);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [refresh]);

  return { tick, today, refresh };
}
