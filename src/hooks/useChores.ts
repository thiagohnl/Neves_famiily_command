import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chore, FamilyMember, GoalSeasonKey } from '../types';
import { incrementSeasonGoal } from '../lib/seasonGoalsApi';
import { isSeasonBonusId } from '../seasons/birthdays';

/** The season whose points goal a completion also counts towards. */
export interface SeasonGoalRef {
  seasonKey: GoalSeasonKey;
  year: number;
}

export const useChores = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      // Recurring chores completed on a previous day become pending again today
      let allChores: Chore[] = choresData || [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const staleIds = allChores
        .filter(c => c.is_completed && (c.recurring_days?.length ?? 0) > 0 && (!c.completed_at || new Date(c.completed_at) < todayStart))
        .map(c => c.id);
      if (staleIds.length > 0) {
        const { error: resetError } = await supabase
          .from('chores')
          .update({ is_completed: false, completed_at: null })
          .in('id', staleIds);
        if (resetError) throw resetError;
        allChores = allChores.map(c => staleIds.includes(c.id) ? { ...c, is_completed: false, completed_at: undefined } : c);
      }
      setChores(allChores);
      
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const completeChore = async (choreId: string, points: number, assignedTo: string, seasonGoal?: SeasonGoalRef) => {
    try {
      // season_bonus path: generated chores (birthday gifts, wellies) aren't rows in the chores
      // table; only the points move. App records the completion in app_settings.
      if (!isSeasonBonusId(choreId)) {
        const { error: choreError } = await supabase
          .from('chores')
          .update({ is_completed: true, completed_at: new Date().toISOString() })
          .eq('id', choreId);
        if (choreError) throw choreError;
      }

      const { error: rpcError } = await supabase.rpc('increment_points', {
        member_id: assignedTo,
        points_to_add: points,
      });
      if (rpcError) throw rpcError;

      if (seasonGoal) {
        // The chore and points are already saved; a missing goal must not undo the completion
        try {
          await incrementSeasonGoal(assignedTo, seasonGoal.seasonKey, seasonGoal.year, points);
        } catch (goalError) {
          console.error('Error updating season goal:', goalError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error completing chore:', error);
      return false;
    }
  };

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string, seasonGoal?: SeasonGoalRef) => {
    try {
      const success = await completeChore(choreId, points, assignedTo, seasonGoal);
      if (success) {
        // Show the completion right away, then sync quietly (no loading state)
        const completedAt = new Date().toISOString();
        setChores(prev => prev.map(c => (c.id === choreId ? { ...c, is_completed: true, completed_at: completedAt } : c)));
        setFamilyMembers(prev => prev.map(m => (m.id === assignedTo ? { ...m, points: m.points + points } : m)));
        await loadData(true);
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

      const { error } = await supabase
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
    } catch (err) {
      console.error('Error adding chore:', err);
      setError(err instanceof Error && err.message ? err.message : 'Failed to add chore');
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