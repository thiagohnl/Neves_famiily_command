import { vi } from 'vitest';

/**
 * Chainable Supabase mock builder.
 * Usage:
 *   mockSupabase.from.mockReturnValue(chain({ data: [...], error: null }));
 */

type ChainResult = { data: any; error: any };

/** Build a chainable query object that resolves to `result` on terminal calls. */
export function chain(result: ChainResult) {
  const obj: any = {};
  const terminalMethods = ['single', 'maybeSingle'];
  const chainingMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'in', 'is',
    'order', 'limit', 'range',
    'match', 'not', 'or', 'filter',
  ];

  // Chaining methods return the same object (thenable)
  for (const m of chainingMethods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }

  // Terminal methods resolve to the result
  for (const m of terminalMethods) {
    obj[m] = vi.fn().mockResolvedValue(result);
  }

  // The chain itself is thenable (for `await supabase.from(...).select(...)`)
  obj.then = (resolve: (v: ChainResult) => void) => Promise.resolve(result).then(resolve);

  return obj;
}

/** Create a fresh mock of the supabase client. */
export function createMockSupabase() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/test.jpg' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };
}
