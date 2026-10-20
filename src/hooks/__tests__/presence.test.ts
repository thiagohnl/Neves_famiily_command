// Tests the Vercel function in api/presence.ts with a fake Supabase client.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const calls: { table: string; op: string; args: unknown[] }[] = [];
const members = [{ id: 'p1', name: 'Thiago' }, { id: 'k1', name: 'Charlie' }];

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      const record = (op: string) => (...args: unknown[]) => { calls.push({ table, op, args }); return query; };
      query.select = record('select');
      query.delete = record('delete');
      query.eq = record('eq');
      query.insert = (...args: unknown[]) => { calls.push({ table, op: 'insert', args }); return Promise.resolve({ error: null }); };
      query.then = (resolve: (v: unknown) => void) =>
        resolve(table === 'family_members' ? { data: members, error: null } : { error: null });
      return query;
    },
  }),
}));

import handler from '../../../api/presence';

const KEY = 'test-presence-key';

const call = async (body: unknown, opts: { key?: string; method?: string } = {}) => {
  const res = { statusCode: 0, body: undefined as unknown };
  const response = {
    status(code: number) { res.statusCode = code; return this; },
    json(payload: unknown) { res.body = payload; return this; },
  } as unknown as VercelResponse;
  const request = {
    method: opts.method ?? 'POST',
    headers: { 'x-presence-key': opts.key ?? KEY },
    body,
  } as unknown as VercelRequest;
  await handler(request, response);
  return res;
};

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv('PRESENCE_SHARED_KEY', KEY);
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
});

describe('POST /api/presence', () => {
  it('replaces the member\'s presence row, matching the name case-insensitively', async () => {
    const before = Date.now();
    const res = await call({ member: 'thiago', status: 'home' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, member: 'Thiago', status: 'home' });

    const ops = calls.filter(c => c.table === 'whereabouts_overrides');
    expect(ops.map(c => c.op)).toEqual(['delete', 'eq', 'eq', 'insert']);
    expect(ops[1].args).toEqual(['member_id', 'p1']);
    expect(ops[2].args).toEqual(['source', 'presence']);
    const row = (ops[3].args[0]) as { member_id: string; status: string; source: string; expires_at: string };
    expect(row).toMatchObject({ member_id: 'p1', status: 'home', source: 'presence' });
    // Default TTL is 180 minutes
    const ttlMin = (new Date(row.expires_at).getTime() - before) / 60_000;
    expect(ttlMin).toBeGreaterThan(179.9);
    expect(ttlMin).toBeLessThan(180.1);
  });

  it('honours ttl_minutes and lets "clear" remove presence without inserting', async () => {
    await call({ member: 'Charlie', status: 'school', ttl_minutes: 30 });
    const insert = calls.find(c => c.op === 'insert')!;
    const row = insert.args[0] as { expires_at: string };
    expect((new Date(row.expires_at).getTime() - Date.now()) / 60_000).toBeLessThan(30.1);

    calls.length = 0;
    const res = await call({ member: 'Charlie', status: 'clear' });
    expect(res.statusCode).toBe(200);
    expect(calls.some(c => c.op === 'insert')).toBe(false);
    expect(calls.some(c => c.op === 'delete')).toBe(true);
  });

  it('rejects a wrong key, a wrong method, bad input and unknown members', async () => {
    expect((await call({ member: 'Thiago', status: 'home' }, { key: 'nope' })).statusCode).toBe(401);
    expect((await call({}, { method: 'GET' })).statusCode).toBe(405);
    expect((await call({ member: 'Thiago', status: 'moon' })).statusCode).toBe(400);
    expect((await call({ status: 'home' })).statusCode).toBe(400);
    expect((await call({ member: 'Thiago', status: 'home', ttl_minutes: 0 })).statusCode).toBe(400);
    expect((await call({ member: 'Nobody', status: 'home' })).statusCode).toBe(404);
    expect(calls.some(c => c.op === 'insert')).toBe(false);
  });

  it('accepts a JSON string body', async () => {
    expect((await call(JSON.stringify({ member: 'Thiago', status: 'work' }))).statusCode).toBe(200);
  });

  it('is unavailable until the shared key is configured', async () => {
    vi.stubEnv('PRESENCE_SHARED_KEY', '');
    expect((await call({ member: 'Thiago', status: 'home' })).statusCode).toBe(503);
  });
});
