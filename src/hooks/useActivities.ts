import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, PlannedActivity } from '../types';

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('name');
      
      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch planned activities with activity details
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_activities')
        .select(`
          *,
          activity:activities(*)
        `)
        .order('date', { ascending: false });
      
      if (plannedError) throw plannedError;
      setPlannedActivities(plannedData || []);

    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (activityData: Partial<Activity>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select()
        .single();
      
      if (error) throw error;
      setActivities(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setActivities(prev => prev.map(a => a.id === id ? data : a));
      return data;
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      throw err;
    }
  };

  const scheduleActivity = async (activityId: string, date: string, memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('planned_activities')
        .insert({
          activity_id: activityId,
          date,
          member_id: memberId
        })
        .select(`
          *,
          activity:activities(*)
        `)
        .single();
      
      if (error) throw error;
      setPlannedActivities(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error scheduling activity:', err);
      throw err;
    }
  };

  const unscheduleActivity = async (plannedActivityId: string) => {
    try {
      const { error } = await supabase
        .from('planned_activities')
        .delete()
        .eq('id', plannedActivityId);
      
      if (error) throw error;
      setPlannedActivities(prev => prev.filter(pa => pa.id !== plannedActivityId));
    } catch (err) {
      console.error('Error unscheduling activity:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return { 
    activities, 
    plannedActivities, 
    loading, 
    error, 
    refetch: fetchAll,
    addActivity,
    updateActivity,
    deleteActivity,
    scheduleActivity,
    unscheduleActivity
  };
};