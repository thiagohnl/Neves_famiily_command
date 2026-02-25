import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Calendar, Star, Filter, CheckCircle, Clock } from 'lucide-react';
import { FamilyMember, Chore, ChorePoints } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { EmojiPicker } from './EmojiPicker';
import { ALL_CHORE_EMOJIS, searchChoreEmojis } from '../constants/chore_emojis'; // <--- THIS LINE IS THE FIX
import dayjs from 'dayjs';

// Define the shape of the form data for a new chore
const initialNewChoreState = {
  name: '',
  assigned_to_multi: [] as string[],
  points: 5 as ChorePoints,
  recurring_days: [] as string[],
  emoji: '📋',
  scheduled_time: '09:00',
  end_time: '10:00',
};

// --- Child Component: ChoreForm ---
const ChoreForm = ({
  familyMembers,
  onSave,
  onCancel,
  chore,
  setChore,
  isLoading,
  isEditing
}: {
  familyMembers: FamilyMember[];
  onSave: () => void;
  onCancel: () => void;
  chore: any;
  setChore: (chore: any) => void;
  isLoading: boolean;
  isEditing: boolean;
}) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleMemberToggle = (memberId: string) => {
    const currentMembers = chore.assigned_to_multi || [];
    const newMembers = currentMembers.includes(memberId)
      ? currentMembers.filter((id: string) => id !== memberId)
      : [...currentMembers, memberId];
    setChore({ ...chore, assigned_to_multi: newMembers });
  };
  
  const handleDayToggle = (day: string) => {
    const currentDays = chore.recurring_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d: string) => d !== day)
      : [...currentDays, day];
    setChore({ ...chore, recurring_days: newDays });
  };

  return (
      <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Chore Name *</label><input type="text" value={chore.name} onChange={(e) => setChore({ ...chore, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div>
          {!isEditing ? (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to * (select multiple)</label>
                <div className="flex flex-wrap gap-2">{familyMembers.map(member => (<button key={member.id} onClick={() => handleMemberToggle(member.id)} className={`px-3 py-1 text-sm rounded-full border ${chore.assigned_to_multi?.includes(member.id) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300'}`}>{member.name}</button>))}</div>
            </div>
          ) : (
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to</label>
                  <select value={chore.assigned_to} onChange={e => setChore({...chore, assigned_to: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {familyMembers.map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}
                  </select>
              </div>
          )}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Days</label>
              <div className="flex flex-wrap gap-2">{daysOfWeek.map(day => (<button key={day} onClick={() => handleDayToggle(day)} className={`px-3 py-1 text-sm rounded-full border ${chore.recurring_days?.includes(day) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300'}`}>{day.substring(0,3)}</button>))}</div>
              <p className="text-xs text-gray-500 mt-1">Select days for this chore to repeat. Leave blank for a floating task.</p>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Points</label><select value={chore.points} onChange={(e) => setChore({ ...chore, points: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value={5}>5 (Easy)</option><option value={10}>10 (Medium)</option><option value={20}>20 (Hard)</option></select></div>
          <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label><input type="time" value={chore.scheduled_time} onChange={(e) => setChore({ ...chore, scheduled_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">End Time</label><input type="time" value={chore.end_time || ''} onChange={(e) => setChore({ ...chore, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
            <EmojiPicker 
              value={chore.emoji} 
              onChange={(emoji) => setChore({ ...chore, emoji })} 
              emojiData={ALL_CHORE_EMOJIS} 
              searchFunction={searchChoreEmojis} 
            />
          </div>
          <div className="flex gap-3 pt-4"><button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">Cancel</button><button onClick={onSave} disabled={isLoading} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg">{isLoading ? 'Saving...' : 'Save'}</button></div>
      </div>
  )
};

// --- Main Component: ChoreManagement ---
const ChoreManagement: React.FC<ChoreManagementProps> = ({
  familyMembers,
  chores,
  isParentMode,
  onAddChore,
  onRefresh
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [newChore, setNewChore] = useState(initialNewChoreState);

  const filteredChores = chores.filter(chore => {
    if (filterMember !== 'all' && chore.assigned_to !== filterMember) return false;
    if (filterStatus === 'completed' && !chore.is_completed) return false;
    if (filterStatus === 'pending' && chore.is_completed) return false;
    return true;
  });

  const handleAddChores = async () => {
    if (!newChore.name.trim() || newChore.assigned_to_multi.length === 0) {
      toast.error("Please provide a name and assign the chore to at least one person.");
      return;
    }
    setIsLoading(true);
    const chorePromises = newChore.assigned_to_multi.map(memberId =>
      onAddChore({
        name: newChore.name.trim(),
        assigned_to: memberId,
        points: newChore.points,
        recurring_days: newChore.recurring_days,
        emoji: newChore.emoji,
        scheduled_time: newChore.scheduled_time,
        end_time: newChore.end_time
      })
    );
    try {
      await Promise.all(chorePromises);
      setNewChore(initialNewChoreState);
      setShowAddForm(false);
      toast.success('Chores added successfully!');
      await onRefresh();
    } catch (e) { toast.error('Some chores could not be added.'); } 
    finally { setIsLoading(false); }
  };
  
  const handleUpdateChore = async (choreData: Chore) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('chores').update({
        name: choreData.name,
        assigned_to: choreData.assigned_to,
        points: choreData.points,
        recurring_days: choreData.recurring_days,
        scheduled_time: choreData.scheduled_time,
        end_time: choreData.end_time,
        emoji: choreData.emoji
      }).eq('id', choreData.id);
      if (error) throw error;
      await onRefresh();
      setEditingChore(null);
      toast.success("Chore updated!");
    } catch(e) { toast.error("Failed to update chore."); } 
    finally { setIsLoading(false); }
  };

  const deleteChore = async (choreId: string, choreName: string) => {
    if (!confirm(`Are you sure you want to delete "${choreName}"?`)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('chores').delete().eq('id', choreId);
      if (error) throw error;
      await onRefresh();
      toast.success('Chore deleted successfully!');
    } catch (error) { toast.error('Failed to delete chore'); }
    finally { setIsLoading(false); }
  };
  
  const completeChore = async (chore: Chore) => {
    setIsLoading(true);
    try {
      const { error: choreError } = await supabase.from('chores').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', chore.id);
      if (choreError) throw choreError;
      
      const { error: rpcError } = await supabase.rpc('increment_points', { member_id: chore.assigned_to, points_to_add: chore.points });
      if (rpcError) throw rpcError;
      
      await onRefresh();
      toast.success('Chore completed! 🎉');
    } catch (error) { toast.error('Failed to complete chore'); }
    finally { setIsLoading(false); }
  };

  if (!isParentMode) { return <div className="text-center py-16"><div className="text-8xl mb-4">🔒</div><h3 className="text-2xl font-bold text-gray-800 mb-2">Parent Access Required</h3><p className="text-gray-600">Only parents can manage chores.</p></div>; }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 rounded-3xl p-6 shadow-lg border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="text-4xl">📋</div><div><h1 className="text-3xl font-bold text-gray-800">Chore Management</h1><p className="text-gray-600">Manage all family chores, tasks, and schedules</p></div></div>
          <button onClick={() => setShowAddForm(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"><Plus size={20} /> Add Chore</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center"><div className="flex items-center gap-2"><Filter className="text-gray-500" size={20} /><span className="font-medium text-gray-700">Filters:</span></div>
          <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg"><option value="all">All Family Members</option>{familyMembers.map(member => (<option key={member.id} value={member.id}>{member.avatar} {member.name}</option>))}</select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg"><option value="all">All Status</option><option value="pending">Pending</option><option value="completed">Completed</option></select>
        </div>
      </motion.div>

      <AnimatePresence>
        {(showAddForm || editingChore) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingChore ? 'Edit Chore' : 'Add New Chore'}</h2>
            <ChoreForm 
              familyMembers={familyMembers} 
              onSave={editingChore ? () => handleUpdateChore(editingChore) : handleAddChores} 
              onCancel={() => { setShowAddForm(false); setEditingChore(null); }} 
              chore={editingChore || newChore} 
              setChore={editingChore ? setEditingChore as any : setNewChore} 
              isLoading={isLoading}
              isEditing={!!editingChore}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChores.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg"><div className="text-6xl mb-4">📋</div><h3 className="text-xl font-bold text-gray-600 mb-2">No chores found</h3><p className="text-gray-500">Add some chores to get started!</p></div>
        ) : (
          filteredChores.map((chore) => {
            const member = familyMembers.find(m => m.id === chore.assigned_to);
            return (
              <div key={chore.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3"><div className="text-3xl">{chore.emoji || '📋'}</div><div><h3 className="text-lg font-bold text-gray-800">{chore.name}</h3>{chore.is_completed && (<span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mt-1">✅ Completed</span>)}</div></div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingChore(chore)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => deleteChore(chore.id, chore.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2"><span>Assigned to: {member?.name || 'Unknown'}</span></div>
                      <div className="flex items-center gap-2"><Star size={16} /><span>{chore.points} points</span></div>
                      {chore.recurring_days && chore.recurring_days.length > 0 && (<div className="flex items-center gap-2"><Calendar size={16} /><span>{chore.recurring_days.join(', ')}</span></div>)}
                      {chore.scheduled_time && (<div className="flex items-center gap-2"><Clock size={16} /><span>{dayjs(`1970-01-01T${chore.scheduled_time}`).format('h:mm A')}{chore.end_time && ` - ${dayjs(`1970-01-01T${chore.end_time}`).format('h:mm A')}`}</span></div>)}
                    </div>
                    {!chore.is_completed && (<button onClick={() => completeChore(chore)} disabled={isLoading} className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">{isLoading ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>) : (<><CheckCircle size={16} />Mark Complete</>)}</button>)}
                  </div>
              </div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default ChoreManagement;