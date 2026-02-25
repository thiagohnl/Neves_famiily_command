import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FunIdea {
  id: string;
  name: string;
  category?: string;
  notes?: string;
  emoji?: string;
  created_at?: string;
  location?: string;
  cost?: string;
  google_maps_link?: string;
  is_favorite?: boolean;
  scheduled_date?: string;
}

export const useFunIdeas = () => {
  const [ideas, setIdeas] = useState<FunIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('fun_ideas')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setIdeas(data || []);
    } catch (err) {
      console.error('Error fetching fun ideas:', err);
      setError('Failed to load fun ideas');
    } finally {
      setLoading(false);
    }
  };

  const addIdea = async (ideaData: Omit<FunIdea, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('fun_ideas')
        .insert([ideaData])
        .select()
        .single();
      
      if (error) throw error;
      
      setIdeas(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding fun idea:', err);
      throw err;
    }
  };

  const updateIdea = async (id: string, updates: Partial<FunIdea>) => {
    try {
      const { data, error } = await supabase
        .from('fun_ideas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setIdeas(prev => prev.map(idea => idea.id === id ? data : idea));
      return data;
    } catch (err) {
      console.error('Error updating fun idea:', err);
      throw err;
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fun_ideas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setIdeas(prev => prev.filter(idea => idea.id !== id));
    } catch (err) {
      console.error('Error deleting fun idea:', err);
      throw err;
    }
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const { data, error } = await supabase
        .from('fun_ideas')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setIdeas(prev => prev.map(idea => idea.id === id ? data : idea));
      return data;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  return {
    ideas,
    loading,
    error,
    refetch: fetchIdeas,
    addIdea,
    updateIdea,
    deleteIdea,
    toggleFavorite
  };
};