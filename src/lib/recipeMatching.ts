// src/lib/recipeMatching.ts
// Pure helpers that line a recipe's ingredients up against the pantry and grocery list.
import { PANTRY_UNITS, type PantryLocation } from '../constants/pantry';
import type { RecipeIngredient } from '../types/recipe';
import type { GroceryItemInput } from './groceryApi';

export interface PantryLike {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  emoji?: string;
}

export type IngredientStatus = 'have' | 'low' | 'missing' | 'staple';

export interface IngredientMatch {
  index: number;
  ingredient: RecipeIngredient;
  status: IngredientStatus;
  pantryItem: PantryLike | null;
  /** Scaled amount the recipe needs, in the ingredient's own unit */
  needed: number | null;
  /** Amount to take off the pantry item, in the pantry item's unit; null when units can't be compared */
  deductQuantity: number | null;
}

// ---------- Names ----------

function singularize(word: string): string {
  if (word.length <= 3 || word.endsWith('ss')) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

function containsAllWords(haystack: string, needle: string): boolean {
  const words = new Set(haystack.split(' '));
  return needle.split(' ').every((w) => words.has(w));
}

/** Best pantry item for a name: exact match first, then word containment either way. Stocked items win ties. */
export function findPantryMatch<T extends PantryLike>(name: string, pantry: T[]): T | null {
  const target = normalizeName(name);
  if (!target) return null;

  const scored = pantry
    .map((item) => {
      const candidate = normalizeName(item.name);
      let score = 0;
      if (candidate === target) score = 3;
      else if (candidate && containsAllWords(candidate, target)) score = 2;
      else if (candidate && containsAllWords(target, candidate)) score = 1;
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.item.quantity > 0) - Number(a.item.quantity > 0) || b.item.quantity - a.item.quantity);

  return scored[0]?.item ?? null;
}

// ---------- Units ----------

const UNIT_FACTORS: Record<string, { family: string; factor: number }> = {
  g: { family: 'mass', factor: 1 },
  gram: { family: 'mass', factor: 1 },
  kg: { family: 'mass', factor: 1000 },
  ml: { family: 'volume', factor: 1 },
  l: { family: 'volume', factor: 1000 },
  item: { family: 'count', factor: 1 },
};

const COUNT_ALIASES = new Set(['', 'item', 'unit', 'piece', 'pc', 'whole']);

function canonicalUnit(unit: string | null | undefined): string {
  const u = (unit ?? '').trim().toLowerCase().replace(/s$/, '');
  return COUNT_ALIASES.has(u) ? 'item' : u;
}

/** Converts between compatible units (g/kg, ml/L, same unit). Returns null when they can't be compared. */
export function convertQuantity(quantity: number, from: string | null, to: string | null): number | null {
  const a = canonicalUnit(from);
  const b = canonicalUnit(to);
  if (a === b) return quantity;
  const fa = UNIT_FACTORS[a];
  const fb = UNIT_FACTORS[b];
  if (!fa || !fb || fa.family !== fb.family) return null;
  return (quantity * fa.factor) / fb.factor;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Matching ----------

export function matchIngredientsToPantry<T extends PantryLike>(
  ingredients: RecipeIngredient[],
  pantry: T[],
  scale = 1
): IngredientMatch[] {
  return ingredients.map((ingredient, index) => {
    const needed = ingredient.quantity != null ? round2(ingredient.quantity * scale) : null;
    const pantryItem = findPantryMatch(ingredient.name, pantry);
    const base = { index, ingredient, needed, pantryItem };

    if (ingredient.staple) return { ...base, status: 'staple' as const, deductQuantity: null };
    if (!pantryItem || pantryItem.quantity <= 0) return { ...base, status: 'missing' as const, deductQuantity: null };

    const converted = needed != null ? convertQuantity(needed, ingredient.unit, pantryItem.unit) : null;
    if (converted == null) return { ...base, status: 'have' as const, deductQuantity: null };

    return {
      ...base,
      status: converted <= pantryItem.quantity ? ('have' as const) : ('low' as const),
      deductQuantity: round2(Math.min(converted, pantryItem.quantity)),
    };
  });
}

// ---------- Grocery ----------

const FRIDGE_CATEGORIES = new Set(['dairy', 'meat', 'poultry', 'fish', 'vegetables', 'fruit']);

function locationFor(category: string): PantryLocation {
  if (category === 'frozen') return 'freezer';
  return FRIDGE_CATEGORIES.has(category) ? 'fridge' : 'cupboard';
}

/** Grocery rows for ingredients that are missing or short, skipping anything already on the list. */
export function groceryItemsForMatches(
  matches: IngredientMatch[],
  groceryList: { name: string; is_purchased: boolean }[]
): GroceryItemInput[] {
  const onList = groceryList.filter((g) => !g.is_purchased).map((g) => ({ ...g, id: g.name, quantity: 1, unit: 'item' }));
  return matches
    .filter((m) => m.status === 'missing' || m.status === 'low')
    .filter((m) => !findPantryMatch(m.ingredient.name, onList))
    .map((m) => {
      const unit = m.ingredient.unit && (PANTRY_UNITS as readonly string[]).includes(m.ingredient.unit) ? m.ingredient.unit : null;
      return {
        name: m.ingredient.name,
        emoji: m.ingredient.emoji || '🛒',
        category: m.ingredient.category,
        quantity: unit && m.needed ? m.needed : 1,
        unit: unit ?? 'item',
        target_location: locationFor(m.ingredient.category),
      };
    });
}

// ---------- Display ----------

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [0.33, '⅓'],
  [0.5, '½'],
  [0.67, '⅔'],
  [0.75, '¾'],
];

export function formatQuantity(quantity: number | null): string {
  if (quantity == null) return '';
  const whole = Math.floor(quantity);
  const frac = quantity - whole;
  if (frac < 0.05) return String(whole);
  const nice = FRACTIONS.find(([v]) => Math.abs(frac - v) < 0.04);
  if (nice && whole < 20) return whole > 0 ? `${whole}${nice[1]}` : nice[1];
  return String(round2(quantity));
}
