import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Star, Sunrise, Flame, Zap } from 'lucide-react';
import { FamilyMember, Chore } from '../types';
import { ChoreCalendar } from './ChoreCalendar';

interface FamilyDashboardProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  onRefresh: () => Promise<void>;
}

export const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ familyMembers, chores, onRefresh }) => {
  const dashboardData = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const completedChores = chores.filter(chore => chore.is_completed);
    const weeklyCompletedChores = completedChores.filter(chore => {
      if (!chore.completed_at) return false;
      const completedDate = new Date(chore.completed_at);
      return completedDate >= weekStart;
    });

    // Calculate achievements
    const memberStats = familyMembers.map(member => {
      const memberChores = completedChores.filter(chore => chore.assigned_to === member.id);
      const weeklyChores = weeklyCompletedChores.filter(chore => chore.assigned_to === member.id);
      const weeklyPoints = weeklyChores.reduce((sum, chore) => sum + chore.points, 0);
      
      // Calculate streak (simplified - consecutive days with completed chores)
      const recentChores = memberChores
        .filter(chore => chore.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
      
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dayChores = recentChores.filter(chore => {
          const choreDate = new Date(chore.completed_at!);
          return choreDate.toDateString() === checkDate.toDateString();
        });
        if (dayChores.length > 0) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      // Early bird check (completed before 10 AM)
      const earlyChores = weeklyChores.filter(chore => {
        if (!chore.completed_at) return false;
        const completedHour = new Date(chore.completed_at).getHours();
        return completedHour < 10;
      });

      return {
        ...member,
        weeklyChores: weeklyChores.length,
        weeklyPoints,
        streak,
        earlyChores: earlyChores.length,
        totalCompleted: memberChores.length
      };
    });

    // Sort by current points from database for leaderboard
    const leaderboard = [...memberStats].sort((a, b) => b.points - a.points);
    
    // Find achievements
    const highestWeeklyPoints = Math.max(...memberStats.map(m => m.weeklyPoints));
    const longestStreak = Math.max(...memberStats.map(m => m.streak));
    const mostEarlyBird = Math.max(...memberStats.map(m => m.earlyChores));
    
    // Calculate improvement (simplified - compare current week to previous week points)
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekChores = completedChores.filter(chore => {
      if (!chore.completed_at) return false;
      const completedDate = new Date(chore.completed_at);
      return completedDate >= prevWeekStart && completedDate < weekStart;
    });
    
    const improvements = memberStats.map(member => {
      const prevWeekPoints = prevWeekChores
        .filter(chore => chore.assigned_to === member.id)
        .reduce((sum, chore) => sum + chore.points, 0);
      return {
        ...member,
        improvement: member.weeklyPoints - prevWeekPoints
      };
    });
    const mostImproved = improvements.reduce((max, member) => 
      member.improvement > max.improvement ? member : max, improvements[0]);

    return {
      leaderboard,
      weeklyTotal: weeklyCompletedChores.length,
      weeklyGoal: Math.max(20, familyMembers.length * 7), // Dynamic goal based on family size
      achievements: {
        highestPoints: memberStats.find(m => m.weeklyPoints === highestWeeklyPoints),
        longestStreak: memberStats.find(m => m.streak === longestStreak),
        mostEarlyBird: memberStats.find(m => m.earlyChores === mostEarlyBird),
        mostImproved: mostImproved?.improvement > 0 ? mostImproved : null
      }
    };
  }, [familyMembers, chores]);

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const progressPercentage = Math.min(100, (dashboardData.weeklyTotal / dashboardData.weeklyGoal) * 100);

  if (familyMembers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-4">👨‍👩‍👧‍👦</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">No family members yet</h3>
        <p className="text-gray-600">Add family members to see the dashboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Chore Calendar */}
      <ChoreCalendar
        familyMembers={familyMembers}
        chores={chores}
        onRefresh={onRefresh}
      />

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-yellow-500" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Family Leaderboard</h2>
        </div>
        
        <div className="space-y-4">
          {dashboardData.leaderboard.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-4 p-4 rounded-2xl ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' : 'bg-gray-50'
              }`}
            >
              <div className="text-4xl">{getRankEmoji(index)}</div>
              <div className="flex-shrink-0">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="text-4xl">{member.avatar}</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800">{member.name}</h3>
                <p className="text-lg text-gray-600">#{index + 1} • {member.points} points</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{member.points}</div>
                <div className="text-sm text-gray-500">total points</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="text-blue-500" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Weekly Progress</h2>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xl font-medium text-gray-700">Family Goal Progress</span>
            <span className="text-2xl font-bold text-blue-600">
              {dashboardData.weeklyTotal}/{dashboardData.weeklyGoal}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-6 rounded-full ${getProgressColor(progressPercentage)} flex items-center justify-center`}
            >
              <span className="text-white font-bold text-sm">
                {Math.round(progressPercentage)}%
              </span>
            </motion.div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-2xl">
            <div className="text-3xl font-bold text-green-600">{dashboardData.weeklyTotal}</div>
            <div className="text-sm text-gray-600">Chores Done</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-2xl">
            <div className="text-3xl font-bold text-blue-600">{dashboardData.weeklyGoal}</div>
            <div className="text-sm text-gray-600">Weekly Goal</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-2xl">
            <div className="text-3xl font-bold text-purple-600">
              {Math.max(0, dashboardData.weeklyGoal - dashboardData.weeklyTotal)}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-2xl">
            <div className="text-3xl font-bold text-yellow-600">
              {familyMembers.reduce((sum, member) => sum + member.points, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
        </div>
      </motion.div>

      {/* Achievement Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <Star className="text-purple-500" size={32} />
          <h2 className="text-3xl font-bold text-gray-800">Family Achievements</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Highest Weekly Points */}
          {dashboardData.achievements.highestPoints && dashboardData.achievements.highestPoints.weeklyPoints > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-yellow-100 to-orange-100 p-6 rounded-2xl text-center border-2 border-yellow-200"
            >
              <div className="text-4xl mb-3">🌟</div>
              <h3 className="text-lg font-bold text-orange-800 mb-2">Weekly Champion!</h3>
              <div className="mb-2">
                {dashboardData.achievements.highestPoints.photo_url ? (
                  <img
                    src={dashboardData.achievements.highestPoints.photo_url}
                    alt={dashboardData.achievements.highestPoints.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 mx-auto"
                  />
                ) : (
                  <div className="text-3xl">{dashboardData.achievements.highestPoints.avatar}</div>
                )}
              </div>
              <p className="text-orange-700 font-medium">{dashboardData.achievements.highestPoints.name}</p>
              <p className="text-sm text-orange-600">{dashboardData.achievements.highestPoints.weeklyPoints} points this week</p>
            </motion.div>
          )}

          {/* Longest Streak */}
          {dashboardData.achievements.longestStreak && dashboardData.achievements.longestStreak.streak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-red-100 to-pink-100 p-6 rounded-2xl text-center border-2 border-red-200"
            >
              <div className="text-4xl mb-3">🔥</div>
              <h3 className="text-lg font-bold text-red-800 mb-2">On Fire!</h3>
              <div className="mb-2">
                {dashboardData.achievements.longestStreak.photo_url ? (
                  <img
                    src={dashboardData.achievements.longestStreak.photo_url}
                    alt={dashboardData.achievements.longestStreak.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-red-200 mx-auto"
                  />
                ) : (
                  <div className="text-3xl">{dashboardData.achievements.longestStreak.avatar}</div>
                )}
              </div>
              <p className="text-red-700 font-medium">{dashboardData.achievements.longestStreak.name}</p>
              <p className="text-sm text-red-600">{dashboardData.achievements.longestStreak.streak} day streak</p>
            </motion.div>
          )}

          {/* Early Bird */}
          {dashboardData.achievements.mostEarlyBird && dashboardData.achievements.mostEarlyBird.earlyChores > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-2xl text-center border-2 border-blue-200"
            >
              <div className="text-4xl mb-3">🐦</div>
              <h3 className="text-lg font-bold text-blue-800 mb-2">Early Bird!</h3>
              <div className="mb-2">
                {dashboardData.achievements.mostEarlyBird.photo_url ? (
                  <img
                    src={dashboardData.achievements.mostEarlyBird.photo_url}
                    alt={dashboardData.achievements.mostEarlyBird.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 mx-auto"
                  />
                ) : (
                  <div className="text-3xl">{dashboardData.achievements.mostEarlyBird.avatar}</div>
                )}
              </div>
              <p className="text-blue-700 font-medium">{dashboardData.achievements.mostEarlyBird.name}</p>
              <p className="text-sm text-blue-600">{dashboardData.achievements.mostEarlyBird.earlyChores} early completions</p>
            </motion.div>
          )}

          {/* Most Improved */}
          {dashboardData.achievements.mostImproved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-2xl text-center border-2 border-green-200"
            >
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-lg font-bold text-green-800 mb-2">Most Improved!</h3>
              <div className="mb-2">
                {dashboardData.achievements.mostImproved.photo_url ? (
                  <img
                    src={dashboardData.achievements.mostImproved.photo_url}
                    alt={dashboardData.achievements.mostImproved.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-200 mx-auto"
                  />
                ) : (
                  <div className="text-3xl">{dashboardData.achievements.mostImproved.avatar}</div>
                )}
              </div>
              <p className="text-green-700 font-medium">{dashboardData.achievements.mostImproved.name}</p>
              <p className="text-sm text-green-600">+{dashboardData.achievements.mostImproved.improvement} points improvement</p>
            </motion.div>
          )}
        </div>

        {/* No achievements message */}
        {!dashboardData.achievements.highestPoints?.weeklyPoints && 
         !dashboardData.achievements.longestStreak?.streak && 
         !dashboardData.achievements.mostEarlyBird?.earlyChores && 
         !dashboardData.achievements.mostImproved && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">Start completing chores to earn achievements!</h3>
            <p className="text-gray-500">Complete chores to unlock family badges and celebrations.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};