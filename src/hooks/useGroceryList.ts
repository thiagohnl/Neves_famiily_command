// src/hooks/useGroceryList.ts
import { useEffect, useMemo, useState } from 'react';
import {
  listGroceryItems,
  addGroceryItem,
  markPurchased,
  transferToPantry,
  deleteGroceryItem,
  clearPurchased,
  type GroceryItem,
  type GroceryItemInput,
} from '@/lib/groceryApi';

export function useGroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toBuy = useMemo(() => items.filter((it) => !it.is_purchased), [items]);
  const purchased = useMemo(() => items.filter((it) => it.is_purchased), [items]);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await listGroceryItems());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  }

  async function add(input: GroceryItemInput) {
    const created = await addGroceryItem(input);
    setItems((prev) => [created, ...prev]);
    return created;
  }

  async function togglePurchased(id: string) {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const updated = await markPurchased(id, !item.is_purchased);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }

  async function transfer(item: GroceryItem) {
    const pantryItem = await transferToPantry(item);
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, added_to_pantry: true } : it))
    );
    return pantryItem;
  }

  async function remove(id: string) {
    await deleteGroceryItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function clearDone() {
    await clearPurchased();
    setItems((prev) => prev.filter((it) => !it.is_purchased || !it.added_to_pantry));
  }

  useEffect(() => {
    refetch();
  }, []);

  return { items, toBuy, purchased, loading, error, refetch, add, togglePurchased, transfer, remove, clearDone };
}
