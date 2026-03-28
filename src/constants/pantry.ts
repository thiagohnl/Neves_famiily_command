// src/constants/pantry.ts

export const PANTRY_LOCATIONS = ['fridge', 'freezer', 'cupboard'] as const;
export type PantryLocation = (typeof PANTRY_LOCATIONS)[number];

export const PANTRY_CATEGORIES = [
  'dairy',
  'meat',
  'poultry',
  'fish',
  'vegetables',
  'fruit',
  'grains',
  'pasta',
  'canned',
  'condiments',
  'spices',
  'snacks',
  'drinks',
  'baking',
  'frozen',
  'other',
] as const;
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_UNITS = [
  'item',
  'kg',
  'g',
  'L',
  'ml',
  'pack',
  'bag',
  'bottle',
  'can',
  'box',
  'bunch',
  'loaf',
] as const;
export type PantryUnit = (typeof PANTRY_UNITS)[number];

export const LOCATION_LABELS: Record<PantryLocation, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  cupboard: 'Cupboard',
};

export const LOCATION_EMOJIS: Record<PantryLocation, string> = {
  fridge: '🧊',
  freezer: '❄️',
  cupboard: '🗄️',
};

export const CATEGORY_EMOJIS: Record<PantryCategory, string> = {
  dairy: '🥛',
  meat: '🥩',
  poultry: '🍗',
  fish: '🐟',
  vegetables: '🥬',
  fruit: '🍎',
  grains: '🌾',
  pasta: '🍝',
  canned: '🥫',
  condiments: '🧴',
  spices: '🧂',
  snacks: '🍪',
  drinks: '🥤',
  baking: '🧁',
  frozen: '🧊',
  other: '📦',
};
