// src/lib/safeSupabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _ready = false;

function init() {
  if (_client) return; // already inited

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    console.error('[Supabase] Missing envs: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    _ready = false;
    return;
  }

  _client = createClient(url, key, { auth: { persistSession: false } });
  _ready = true;
}

export function getSupabase(): { client: SupabaseClient | null; ready: boolean } {
  if (!_client) init();
  return { client: _client, ready: _ready };
}