import { useEffect, useState } from 'react';

/** Current time, re-rendering once a minute (time of day only; take the date from useBoardRefresh). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();
