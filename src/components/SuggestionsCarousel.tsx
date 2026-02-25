import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useMealSuggestions } from '../hooks/useMealFavorites';
import { useFreezerMeals } from '../hooks/useMeals';

interface SuggestionsCarouselProps {
  onAddMeal: (meal: { id: string | null; name: string; emoji: string | null }) => void;
  onToggleFavorite: (mealId: string) => void;
  isFavorite: (mealId: string) => boolean;
  getFavoriteCount: (mealId: string) => number;
}

type Tab = 'top-picks' | 'recent' | 'freezer' | 'bring-back';

export const SuggestionsCarousel: React.FC<SuggestionsCarouselProps> = ({
  onAddMeal,
  onToggleFavorite,
  isFavorite,
  getFavoriteCount
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('top-picks');
  const { topPicks, recentMeals, bringBackMeals } = useMealSuggestions();
  const { items: freezerItems } = useFreezerMeals();

  const tabs = [
    { id: 'top-picks' as Tab, label: 'Top Picks', count: topPicks.length },
    { id: 'recent' as Tab, label: 'Recent', count: recentMeals.length },
    { id: 'freezer' as Tab, label: 'Freezer', count: freezerItems.length },
    { id: 'bring-back' as Tab, label: 'Bring Back', count: bringBackMeals.length }
  ];

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'top-picks':
        return topPicks;
      case 'recent':
        return recentMeals;
      case 'freezer':
        return freezerItems.filter(f => f.quantity > 0).map(f => ({
          id: f.id,
          name: f.name,
          emoji: f.emoji,
          favorite_count: getFavoriteCount(f.id)
        }));
      case 'bring-back':
        return bringBackMeals;
      default:
        return [];
    }
  };

  const items = getCurrentItems();

  return (
    <div className="rounded-xl border bg-white p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Suggestions</h3>

        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs opacity-75">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.length === 0 ? (
          <div className="text-center py-8 w-full text-gray-400 text-sm">
            No {activeTab === 'top-picks' ? 'favorites' : activeTab === 'recent' ? 'recent meals' : 'freezer items'} yet
          </div>
        ) : (
          items.map(item => {
            const favoriteCount = getFavoriteCount(item.id);
            const isFamilyFave = favoriteCount >= 5;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0 w-40 rounded-lg border bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{item.emoji || '🍽️'}</span>
                  {item.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Heart
                        size={16}
                        className={`transition-all ${
                          isFavorite(item.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>
                  )}
                </div>

                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                    {item.name}
                  </div>
                  {isFamilyFave && (
                    <span className="inline-block text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                      Family Fave
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onAddMeal({
                    id: item.id,
                    name: item.name,
                    emoji: item.emoji
                  })}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 rounded-md transition-colors font-medium"
                >
                  Add to week
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
