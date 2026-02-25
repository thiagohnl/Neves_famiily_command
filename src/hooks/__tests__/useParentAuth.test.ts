import { renderHook, act } from '@testing-library/react';
import { useParentAuth } from '../useParentAuth';
import { chain } from '../../test/mocks/supabase';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useParentAuth', () => {
  it('loads PIN from Supabase on mount', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: { parent_pin: '9999' }, error: null })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('app_settings');
    expect(result.current.currentPin).toBe('9999');
  });

  it('defaults to 1234 if Supabase call fails', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: null, error: { message: 'not found' } })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentPin).toBe('1234');
  });

  it('authenticateParent returns true for correct PIN and sets localStorage', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: { parent_pin: '5678' }, error: null })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean;
    act(() => {
      success = result.current.authenticateParent('5678');
    });

    expect(success!).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('parentMode')).toBe('true');
  });

  it('authenticateParent returns false for wrong PIN', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: { parent_pin: '5678' }, error: null })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean;
    act(() => {
      success = result.current.authenticateParent('0000');
    });

    expect(success!).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('exitParentMode clears authentication', async () => {
    localStorage.setItem('parentMode', 'true');
    mockSupabase.from.mockReturnValue(
      chain({ data: { parent_pin: '1234' }, error: null })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.exitParentMode();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('parentMode')).toBeNull();
  });

  it('updatePin calls Supabase and updates local state', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: { parent_pin: '1234' }, error: null })
    );

    const { result } = renderHook(() => useParentAuth());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock the update call
    mockSupabase.from.mockReturnValue(
      chain({ data: null, error: null })
    );

    let updateResult: boolean;
    await act(async () => {
      updateResult = await result.current.updatePin('4321');
    });

    expect(updateResult!).toBe(true);
    expect(result.current.currentPin).toBe('4321');
  });
});
