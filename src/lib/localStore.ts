type StoreKey =
  | 'family_members'
  | 'meals'
  | 'meal_plan'        // { [isoDate]: { lunch?: mealId, dinner?: mealId } }
  | 'activities'
  | 'freezer_meals';   // Array<{ id:string, name:string, emoji?:string, qty:number }>

// Removed seed data - using Supabase only

function k<T extends StoreKey>(key: T): T { return key; }

export function getItem<T = any>(key: StoreKey): T {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw) as T; } catch { /* fallthrough */ }
  }
  // Return null if no data found - let Supabase handle the data
  return null as T;
}

export function setItem<T = any>(key: StoreKey, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Convenience helpers */
export const store = {
  getMembers: () => getItem<any[]>(k('family_members')),
  setMembers: (v: any) => setItem('family_members', v),

  getMeals: () => getItem<any[]>(k('meals')),
  setMeals: (v: any) => setItem('meals', v),

  getPlan: () => getItem<Record<string, { lunch?: string; dinner?: string }>>(k('meal_plan')),
  setPlan: (v: any) => setItem('meal_plan', v),

  getActivities: () => getItem<any[]>(k('activities')),
  setActivities: (v: any) => setItem('activities', v),

  getFreezer: () => getItem<any[]>(k('freezer_meals')),
  setFreezer: (v: any) => setItem('freezer_meals', v),
};