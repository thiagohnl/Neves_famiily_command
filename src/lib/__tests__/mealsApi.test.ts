import {
  createSavedMeal,
  updateSavedMeal,
  listSavedMeals,
  deleteSavedMeal,
  planMeal,
  toggleFavorite,
  addFreezerItem,
} from '../mealsApi';
import { chain } from '../../test/mocks/supabase';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../supabase', () => ({
  supabase: mockSupabase,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mealsApi', () => {
  describe('createSavedMeal', () => {
    it('inserts a meal with defaults and returns it', async () => {
      const mockMeal = { id: 'm1', name: 'Pasta', emoji: '🍝', family_id: 'default' };
      mockSupabase.from.mockReturnValue(
        chain({ data: mockMeal, error: null })
      );

      const result = await createSavedMeal({ name: 'Pasta', emoji: '🍝' });

      expect(mockSupabase.from).toHaveBeenCalledWith('saved_meals');
      expect(result).toEqual(mockMeal);
    });

    it('throws on Supabase error', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: null, error: { message: 'insert failed' } })
      );

      await expect(createSavedMeal({ name: 'Bad' })).rejects.toEqual({ message: 'insert failed' });
    });
  });

  describe('recipe fields', () => {
    const ingredients = [
      { text: '2 eggs', name: 'Egg', quantity: 2, unit: null, emoji: '🥚', category: 'dairy' as const },
    ];

    it('includes recipe fields on create', async () => {
      const q = chain({ data: { id: 'm1' }, error: null });
      mockSupabase.from.mockReturnValue(q);

      await createSavedMeal({ name: 'Omelette', ingredients, steps: ['Whisk', 'Fry'], servings: 2 });

      expect(q.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Omelette', ingredients, steps: ['Whisk', 'Fry'], servings: 2 })
      );
      expect(q.insert.mock.calls[0][0]).not.toHaveProperty('cook_minutes');
    });

    it('only updates the fields that were passed', async () => {
      const q = chain({ data: { id: 'm1' }, error: null });
      mockSupabase.from.mockReturnValue(q);

      await updateSavedMeal('m1', { steps: [], recipe_image_url: null });

      expect(q.update).toHaveBeenCalledWith({ steps: [], recipe_image_url: null });
      expect(q.eq).toHaveBeenCalledWith('id', 'm1');
    });
  });

  describe('listSavedMeals', () => {
    it('returns array of meals', async () => {
      const meals = [{ id: '1', name: 'Tacos' }, { id: '2', name: 'Pizza' }];
      mockSupabase.from.mockReturnValue(
        chain({ data: meals, error: null })
      );

      const result = await listSavedMeals();
      expect(result).toEqual(meals);
      expect(mockSupabase.from).toHaveBeenCalledWith('saved_meals');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: null, error: null })
      );

      const result = await listSavedMeals();
      expect(result).toEqual([]);
    });
  });

  describe('deleteSavedMeal', () => {
    it('calls delete on the correct meal id', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: null, error: null })
      );

      await deleteSavedMeal('m1');
      expect(mockSupabase.from).toHaveBeenCalledWith('saved_meals');
    });
  });

  describe('planMeal', () => {
    it('upserts a meal plan entry', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: { id: 'p1', date: '2026-02-25', meal_type: 'lunch' }, error: null })
      );

      const result = await planMeal('2026-02-25', 'lunch', {
        id: 'm1',
        name: 'Pasta',
        emoji: '🍝',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('meal_plans');
      expect(result).toHaveProperty('date', '2026-02-25');
    });
  });

  describe('toggleFavorite', () => {
    it('deletes favorite when already favorited', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: null, error: null })
      );

      await toggleFavorite('m1', true);
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_favorites');
    });

    it('inserts favorite when not favorited', async () => {
      mockSupabase.from.mockReturnValue(
        chain({ data: null, error: null })
      );

      await toggleFavorite('m1', false);
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_favorites');
    });
  });

  describe('addFreezerItem', () => {
    it('inserts a freezer item with defaults', async () => {
      const mockItem = { id: 'f1', name: 'Soup', quantity: 1, emoji: '🥶' };
      mockSupabase.from.mockReturnValue(
        chain({ data: mockItem, error: null })
      );

      const result = await addFreezerItem({ name: 'Soup' });
      expect(mockSupabase.from).toHaveBeenCalledWith('freezer_meals');
      expect(result).toEqual(mockItem);
    });
  });
});
