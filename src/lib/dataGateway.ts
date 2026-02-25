import { supabase } from './supabase';

export const data = {
  // APP SETTINGS
  async getAppSettings() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
  async updateAppSettings(updates: any) {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        id: 'default',
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // MEMBERS
  async listMembers() {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching family members:', error);
      return [];
    }
  },
  async saveMembers(rows: any[]) {
    try {
      const { error } = await supabase
        .from('family_members')
        .upsert(rows);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving family members:', error);
      throw error;
    }
  },

  // MEALS LIBRARY
  async listMeals() {
    try {
      const { data: rows, error } = await supabase.from('meals').select('*').order('name', { ascending: true });
      if (!error && rows) return rows;
    } catch {}
    return [];
  },
  async addMeal(meal: any) {
    try {
      const { error } = await supabase.from('meals').insert(meal);
      if (!error) return;
    } catch {}
  },

  // PLAN (by ISO date)
  async getPlan() {
    try {
      const { data: rows, error } = await supabase.from('meal_plans').select('*');
      if (!error && rows) {
        // convert array rows -> map
        const map: Record<string, any> = {};
        for (const r of rows) map[r.date] = { lunch: r.lunch, dinner: r.dinner };
        return map;
      }
    } catch {}
    return {};
  },
  async setPlan(map: Record<string, any>) {
    try {
      // convert map -> array upsert
      const rows = Object.entries(map).map(([date, v]: any) => ({ date, lunch: v.lunch ?? null, dinner: v.dinner ?? null }));
      const { error } = await supabase.from('meal_plans').upsert(rows);
      if (!error) return;
    } catch {}
  },
};