// src/hooks/usePantry.ts
import { useEffect, useState } from 'react';
import {
  listPantryItems,
  addPantryItem,
  addPantryItemsBulk,
  updatePantryItem,
  deletePantryItem,
  adjustPantryQuantity,
  getExpiringSoon,
  type PantryItem,
  type PantryItemInput,
} from '@/lib/pantryApi';
import type { PantryLocation } from '../constants/pantry';

export function usePantry(location?: PantryLocation) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await listPantryItems(location));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load pantry');
    } finally {
      setLoading(false);
    }
  }

  async function add(input: PantryItemInput) {
    const created = await addPantryItem(input);
    setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }

  async function addBulk(inputs: PantryItemInput[]) {
    const created = await addPantryItemsBulk(inputs);
    // Items scanned for another location shouldn't appear in a filtered tab
    const visible = location ? created.filter((it) => it.location === location) : created;
    setItems((prev) => [...prev, ...visible].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }

  async function update(id: string, input: Partial<PantryItemInput>) {
    const updated = await updatePantryItem(id, input);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }

  async function remove(id: string) {
    await deletePantryItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function adjustQty(id: string, delta: number) {
    const updated = await adjustPantryQuantity(id, delta);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }

  useEffect(() => {
    refetch();
  }, [location]);

  return { items, loading, error, refetch, add, addBulk, update, remove, adjustQty };
}

export function useExpiringSoon(withinDays: number = 5) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await getExpiringSoon(withinDays));
    } catch {
      // silently fail for expiry check
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, [withinDays]);

  return { items, loading, refetch };
}
