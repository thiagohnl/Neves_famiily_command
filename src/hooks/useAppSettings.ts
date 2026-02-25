import { useState, useEffect } from 'react';
import { data } from '../lib/dataGateway';
import { AppSettings } from '../types';

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    id: '',
    title: 'Family Chore Board',
    theme: 'light',
    email_summaries: false
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await data.getAppSettings();
      setSettings(result);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      // Optimistically update local state first for instant UI updates
      const updatedSettings = { ...settings, ...updates };
      setSettings(updatedSettings);

      const result = await data.updateAppSettings(updates);
      setSettings(result);
      return true;
    } catch (err) {
      // Revert optimistic update on error
      setSettings(settings);
      console.error('Error updating settings:', err);
      return false;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings: handleUpdateSettings
  };
};