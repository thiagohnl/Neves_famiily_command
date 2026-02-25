import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chore, FamilyMember } from '../types';

export const useChores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (membersError) throw membersError;
      setFamilyMembers(membersData || []);
      
      const { data: choresData, error: choresError } = await supabase
        .from('chores')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (choresError) throw choresError;
      setChores(choresData || []);
      
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const completeChore = async (choreId: string, points: number, assignedTo: string) => {
    try {
      const { error: choreError } = await supabase
        .from('chores')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', choreId);
      if (choreError) throw choreError;

      const { error: rpcError } = await supabase.rpc('increment_points', {
        member_id: assignedTo,
        points_to_add: points,
      });
      if (rpcError) throw rpcError;

      return true;
    } catch (error) {
      console.error('Error completing chore:', error);
      return false;
    }
  };

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    try {
      const success = await completeChore(choreId, points, assignedTo);
      if (success) {
        await loadData();
      }
      return success;
    } catch (err) {
      console.error('Error completing chore:', err);
      setError('Failed to complete chore');
      return false;
    }
  };

  const handleAddChore = async (choreData: Partial<Omit<Chore, 'id'>>) => {
    try {
      if (!choreData.name?.trim() || !choreData.assigned_to) {
        throw new Error('Chore name and assignee are required');
      }

      const { data, error } = await supabase
        .from('chores')
        .insert({
          name: choreData.name,
          assigned_to: choreData.assigned_to,
          points: choreData.points,
          emoji: choreData.emoji,
          scheduled_time: choreData.scheduled_time,
          recurring_days: choreData.recurring_days, // Corrected from 'day'
          is_completed: false,
        })
        .select();

      if (error) throw error;
      
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error adding chore:', err);
      setError(err.message || 'Failed to add chore');
      return false;
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  return {
    chores,
    familyMembers,
    loading,
    error,
    completeChore: handleCompleteChore,
    addChore: handleAddChore,
    refetch: loadData
  };
};