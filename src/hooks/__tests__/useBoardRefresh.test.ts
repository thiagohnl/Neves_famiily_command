import { renderHook, act } from '@testing-library/react';
import { useBoardRefreshSource } from '../useBoardRefresh';

describe('useBoardRefreshSource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17, 23, 59, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('rolls over to the new day and bumps the tick without an exact-midnight timer', () => {
    const { result } = renderHook(() => useBoardRefreshSource());
    expect(result.current.today).toBe('2026-09-17');
    expect(result.current.tick).toBe(0);

    // Tablet asleep past midnight: the next check sees a different date
    act(() => { vi.setSystemTime(new Date(2026, 8, 18, 6, 30, 0)); vi.advanceTimersByTime(30_000); });
    expect(result.current.today).toBe('2026-09-18');
    expect(result.current.tick).toBe(1);
  });

  it('refreshes every 5 minutes and on manual refresh', () => {
    vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0));
    const { result } = renderHook(() => useBoardRefreshSource());

    act(() => { vi.advanceTimersByTime(5 * 60_000); });
    expect(result.current.tick).toBe(1);

    act(() => { result.current.refresh(); });
    expect(result.current.tick).toBe(2);
  });

  it('refreshes when the page becomes visible again', () => {
    vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0));
    const { result } = renderHook(() => useBoardRefreshSource());

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.tick).toBe(1);
  });
});
