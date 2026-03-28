// src/lib/groceryApi.ts
import { supabase } from './supabase';
import { addPantryItem } from './pantryApi';
import type { PantryLocation } from '../constants/pantry';

const FAMILY_ID = 'default';

export interface GroceryItem {
  id: string;
  family_id: string;
  name: string;
  emoji: string;
  category: string | null;
  quantity: number;
  unit: string;
  target_location: PantryLocation;
  is_purchased: boolean;
  purchased_at: string | null;
  added_to_pantry: boolean;
  created_at: string;
}

export interface GroceryItemInput {
  name: string;
  emoji?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  target_location?: PantryLocation;
}

// -------- List --------

export async function listGroceryItems() {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GroceryItem[];
}

// -------- Create --------

export async function addGroceryItem(input: GroceryItemInput) {
  const { data, error } = await supabase
    .from('grocery_items')
    .insert({
      family_id: FAMILY_ID,
      name: input.name,
      emoji: input.emoji ?? '🛒',
      category: input.category ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'item',
      target_location: input.target_location ?? 'cupboard',
    })
    .select()
    .single();
  if (error) throw error;
  return data as GroceryItem;
}

// -------- Mark Purchased --------

export async function markPurchased(id: string, purchased: boolean) {
  const { data, error } = await supabase
    .from('grocery_items')
    .update({
      is_purchased: purchased,
      purchased_at: purchased ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as GroceryItem;
}

// -------- Transfer to Pantry --------

export async function transferToPantry(item: GroceryItem) {
  // Create the pantry item from the grocery item data
  const pantryItem = await addPantryItem({
    name: item.name,
    emoji: item.emoji,
    category: item.category ?? undefined,
    location: item.target_location,
    quantity: item.quantity,
    unit: item.unit,
  });

  // Mark the grocery item as transferred
  await supabase
    .from('grocery_items')
    .update({ added_to_pantry: true })
    .eq('id', item.id);

  return pantryItem;
}

// -------- Delete --------

export async function deleteGroceryItem(id: string) {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// -------- Clear Purchased --------

export async function clearPurchased() {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('family_id', FAMILY_ID)
    .eq('is_purchased', true)
    .eq('added_to_pantry', true);
  if (error) throw error;
}
