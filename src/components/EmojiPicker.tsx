import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { CHORE_EMOJI_CATEGORIES, ALL_CHORE_EMOJIS, searchChoreEmojis } from '../constants/chore_emojis';
import { EMOJI_CATEGORIES, searchEmojis } from '../constants/emojis';

interface Emoji {
  emoji: string;
  name: string;
  keywords: string[];
}

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
  variant?: 'default' | 'chores' | 'meals';
}

// Quick chore suggestions - most common household/task emojis
const QUICK_CHORES = [
  { emoji: '🪥', name: 'Brush teeth', keywords: ['brush', 'teeth', 'dental'] },
  { emoji: '🧹', name: 'Sweep floor', keywords: ['sweep', 'broom', 'clean'] },
  { emoji: '🧺', name: 'Laundry', keywords: ['laundry', 'clothes', 'wash'] },
  { emoji: '🛏️', name: 'Make bed', keywords: ['bed', 'make', 'bedroom'] },
  { emoji: '🚽', name: 'Toilet', keywords: ['toilet', 'bathroom', 'clean'] },
  { emoji: '🍽️', name: 'Wash dishes', keywords: ['dishes', 'wash', 'clean'] },
  { emoji: '🧼', name: 'Clean', keywords: ['clean', 'soap', 'wash'] },
  { emoji: '🐶', name: 'Feed pet', keywords: ['pet', 'dog', 'feed'] },
  { emoji: '🌿', name: 'Garden', keywords: ['garden', 'plant', 'water'] },
  { emoji: '🧒', name: 'Playtime', keywords: ['play', 'child', 'fun'] },
  { emoji: '📚', name: 'Homework', keywords: ['homework', 'study', 'book'] },
  { emoji: '🕶️', name: 'Tidy toys', keywords: ['tidy', 'organize', 'toys'] },
  { emoji: '💧', name: 'Water plants', keywords: ['water', 'plants', 'garden'] },
  { emoji: '🪣', name: 'Mop floor', keywords: ['mop', 'bucket', 'clean'] },
  { emoji: '👕', name: 'Put away clothes', keywords: ['clothes', 'tidy', 'organize'] },
  { emoji: '🏃', name: 'Exercise', keywords: ['exercise', 'run', 'active'] },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  value,
  onChange,
  placeholder = '😀',
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentEmojis');
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored).slice(0, 16));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Get emoji categories based on variant
  const categories = variant === 'meals' ? EMOJI_CATEGORIES : CHORE_EMOJI_CATEGORIES;
  const searchFn = variant === 'meals' ? searchEmojis : searchChoreEmojis;

  // Define simple category filters
  const categoryMap: Record<string, string[]> = {
    all: Object.keys(CHORE_EMOJI_CATEGORIES),
    people: ['smileysAndPeople'],
    objects: ['objects', 'toys'],
    household: ['cleaning', 'personal', 'kitchen'],
    animals: ['pets'],
    food: ['kitchen'],
    nature: ['outdoor'],
    symbols: ['symbols', 'activities'],
  };

  // Get emojis to display
  const getDisplayEmojis = () => {
    if (searchQuery.trim()) {
      return searchFn(searchQuery);
    }

    if (variant === 'meals') {
      return EMOJI_CATEGORIES.foods.emojis;
    }

    // Filter by category
    if (selectedCategory === 'all') {
      return ALL_CHORE_EMOJIS;
    }

    const categoryKeys = categoryMap[selectedCategory] || [];
    const filtered: Emoji[] = [];

    categoryKeys.forEach(key => {
      const cat = CHORE_EMOJI_CATEGORIES[key as keyof typeof CHORE_EMOJI_CATEGORIES];
      if (cat) {
        filtered.push(...cat.emojis);
      }
    });

    return filtered;
  };

  const displayEmojis = getDisplayEmojis();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev < displayEmojis.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : displayEmojis.length - 1
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev < displayEmojis.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : prev
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && displayEmojis[selectedIndex]) {
            handleEmojiSelect(displayEmojis[selectedIndex].emoji);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedIndex, displayEmojis]);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);

    // Add to recent emojis
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    localStorage.setItem('recentEmojis', JSON.stringify(updated));

    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    buttonRef.current?.focus();
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(-1);
      setSelectedCategory('all');
    }
  };

  // Convert recent emoji strings to full emoji objects
  const recentEmojiObjects = recentEmojis
    .map(emoji => ALL_CHORE_EMOJIS.find(e => e.emoji === emoji))
    .filter(Boolean) as Emoji[];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-16 h-12 border-2 border-gray-300 rounded-xl flex items-center justify-center text-2xl hover:border-indigo-400 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
        title="Select emoji"
        aria-label={`Select emoji, current: ${value || placeholder}`}
      >
        {value || placeholder}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-2 w-[380px] sm:w-[420px] bg-gradient-to-br from-white via-indigo-50 to-pink-50 rounded-2xl shadow-xl z-[9999] overflow-hidden ring-1 ring-black/5"
          >
            {/* Search Bar - Sticky */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-3 border-b border-indigo-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400" size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  placeholder="Search emojis… 🔍"
                  className="w-full pl-10 pr-8 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none text-sm bg-white"
                  aria-label="Search emojis"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-100 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Category Chips - Only for chores variant and when not searching */}
              {variant === 'chores' && !searchQuery && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { key: 'all', label: 'All', icon: '✨' },
                    { key: 'people', label: 'People', icon: '🧒' },
                    { key: 'objects', label: 'Objects', icon: '🔧' },
                    { key: 'household', label: 'Household', icon: '🏠' },
                    { key: 'animals', label: 'Animals', icon: '🐶' },
                    { key: 'food', label: 'Food', icon: '🍎' },
                    { key: 'nature', label: 'Nature', icon: '🌿' },
                    { key: 'symbols', label: 'Symbols', icon: '⭐' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === cat.key
                          ? 'bg-indigo-100 text-indigo-600 shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      aria-label={`Select ${cat.label} category`}
                      aria-pressed={selectedCategory === cat.key}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 max-h-[340px] overflow-y-auto">
              {/* Recently Used - Show only if we have recent emojis and not searching */}
              {variant === 'chores' && !searchQuery && recentEmojiObjects.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-indigo-600 mb-2 px-1">Recently Used</h3>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                    {recentEmojiObjects.map((item, index) => (
                      <button
                        key={`recent-${item.emoji}-${index}`}
                        onClick={() => handleEmojiSelect(item.emoji)}
                        className={`w-11 h-11 flex items-center justify-center text-2xl rounded-lg hover:bg-indigo-50 hover:scale-110 transition-all cursor-pointer ${
                          value === item.emoji ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-white/50'
                        }`}
                        title={item.name}
                        aria-label={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Chores - Show only for chores variant, not searching, and "all" category */}
              {variant === 'chores' && !searchQuery && selectedCategory === 'all' && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-pink-600 mb-2 px-1">Quick Chores</h3>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                    {QUICK_CHORES.map((item, index) => (
                      <button
                        key={`quick-${item.emoji}-${index}`}
                        onClick={() => handleEmojiSelect(item.emoji)}
                        className={`w-11 h-11 flex items-center justify-center text-2xl rounded-lg hover:bg-pink-50 hover:scale-110 transition-all cursor-pointer ${
                          value === item.emoji ? 'bg-pink-100 ring-2 ring-pink-400' : 'bg-white'
                        }`}
                        title={item.name}
                        aria-label={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Emoji Grid */}
              {displayEmojis.length > 0 ? (
                <div>
                  {!searchQuery && variant === 'chores' && selectedCategory === 'all' && (
                    <h3 className="text-xs font-semibold text-indigo-600 mb-2 px-1">All Emojis</h3>
                  )}
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                    {displayEmojis.map((item, index) => (
                      <button
                        key={`${item.emoji}-${index}`}
                        onClick={() => handleEmojiSelect(item.emoji)}
                        className={`w-11 h-11 flex items-center justify-center text-2xl rounded-lg hover:bg-indigo-50 hover:scale-110 transition-all cursor-pointer ${
                          selectedIndex === index ? 'bg-indigo-100 ring-2 ring-indigo-500' : ''
                        } ${
                          value === item.emoji ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-white/70'
                        }`}
                        title={item.name}
                        aria-label={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-3">🔍</div>
                  <p className="text-sm font-medium text-gray-700">No emojis found</p>
                  <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
