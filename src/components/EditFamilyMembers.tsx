import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FamilyMember } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { EmojiPicker } from './EmojiPicker';
import toast from 'react-hot-toast';

interface EditFamilyMembersProps {
  onBack: () => void;
}

export const EditFamilyMembers: React.FC<EditFamilyMembersProps> = ({ onBack }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', avatar: '' });
  const [addForm, setAddForm] = useState({ name: '', avatar: '👤' });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (member: FamilyMember) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, avatar: member.avatar });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', avatar: '' });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          name: editForm.name.trim(),
          avatar: editForm.avatar
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchMembers();
      setEditingId(null);
      setEditForm({ name: '', avatar: '' });
      toast.success('Member updated successfully!', {
        icon: '✅',
        duration: 2000,
      });
    } catch (err) {
      console.error('Error updating member:', err);
      toast.error('Failed to update member', {
        icon: '❌',
        duration: 3000,
      });
    }
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will also delete all their chores.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchMembers();
      toast.success('Member deleted');
    } catch (err) {
      console.error('Error deleting member:', err);
      toast.error('Failed to delete member');
    }
  };

  const addMember = async () => {
    if (!addForm.name.trim()) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .insert([{
          name: addForm.name.trim(),
          avatar: addForm.avatar,
          points: 0
        }]);

      if (error) throw error;
      
      await fetchMembers();
      setAddForm({ name: '', avatar: '👤' });
      setShowAddForm(false);
      toast.success('Family member added!', {
        icon: '🎉',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error('Failed to add member', {
        icon: '❌',
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading family members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-3xl">👨‍👩‍👧‍👦</div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Edit Family Members
                </h1>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Add Member
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Member Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Family Member</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar
                  </label>
                  <EmojiPicker 
                    value={addForm.avatar}
                    onChange={(emoji) => setAddForm({ ...addForm, avatar: emoji })}
                    placeholder="👤"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setAddForm({ name: '', avatar: '👤' });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addMember}
                  disabled={!addForm.name.trim()}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Member
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members List */}
        <div className="space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-8xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No family members yet</h3>
              <p className="text-gray-600">Add your first family member to get started!</p>
            </div>
          ) : (
            members.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
              >
                {editingId === member.id ? (
                  // Edit Mode
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avatar
                      </label>
                      <EmojiPicker
                        value={editForm.avatar}
                        onChange={(emoji) => setEditForm({ ...editForm, avatar: emoji })}
                        placeholder="👤"
                        variant="default"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 flex gap-3 pt-4">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <X size={20} />
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(member.id)}
                        disabled={!editForm.name.trim()}
                        className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Save size={20} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Photo/Avatar Display */}
                      <div className="flex-shrink-0">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-4xl">
                            {member.avatar}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                        <p className="text-gray-600">{member.points} points</p>
                        
                        {/* Photo Upload Component */}
                        <div className="mt-3">
                          <PhotoUpload
                            currentPhotoUrl={member.photo_url}
                            currentAvatar={member.avatar}
                            onPhotoUpdate={(photoUrl) => {
                              // Optimistically update the local state
                              setMembers(prev => prev.map(m => 
                                m.id === member.id ? { ...m, photo_url: photoUrl } : m
                              ));
                              // Also refresh to ensure consistency
                              fetchMembers();
                            }}
                            memberId={member.id}
                            memberName={member.name}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(member)}
                        className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Edit member"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => deleteMember(member.id, member.name)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete member"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};