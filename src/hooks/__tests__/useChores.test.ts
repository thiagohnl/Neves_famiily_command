import { renderHook, act } from '@testing-library/react';
import { useChores } from '../useChores';
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

const mockMembers = [
  { id: 'm1', name: 'Alice', avatar: '👩', points: 10, created_at: '2026-01-01' },
];

const mockChores = [
  {
    id: 'c1',
    name: 'Dishes',
    assigned_to: 'm1',
    points: 5,
    emoji: '🍽️',
    is_completed: false,
    created_at: '2026-01-01',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

function setupLoadData() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'family_members') {
      return chain({ data: mockMembers, error: null });
    }
    if (table === 'chores') {
      return chain({ data: mockChores, error: null });
    }
    return chain({ data: [], error: null });
  });
}

describe('useChores', () => {
  it('loads family members and chores on mount', async () => {
    setupLoadData();

    const { result } = renderHook(() => useChores());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.familyMembers).toEqual(mockMembers);
    expect(result.current.chores).toEqual(mockChores);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when load fails', async () => {
    mockSupabase.from.mockReturnValue(
      chain({ data: null, error: new Error('Network error') })
    );

    const { result } = renderHook(() => useChores());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
  });

  it('completeChore updates DB and calls increment_points RPC', async () => {
    setupLoadData();
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useChores());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.completeChore('c1', 5, 'm1');
    });

    expect(success!).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('chores');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_points', {
      member_id: 'm1',
      points_to_add: 5,
    });
  });

  it('completeChore returns false on error', async () => {
    setupLoadData();

    const { result } = renderHook(() => useChores());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue(
      chain({ data: null, error: { message: 'update failed' } })
    );

    let success: boolean;
    await act(async () => {
      success = await result.current.completeChore('c1', 5, 'm1');
    });

    expect(success!).toBe(false);
  });

  it('addChore validates name and assigned_to', async () => {
    setupLoadData();

    const { result } = renderHook(() => useChores());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.addChore({ name: '', assigned_to: 'm1' });
    });
    expect(success!).toBe(false);

    await act(async () => {
      success = await result.current.addChore({ name: 'Clean' });
    });
    expect(success!).toBe(false);
  });
});
