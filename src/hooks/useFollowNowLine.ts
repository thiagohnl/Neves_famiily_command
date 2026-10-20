import { useEffect, useRef } from 'react';

const USER_SCROLL_PAUSE_MS = 120_000;

/**
 * Keeps every visible `[data-timeline-scroll]` container scrolled so its
 * `[data-now-line]` sits `offset(container)` px below the top. Runs whenever
 * `trigger` changes (e.g. each minute). A manual scroll pauses the auto-follow
 * for 2 minutes so it doesn't fight the user.
 */
export function useFollowNowLine(trigger: unknown, offset: (container: HTMLElement) => number) {
  const lastUserScroll = useRef(0);
  const isAutoScroll = useRef(false);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-scroll]'));
    const onScroll = () => { if (!isAutoScroll.current) lastUserScroll.current = Date.now(); };
    containers.forEach(c => c.addEventListener('scroll', onScroll, { passive: true }));
    return () => containers.forEach(c => c.removeEventListener('scroll', onScroll));
  }, []);

  useEffect(() => {
    if (Date.now() - lastUserScroll.current < USER_SCROLL_PAUSE_MS) return;
    const t = setTimeout(() => {
      const containers = document.querySelectorAll<HTMLElement>('[data-timeline-scroll]');
      for (const container of Array.from(containers)) {
        if (container.offsetParent === null) continue;
        const line = container.querySelector<HTMLElement>('[data-now-line]');
        if (!line) continue;
        const lineTop = line.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
        isAutoScroll.current = true;
        container.scrollTo({ top: Math.max(0, lineTop - offsetRef.current(container)), behavior: 'smooth' });
        setTimeout(() => { isAutoScroll.current = false; }, 1000);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [trigger]);
}
