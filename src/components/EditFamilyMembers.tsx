import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FamilyMember } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { EmojiPicker } from './EmojiPicker';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface EditFamilyMembersProps {
  onBack: () => void;
}

interface MemberForm {
  name: string;
  avatar: string;
  is_parent: boolean;
  gender: string;
  birth_date: string;
}

const emptyForm: MemberForm = { name: '', avatar: '👤', is_parent: false, gender: '', birth_date: '' };

const memberToForm = (m: FamilyMember): MemberForm => ({
  name: m.name,
  avatar: m.avatar,
  is_parent: !!m.is_parent,
  gender: m.gender || '',
  birth_date: m.birth_date || '',
});

const formToPayload = (f: MemberForm) => ({
  name: f.name.trim(),
  avatar: f.avatar,
  is_parent: f.is_parent,
  gender: f.gender || null,
  birth_date: f.birth_date || null,
});

const ageFromBirthDate = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const age = dayjs().diff(dayjs(birthDate), 'year');
  return isNaN(age) ? null : age;
};

/** Shared fields for both the add and edit forms. */
const MemberFields: React.FC<{
  form: MemberForm;
  setForm: (f: MemberForm) => void;
}> = ({ form, setForm }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Enter name"
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
      <EmojiPicker
        value={form.avatar}
        onChange={(emoji) => setForm({ ...form, avatar: emoji })}
        placeholder="👤"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setForm({ ...form, is_parent: true })}
          className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-colors ${
            form.is_parent
              ? 'bg-purple-500 text-white border-purple-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          👑 Parent
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, is_parent: false })}
          className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-colors ${
            !form.is_parent
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          🧒 Kid
        </button>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
      <select
        value={form.gender}
        onChange={(e) => setForm({ ...form, gender: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
      >
        <option value="">Not set</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Date of birth</label>
      <input
        type="date"
        value={form.birth_date}
        max={dayjs().format('YYYY-MM-DD')}
        onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
      />
    </div>
  </div>
);

export const EditFamilyMembers: React.FC<EditFamilyMembersProps> = ({ onBack }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<MemberForm>(emptyForm);
  const [addForm, setAddForm] = useState<MemberForm>(emptyForm);

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
    setEditForm(memberToForm(member));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .update(formToPayload(editForm))
        .eq('id', id);

      if (error) throw error;

      await fetchMembers();
      setEditingId(null);
      setEditForm(emptyForm);
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
        .insert([{ ...formToPayload(addForm), points: 0 }]);

      if (error) throw error;

      await fetchMembers();
      setAddForm(emptyForm);
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

              <MemberFields form={addForm} setForm={setAddForm} />
              <p className="text-xs text-gray-500 mt-3">
                📷 You can add a photo after saving, via the member's edit button.
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setAddForm(emptyForm);
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
            members.map((member) => {
              const age = ageFromBirthDate(member.birth_date);
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  {editingId === member.id ? (
                    // Edit Mode — everything in one place
                    <div>
                      <MemberFields form={editForm} setForm={setEditForm} />

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                        <PhotoUpload
                          currentPhotoUrl={member.photo_url}
                          currentAvatar={member.avatar}
                          onPhotoUpdate={(photoUrl) => {
                            setMembers(prev => prev.map(m =>
                              m.id === member.id ? { ...m, photo_url: photoUrl } : m
                            ));
                            fetchMembers();
                          }}
                          memberId={member.id}
                          memberName={member.name}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                member.is_parent
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {member.is_parent ? '👑 Parent' : '🧒 Kid'}
                            </span>
                          </div>
                          <p className="text-gray-600">{member.points} points</p>
                          {member.birth_date && (
                            <p className="text-sm text-gray-500">
                              🎂 {dayjs(member.birth_date).format('D MMM YYYY')}
                              {age !== null && ` · ${age} years old`}
                            </p>
                          )}
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
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
