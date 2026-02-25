import { getItem, setItem, store } from '../localStore';

beforeEach(() => {
  localStorage.clear();
});

describe('localStore', () => {
  describe('getItem / setItem', () => {
    it('round-trips a value through JSON', () => {
      setItem('family_members', [{ id: '1', name: 'Alice' }]);
      const result = getItem<any[]>('family_members');
      expect(result).toEqual([{ id: '1', name: 'Alice' }]);
    });

    it('returns null for a missing key', () => {
      const result = getItem('meals');
      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('meals', '{bad json');
      const result = getItem('meals');
      expect(result).toBeNull();
    });

    it('overwrites existing values', () => {
      setItem('freezer_meals', [{ id: '1' }]);
      setItem('freezer_meals', [{ id: '2' }]);
      expect(getItem('freezer_meals')).toEqual([{ id: '2' }]);
    });
  });

  describe('store convenience helpers', () => {
    it('getMembers / setMembers', () => {
      store.setMembers([{ id: 'm1', name: 'Bob' }]);
      expect(store.getMembers()).toEqual([{ id: 'm1', name: 'Bob' }]);
    });

    it('getMeals / setMeals', () => {
      store.setMeals([{ id: 'meal1', name: 'Pasta' }]);
      expect(store.getMeals()).toEqual([{ id: 'meal1', name: 'Pasta' }]);
    });

    it('getPlan / setPlan', () => {
      const plan = { '2026-02-25': { lunch: 'meal1' } };
      store.setPlan(plan);
      expect(store.getPlan()).toEqual(plan);
    });

    it('getActivities / setActivities', () => {
      store.setActivities([{ id: 'a1', title: 'Park' }]);
      expect(store.getActivities()).toEqual([{ id: 'a1', title: 'Park' }]);
    });

    it('getFreezer / setFreezer', () => {
      store.setFreezer([{ id: 'f1', name: 'Soup', qty: 3 }]);
      expect(store.getFreezer()).toEqual([{ id: 'f1', name: 'Soup', qty: 3 }]);
    });
  });
});
