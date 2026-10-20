// api/presence.ts — Vercel Serverless Function
// Lets a phone (Home Assistant, Tasker, an iOS Shortcut) tell the board where
// someone is, e.g. when their phone joins or leaves the home WiFi.
//
//   POST /api/presence   header x-presence-key: <PRESENCE_SHARED_KEY>
//   { "member": "Thiago", "status": "home", "ttl_minutes": 180 }
//
// Upserts a `whereabouts_overrides` row with source 'presence' that expires after
// ttl_minutes (default 180). status "clear" removes it so the calendar takes over.
// A manual override set on the board still wins over presence.
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const STATUSES = ['home', 'school', 'work', 'church', 'grandma', 'playdate', 'travelling', 'sleeping'];
const DEFAULT_TTL_MIN = 180;
const MAX_TTL_MIN = 7 * 24 * 60;

const keyMatches = (given: unknown, expected: string) => {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sharedKey = process.env.PRESENCE_SHARED_KEY;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!sharedKey || !url || !anonKey) {
    return res.status(503).json({ error: 'Presence is not configured' });
  }
  if (!keyMatches(req.headers['x-presence-key'], sharedKey)) {
    return res.status(401).json({ error: 'Invalid presence key' });
  }

  const body = (typeof req.body === 'string' ? safeJson(req.body) : req.body) ?? {};
  const memberName = typeof body.member === 'string' ? body.member.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
  if (!memberName) return res.status(400).json({ error: 'member is required' });
  if (status !== 'clear' && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')} or clear` });
  }
  const ttl = body.ttl_minutes === undefined ? DEFAULT_TTL_MIN : Number(body.ttl_minutes);
  if (!Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_TTL_MIN) {
    return res.status(400).json({ error: `ttl_minutes must be between 1 and ${MAX_TTL_MIN}` });
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: members, error: membersError } = await supabase.from('family_members').select('id, name');
  if (membersError) return res.status(502).json({ error: 'Could not load family members' });
  const member = (members ?? []).find(m => String(m.name).trim().toLowerCase() === memberName.toLowerCase());
  if (!member) return res.status(404).json({ error: `No family member called ${memberName}` });

  // One presence row per member: replace whatever the phone said before
  const { error: deleteError } = await supabase
    .from('whereabouts_overrides')
    .delete()
    .eq('member_id', member.id)
    .eq('source', 'presence');
  if (deleteError) return res.status(502).json({ error: 'Could not update presence' });

  if (status === 'clear') {
    return res.status(200).json({ ok: true, member: member.name, status: 'clear' });
  }

  const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();
  const { error: insertError } = await supabase
    .from('whereabouts_overrides')
    .insert({ member_id: member.id, status, source: 'presence', expires_at: expiresAt });
  if (insertError) return res.status(502).json({ error: 'Could not update presence' });

  return res.status(200).json({ ok: true, member: member.name, status, expires_at: expiresAt });
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}
