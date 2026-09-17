import {
  normalizeName,
  findPantryMatch,
  convertQuantity,
  matchIngredientsToPantry,
  groceryItemsForMatches,
  formatQuantity,
} from '../recipeMatching';
import type { RecipeIngredient } from '../../types/recipe';

const ing = (over: Partial<RecipeIngredient>): RecipeIngredient => ({
  text: over.name ?? '',
  name: 'Thing',
  quantity: null,
  unit: null,
  emoji: '🥕',
  category: 'vegetables',
  ...over,
});

const pantry = [
  { id: 'p1', name: 'Chicken Breast', quantity: 1, unit: 'kg' },
  { id: 'p2', name: 'Tomatoes', quantity: 4, unit: 'item' },
  { id: 'p3', name: 'Olive Oil', quantity: 1, unit: 'bottle' },
  { id: 'p4', name: 'Milk', quantity: 0, unit: 'L' },
  { id: 'p5', name: 'Penne Pasta', quantity: 500, unit: 'g' },
];

describe('recipeMatching', () => {
  it('normalizes names: case, accents, plurals', () => {
    expect(normalizeName('Tomatoes')).toBe('tomato');
    expect(normalizeName('Berries')).toBe('berry');
    expect(normalizeName('Pão de Queijo')).toBe('pao de queijo');
    expect(normalizeName('Swiss Cheese')).toBe('swiss cheese');
  });

  it('finds exact matches before containment', () => {
    expect(findPantryMatch('tomato', pantry)?.id).toBe('p2');
    expect(findPantryMatch('Pasta', pantry)?.id).toBe('p5');
    expect(findPantryMatch('Boneless Chicken Breast', pantry)?.id).toBe('p1');
    expect(findPantryMatch('Garlic', pantry)).toBeNull();
  });

  it('converts compatible units only', () => {
    expect(convertQuantity(500, 'g', 'kg')).toBe(0.5);
    expect(convertQuantity(1.5, 'L', 'ml')).toBe(1500);
    expect(convertQuantity(2, null, 'item')).toBe(2);
    expect(convertQuantity(2, 'tbsp', 'bottle')).toBeNull();
    expect(convertQuantity(2, 'g', 'ml')).toBeNull();
  });

  it('classifies have / low / missing / staple and computes deductions', () => {
    const matches = matchIngredientsToPantry(
      [
        ing({ name: 'Chicken Breast', quantity: 600, unit: 'g', category: 'poultry' }),
        ing({ name: 'Tomato', quantity: 6 }),
        ing({ name: 'Olive Oil', quantity: 2, unit: 'tbsp', category: 'condiments' }),
        ing({ name: 'Milk', quantity: 200, unit: 'ml', category: 'dairy' }),
        ing({ name: 'Salt', staple: true, category: 'spices' }),
        ing({ name: 'Garlic', quantity: 2, unit: 'clove' }),
      ],
      pantry
    );
    expect(matches.map((m) => m.status)).toEqual(['have', 'low', 'have', 'missing', 'staple', 'missing']);
    expect(matches[0].deductQuantity).toBe(0.6);
    expect(matches[1].deductQuantity).toBe(4); // clamped to what's available
    expect(matches[2].deductQuantity).toBeNull(); // tbsp vs bottle
  });

  it('scales needed quantities', () => {
    const [m] = matchIngredientsToPantry([ing({ name: 'Penne Pasta', quantity: 300, unit: 'g', category: 'pasta' })], pantry, 2);
    expect(m.needed).toBe(600);
    expect(m.status).toBe('low');
    expect(m.deductQuantity).toBe(500);
  });

  it('builds grocery rows for missing items, skipping ones already on the list', () => {
    const matches = matchIngredientsToPantry(
      [
        ing({ name: 'Garlic', quantity: 2, unit: 'clove' }),
        ing({ name: 'Milk', quantity: 1, unit: 'L', category: 'dairy' }),
        ing({ name: 'Onions', quantity: 2 }),
        ing({ name: 'Salt', staple: true }),
      ],
      pantry
    );
    const rows = groceryItemsForMatches(matches, [
      { name: 'Onion', is_purchased: false },
      { name: 'Garlic', is_purchased: true },
    ]);
    expect(rows).toEqual([
      { name: 'Garlic', emoji: '🥕', category: 'vegetables', quantity: 1, unit: 'item', target_location: 'fridge' },
      { name: 'Milk', emoji: '🥕', category: 'dairy', quantity: 1, unit: 'L', target_location: 'fridge' },
    ]);
  });

  it('formats quantities with kitchen fractions', () => {
    expect(formatQuantity(null)).toBe('');
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.75)).toBe('1¾');
    expect(formatQuantity(1.333)).toBe('1⅓');
    expect(formatQuantity(2.4)).toBe('2.4');
  });
});
