import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, Calendar, Trophy, Star, RotateCcw } from 'lucide-react';
import { FamilyMember, Chore } from '../types';
import toast from 'react-hot-toast';

interface CleaningTask {
  id: string;
  name: string;
  room: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  assignedTo?: string;
  lastCompleted?: string;
  emoji: string;
  description?: string;
}

interface CleaningProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  isParentMode: boolean;
  onAddChore: (choreData: any) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export const Cleaning: React.FC<CleaningProps> = ({
  familyMembers,
  chores,
  isParentMode,
  onAddChore,
  onRefresh
}) => {
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([
    {
      id: '1',
      name: 'Vacuum Living Room',
      room: 'Living Room',
      frequency: 'Weekly',
      difficulty: 'Medium',
      points: 10,
      emoji: '🧹',
      description: 'Vacuum all carpets and rugs in the living room'
    },
    {
      id: '2',
      name: 'Clean Bathroom Mirror',
      room: 'Bathroom',
      frequency: 'Weekly',
      difficulty: 'Easy',
      points: 5,
      emoji: '🪞',
      description: 'Clean and polish bathroom mirrors'
    },
    {
      id: '3',
      name: 'Deep Clean Kitchen',
      room: 'Kitchen',
      frequency: 'Monthly',
      difficulty: 'Hard',
      points: 20,
      emoji: '🧽',
      description: 'Deep clean counters, appliances, and cabinets'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');

  const [newTask, setNewTask] = useState({
    name: '',
    room: 'Living Room',
    frequency: 'Weekly' as const,
    difficulty: 'Medium' as const,
    points: 10,
    emoji: '🧹',
    description: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    room: 'Living Room',
    frequency: 'Weekly' as const,
    difficulty: 'Medium' as const,
    points: 10,
    emoji: '🧹',
    description: ''
  });

  const rooms = ['Living Room', 'Kitchen', 'Bathroom', 'Bedroom', 'Dining Room', 'Office', 'Garage', 'Basement'];
  const frequencies = ['Daily', 'Weekly', 'Monthly'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const commonEmojis = ['🧹', '🧽', '🪞', '🚿', '🛏️', '🍽️', '🗑️', '🧴', '🧯', '🪣', '🧼', '🪟'];

  const filteredTasks = cleaningTasks.filter(task => {
    if (filterRoom !== 'all' && task.room !== filterRoom) return false;
    if (filterFrequency !== 'all' && task.frequency !== filterFrequency) return false;
    return true;
  });

  const getPointsForDifficulty = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 5;
      case 'Medium': return 10;
      case 'Hard': return 20;
      default: return 10;
    }
  };

  const handleAddTask = () => {
    if (!newTask.name.trim()) return;

    const task: CleaningTask = {
      id: Date.now().toString(),
      ...newTask,
      name: newTask.name.trim(),
      points: getPointsForDifficulty(newTask.difficulty)
    };

    setCleaningTasks([...cleaningTasks, task]);
    setNewTask({
      name: '',
      room: 'Living Room',
      frequency: 'Weekly',
      difficulty: 'Medium',
      points: 10,
      emoji: '🧹',
      description: ''
    });
    setShowAddForm(false);
    toast.success('Cleaning task added successfully!');
  };

  const startEdit = (task: CleaningTask) => {
    setEditingTask(task.id);
    setEditForm({
      name: task.name,
      room: task.room,
      frequency: task.frequency,
      difficulty: task.difficulty,
      points: task.points,
      emoji: task.emoji,
      description: task.description || ''
    });
  };

  const saveEdit = (taskId: string) => {
    if (!editForm.name.trim()) return;

    setCleaningTasks(cleaningTasks.map(task =>
      task.id === taskId
        ? { 
            ...task, 
            ...editForm, 
            name: editForm.name.trim(),
            points: getPointsForDifficulty(editForm.difficulty)
          }
        : task
    ));
    setEditingTask(null);
    toast.success('Cleaning task updated successfully!');
  };

  const deleteTask = (taskId: string, taskName: string) => {
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) return;

    setCleaningTasks(cleaningTasks.filter(task => task.id !== taskId));
    toast.success('Cleaning task deleted successfully!');
  };

  const assignToChores = async (task: CleaningTask) => {
    if (!task.assignedTo) {
      toast.error('Please assign this task to a family member first');
      return;
    }

    const success = await onAddChore({
      name: task.name,
      assigned_to: task.assignedTo,
      points: task.points,
      scheduled_time: '09:00',
      emoji: task.emoji
    });

    if (success) {
      toast.success('Task added to chore board!');
    }
  };

  const assignTask = (taskId: string, memberId: string) => {
    setCleaningTasks(cleaningTasks.map(task =>
      task.id === taskId
        ? { ...task, assignedTo: memberId }
        : task
    ));
  };

  if (!isParentMode) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Parent Access Required</h3>
        <p className="text-gray-600">Only parents can manage cleaning tasks. Please enable Parent Mode to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-3xl p-6 shadow-lg border-2 border-pink-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🧹</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Cleaning Tasks</h1>
              <p className="text-gray-600">Manage recurring cleaning tasks and assignments</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <Plus size={24} />
            Add Task
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <h3 className="font-bold text-gray-800">Total Tasks</h3>
              <p className="text-2xl font-bold text-pink-600">{cleaningTasks.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⭐</div>
            <div>
              <h3 className="font-bold text-gray-800">Total Points</h3>
              <p className="text-2xl font-bold text-purple-600">
                {cleaningTasks.reduce((sum, task) => sum + task.points, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏠</div>
            <div>
              <h3 className="font-bold text-gray-800">Rooms</h3>
              <p className="text-2xl font-bold text-blue-600">
                {new Set(cleaningTasks.map(task => task.room)).size}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span>🏠</span>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            >
              <option value="all">All Rooms</option>
              {rooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500" size={20} />
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            >
              <option value="all">All Frequencies</option>
              {frequencies.map(freq => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Cleaning Task</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Name *</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="e.g., Vacuum living room"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                <select
                  value={newTask.room}
                  onChange={(e) => setNewTask({ ...newTask, room: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                >
                  {rooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select
                  value={newTask.frequency}
                  onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={newTask.difficulty}
                  onChange={(e) => setNewTask({ 
                    ...newTask, 
                    difficulty: e.target.value as any,
                    points: getPointsForDifficulty(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff} ({getPointsForDifficulty(diff)} points)</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Brief description of the task..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTask.emoji}
                    onChange={(e) => setNewTask({ ...newTask, emoji: e.target.value })}
                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center text-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewTask({ ...newTask, emoji })}
                        className="w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTask.name.trim()}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🧹</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">No cleaning tasks found</h3>
            <p className="text-gray-500">Add some cleaning tasks to get started!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              {editingTask === task.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none font-bold text-lg"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingTask(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(task.id)}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2"
                    >
                      <Save size={16} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{task.emoji}</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{task.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-medium">
                            {task.room}
                          </span>
                          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                            {task.frequency}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id, task.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Star size={16} />
                      <span>{task.difficulty} - {task.points} points</span>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Assign to:</label>
                      <select
                        value={task.assignedTo || ''}
                        onChange={(e) => assignTask(task.id, e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select member</option>
                        {familyMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.avatar} {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => assignToChores(task)}
                      disabled={!task.assignedTo}
                      className="w-full px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add to Chore Board
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
};