import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

interface WeeklyChallenge {
  week_start_date: string;
  key: string;
  target: number;
  progress_json: Record<string, any>;
  completed: boolean;
}

interface Achievement {
  key: string;
  title: string;
  emoji: string;
  description: string;
}

interface ChallengeInfo {
  key: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

const CHALLENGE_CONFIGS = {
  try_new_meal: {
    title: 'Try Something New',
    description: 'Plan a meal you haven\'t had in 60 days',
    target: 1
  },
  variety_three_veggies: {
    title: 'Veggie Variety',
    description: 'Plan 3 different veggie meals',
    target: 3
  },
  use_freezer_twice: {
    title: 'Freezer Hero',
    description: 'Use freezer items twice',
    target: 2
  }
};

export const useMealQuest = (weekStartDate: string, userId: string = 'family') => {
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAchievements, setUserAchievements] = useState<string[]>([]);

  const getWeekChallenge = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const config = CHALLENGE_CONFIGS[data.key as keyof typeof CHALLENGE_CONFIGS];
        const progress = data.progress_json as Record<string, any>;
        const current = progress.count || 0;

        setChallenge({
          key: data.key,
          title: config.title,
          description: config.description,
          target: data.target,
          current,
          completed: data.completed
        });
      } else {
        const challengeKeys = Object.keys(CHALLENGE_CONFIGS);
        const randomKey = challengeKeys[Math.floor(Math.random() * challengeKeys.length)];
        const config = CHALLENGE_CONFIGS[randomKey as keyof typeof CHALLENGE_CONFIGS];

        const { error: insertError } = await supabase
          .from('weekly_challenges')
          .insert({
            week_start_date: weekStartDate,
            key: randomKey,
            target: config.target,
            progress_json: { count: 0 },
            completed: false
          });

        if (insertError) throw insertError;

        setChallenge({
          key: randomKey,
          title: config.title,
          description: config.description,
          target: config.target,
          current: 0,
          completed: false
        });
      }
    } catch (error) {
      console.error('Error fetching weekly challenge:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  const fetchUserAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_key')
        .eq('user_id', userId);

      if (error) throw error;

      setUserAchievements(data?.map(a => a.achievement_key) || []);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    }
  }, [userId]);

  useEffect(() => {
    getWeekChallenge();
    fetchUserAchievements();
  }, [getWeekChallenge, fetchUserAchievements]);

  const awardXP = async (type: 'new_meal' | 'freezer_use' | 'challenge_complete', value: number, meta: Record<string, any> = {}) => {
    try {
      const { error } = await supabase
        .from('meal_xp_log')
        .insert({
          user_id: userId,
          type,
          value,
          meta
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const checkMealIsNew = async (mealId: string): Promise<boolean> => {
    try {
      const sixtyDaysAgo = dayjs().subtract(60, 'day').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('saved_meal_id', mealId)
        .gte('date', sixtyDaysAgo)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return !data;
    } catch (error) {
      console.error('Error checking meal history:', error);
      return false;
    }
  };

  const updateChallengeProgress = async (increment: number = 1) => {
    if (!challenge || challenge.completed) return;

    const newCurrent = challenge.current + increment;
    const isCompleted = newCurrent >= challenge.target;

    try {
      const { error } = await supabase
        .from('weekly_challenges')
        .update({
          progress_json: { count: newCurrent },
          completed: isCompleted
        })
        .eq('week_start_date', weekStartDate);

      if (error) throw error;

      setChallenge({
        ...challenge,
        current: newCurrent,
        completed: isCompleted
      });

      if (isCompleted && !challenge.completed) {
        await awardXP('challenge_complete', 3, { challenge_key: challenge.key });

        await supabase
          .from('user_achievements')
          .upsert({
            user_id: userId,
            achievement_key: 'chef_week'
          }, {
            onConflict: 'user_id,achievement_key'
          });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return false;
    }
  };

  const trackMealPlan = async (mealId: string | null) => {
    if (!mealId || !challenge) return false;

    const isNew = await checkMealIsNew(mealId);

    if (isNew) {
      await awardXP('new_meal', 2, { meal_id: mealId });

      if (challenge.key === 'try_new_meal') {
        return await updateChallengeProgress(1);
      }
    }

    return false;
  };

  const trackFreezerUse = async (freezerItemId: string) => {
    if (!challenge) return false;

    await awardXP('freezer_use', 1, { freezer_item_id: freezerItemId });

    if (challenge.key === 'use_freezer_twice') {
      return await updateChallengeProgress(1);
    }

    return false;
  };

  return {
    challenge,
    loading,
    userAchievements,
    trackMealPlan,
    trackFreezerUse,
    refetch: () => {
      getWeekChallenge();
      fetchUserAchievements();
    }
  };
};
