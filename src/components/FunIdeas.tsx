import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Star, MapPin, DollarSign, ExternalLink, Filter, Heart, Calendar } from 'lucide-react';
import { useFunIdeas, FunIdea } from '../hooks/useFunIdeas';
import { EmojiPicker } from './EmojiPicker';
import toast from 'react-hot-toast';

const categories = [
  'Outdoor',
  'Indoor',
  'Sports',
  'Arts & Crafts',
  'Educational',
  'Food & Dining',
  'Entertainment',
  'Adventure',
  'Relaxation',
  'Social'
];

const costOptions = [
  'Free',
  '$',
  '$$',
  '$$$',
  '$$$$'
];

export const FunIdeas: React.FC = () => {
  const { ideas, loading, error, addIdea, updateIdea, deleteIdea, toggleFavorite } = useFunIdeas();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<FunIdea | null>(null);
  const [schedulingIdea, setSchedulingIdea] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newIdea, setNewIdea] = useState({
    name: '',
    category: 'Outdoor',
    notes: '',
    emoji: '🎯',
    location: '',
    cost: 'Free',
    google_maps_link: '',
    is_favorite: false,
    scheduled_date: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Outdoor',
    notes: '',
    emoji: '🎯',
    location: '',
    cost: 'Free',
    google_maps_link: '',
    is_favorite: false,
    scheduled_date: ''
  });

  const filteredIdeas = ideas.filter(idea => {
    if (filterCategory !== 'all' && idea.category !== filterCategory) return false;
    if (filterFavorites && !idea.is_favorite) return false;
    return true;
  });

  const handleAddIdea = async () => {
    if (!newIdea.name.trim()) {
      toast.error('Please enter an idea name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addIdea({
        name: newIdea.name.trim(),
        category: newIdea.category,
        notes: newIdea.notes.trim() || null,
        emoji: newIdea.emoji,
        location: newIdea.location.trim() || null,
        cost: newIdea.cost,
        google_maps_link: newIdea.google_maps_link.trim() || null,
        is_favorite: newIdea.is_favorite,
        scheduled_date: newIdea.scheduled_date || null
      });

      setNewIdea({
        name: '',
        category: 'Outdoor',
        notes: '',
        emoji: '🎯',
        location: '',
        cost: 'Free',
        google_maps_link: '',
        is_favorite: false,
        scheduled_date: ''
      });
      setShowAddForm(false);
      toast.success('Fun idea added successfully!');
    } catch (error) {
      toast.error('Failed to add fun idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIdea = async () => {
    if (!editingIdea || !editForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateIdea(editingIdea.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        notes: editForm.notes.trim() || null,
        emoji: editForm.emoji,
        location: editForm.location.trim() || null,
        cost: editForm.cost,
        google_maps_link: editForm.google_maps_link.trim() || null,
        is_favorite: editForm.is_favorite,
        scheduled_date: editForm.scheduled_date || null
      });

      setEditingIdea(null);
      toast.success('Fun idea updated successfully!');
    } catch (error) {
      toast.error('Failed to update fun idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIdea = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteIdea(id);
      toast.success('Fun idea deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete fun idea');
    }
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      await toggleFavorite(id, !currentFavorite);
      toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleScheduleDateChange = async (id: string, date: string) => {
    setIsSubmitting(true);
    try {
      await updateIdea(id, { scheduled_date: date || null });
      toast.success(date ? 'Fun idea scheduled successfully!' : 'Schedule cleared');
      setSchedulingIdea(null);
    } catch (error) {
      toast.error('Failed to schedule fun idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (idea: FunIdea) => {
    setEditingIdea(idea);
    setEditForm({
      name: idea.name,
      category: idea.category || 'Outdoor',
      notes: idea.notes || '',
      emoji: idea.emoji || '🎯',
      location: idea.location || '',
      cost: idea.cost || 'Free',
      google_maps_link: idea.google_maps_link || '',
      is_favorite: idea.is_favorite || false,
      scheduled_date: idea.scheduled_date || ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Fun Ideas</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-3xl p-6 shadow-lg border-2 border-yellow-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎯</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Fun Ideas</h1>
              <p className="text-gray-600">Your family's adventure bucket list!</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <Plus size={24} />
            Add Idea
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
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-bold text-gray-800">Total Ideas</h3>
              <p className="text-2xl font-bold text-yellow-600">{ideas.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⭐</div>
            <div>
              <h3 className="font-bold text-gray-800">Favorites</h3>
              <p className="text-2xl font-bold text-red-600">
                {ideas.filter(idea => idea.is_favorite).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏷️</div>
            <div>
              <h3 className="font-bold text-gray-800">Categories</h3>
              <p className="text-2xl font-bold text-blue-600">
                {new Set(ideas.map(idea => idea.category).filter(Boolean)).size}
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
            <Filter className="text-gray-500" size={20} />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              filterFavorites
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <Heart size={16} className={filterFavorites ? 'fill-current' : ''} />
            Favorites Only
          </button>
        </div>
      </motion.div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Fun Idea</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Idea Name *</label>
                <input
                  type="text"
                  value={newIdea.name}
                  onChange={(e) => setNewIdea({ ...newIdea, name: e.target.value })}
                  placeholder="e.g., Visit the local zoo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newIdea.category}
                  onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={newIdea.location}
                  onChange={(e) => setNewIdea({ ...newIdea, location: e.target.value })}
                  placeholder="e.g., Central Park, NYC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                <select
                  value={newIdea.cost}
                  onChange={(e) => setNewIdea({ ...newIdea, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                >
                  {costOptions.map(cost => (
                    <option key={cost} value={cost}>{cost}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                <EmojiPicker 
                  value={newIdea.emoji}
                  onChange={(emoji) => setNewIdea({ ...newIdea, emoji })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Maps Link</label>
                <input
                  type="url"
                  value={newIdea.google_maps_link}
                  onChange={(e) => setNewIdea({ ...newIdea, google_maps_link: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  value={newIdea.scheduled_date}
                  onChange={(e) => setNewIdea({ ...newIdea, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newIdea.notes}
                  onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })}
                  placeholder="Any additional details or notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newIdea.is_favorite}
                    onChange={(e) => setNewIdea({ ...newIdea, is_favorite: e.target.checked })}
                    className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as favorite</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewIdea({
                    name: '',
                    category: 'Outdoor',
                    notes: '',
                    emoji: '🎯',
                    location: '',
                    cost: 'Free',
                    google_maps_link: '',
                    is_favorite: false,
                    scheduled_date: ''
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIdea}
                disabled={isSubmitting || !newIdea.name.trim()}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Idea
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ideas Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">No fun ideas found</h3>
            <p className="text-gray-500">
              {filterCategory !== 'all' || filterFavorites 
                ? 'Try adjusting your filters or add some new ideas!'
                : 'Add your first fun idea to get started!'
              }
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <div key={idea.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              {editingIdea?.id === idea.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none font-bold text-lg"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingIdea(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateIdea}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center gap-2"
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
                      <div className="text-3xl">{idea.emoji || '🎯'}</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{idea.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {idea.category && (
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {idea.category}
                            </span>
                          )}
                          {idea.cost && (
                            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              {idea.cost}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleFavorite(idea.id, idea.is_favorite || false)}
                        className={`p-2 rounded-lg transition-colors ${
                          idea.is_favorite
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:bg-gray-50 hover:text-red-600'
                        }`}
                        title="Toggle favorite"
                      >
                        <Heart size={16} className={idea.is_favorite ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => setSchedulingIdea(schedulingIdea === idea.id ? null : idea.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          schedulingIdea === idea.id
                            ? 'text-yellow-600 bg-yellow-50'
                            : 'text-yellow-600 hover:bg-yellow-50'
                        }`}
                        title="Schedule date"
                      >
                        <Calendar size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(idea)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteIdea(idea.id, idea.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {idea.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin size={14} />
                      <span>{idea.location}</span>
                      {idea.google_maps_link && (
                        <a
                          href={idea.google_maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {idea.notes && (
                    <p className="text-gray-600 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
                      {idea.notes}
                    </p>
                  )}

                  {schedulingIdea === idea.id ? (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule Date
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          defaultValue={idea.scheduled_date || ''}
                          onChange={(e) => handleScheduleDateChange(idea.id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                          disabled={isSubmitting}
                        />
                        <button
                          onClick={() => setSchedulingIdea(null)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          disabled={isSubmitting}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : idea.scheduled_date ? (
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Calendar size={14} className="text-yellow-600" />
                      <span className="text-yellow-600">
                        Scheduled: {new Date(idea.scheduled_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
};