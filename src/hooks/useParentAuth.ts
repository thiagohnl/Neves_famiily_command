import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useParentAuth = () => {
  const [parentPin, setParentPin] = useState<string>('1234');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPin = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('parent_pin')
          .limit(1)
          .single();
        if (!error && data?.parent_pin) {
          setParentPin(data.parent_pin);
        }
      } catch (err) {
        console.error('Error loading parent PIN:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPin();

    const savedParentMode = localStorage.getItem('parentMode');
    if (savedParentMode === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const authenticateParent = (pin: string): boolean => {
    if (pin === parentPin) {
      setIsAuthenticated(true);
      localStorage.setItem('parentMode', 'true');
      return true;
    }
    return false;
  };

  const exitParentMode = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('parentMode');
  };

  const updatePin = async (newPin: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ parent_pin: newPin })
        .eq('id', 'default');
      if (error) throw error;
      setParentPin(newPin);
      return true;
    } catch (err) {
      console.error('Error updating PIN:', err);
      return false;
    }
  };

  return {
    isAuthenticated,
    authenticateParent,
    exitParentMode,
    updatePin,
    currentPin: parentPin,
    loading,
  };
};
