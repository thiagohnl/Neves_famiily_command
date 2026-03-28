// src/lib/pantryApi.ts
import { supabase } from './supabase';
import type { PantryLocation, PantryCategory, PantryUnit } from '../constants/pantry';

const FAMILY_ID = 'default';

export interface PantryItem {
  id: string;
  family_id: string;
  name: string;
  emoji: string;
  category: string | null;
  location: PantryLocation;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItemInput {
  name: string;
  emoji?: string;
  category?: PantryCategory | string;
  location?: PantryLocation;
  quantity?: number;
  unit?: PantryUnit | string;
  expiry_date?: string | null;
  notes?: string;
}

// -------- List --------

export async function listPantryItems(location?: PantryLocation) {
  let query = supabase
    .from('pantry_items')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .order('name', { ascending: true });

  if (location) {
    query = query.eq('location', location);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

// -------- Create --------

export async function addPantryItem(input: PantryItemInput) {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      family_id: FAMILY_ID,
      name: input.name,
      emoji: input.emoji ?? '🥫',
      category: input.category ?? null,
      location: input.location ?? 'cupboard',
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'item',
      expiry_date: input.expiry_date ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PantryItem;
}

// -------- Update --------

export async function updatePantryItem(id: string, input: Partial<PantryItemInput>) {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.emoji !== undefined) updates.emoji = input.emoji;
  if (input.category !== undefined) updates.category = input.category;
  if (input.location !== undefined) updates.location = input.location;
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.expiry_date !== undefined) updates.expiry_date = input.expiry_date;
  if (input.notes !== undefined) updates.notes = input.notes;

  const { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', id)
    .eq('family_id', FAMILY_ID)
    .select()
    .single();
  if (error) throw error;
  return data as PantryItem;
}

// -------- Delete --------

export async function deletePantryItem(id: string) {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// -------- Adjust Quantity --------

export async function adjustPantryQuantity(id: string, delta: number) {
  const { data: current, error: getErr } = await supabase
    .from('pantry_items')
    .select('quantity')
    .eq('id', id)
    .eq('family_id', FAMILY_ID)
    .single();
  if (getErr) throw getErr;

  const newQty = Math.max(0, (current?.quantity ?? 0) + delta);

  const { data, error } = await supabase
    .from('pantry_items')
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('family_id', FAMILY_ID)
    .select()
    .single();
  if (error) throw error;
  return data as PantryItem;
}

// -------- Expiring Soon --------

export async function getExpiringSoon(withinDays: number = 5) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + withinDays);

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', today.toISOString().split('T')[0])
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .gt('quantity', 0)
    .order('expiry_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

// -------- Search --------

export async function searchPantryItems(query: string) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PantryItem[];
}
