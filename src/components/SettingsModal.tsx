import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Upload, Palette, Mail, Type, Lock } from 'lucide-react';
import { AppSettings } from '../types';
import toast from 'react-hot-toast';
import { useFocusTrap } from '../utils/useFocusTrap';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState({
    title: settings.title,
    theme: settings.theme,
    email_summaries: settings.email_summaries
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showPinField, setShowPinField] = useState(false);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const themes = [
    { value: 'light', label: 'Light Mode', emoji: '☀️', colors: 'from-blue-50 to-indigo-100' },
    { value: 'dark', label: 'Dark Mode', emoji: '🌙', colors: 'from-gray-800 to-gray-900' },
    { value: 'kids', label: 'Kids Mode', emoji: '🌈', colors: 'from-pink-100 via-purple-100 to-indigo-100' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<AppSettings> = { ...formData };
    if (newPin.length === 4) {
      updates.parent_pin = newPin;
    }
    const success = await onUpdateSettings(updates);

    if (success) {
      toast.success('Settings saved successfully!', {
        icon: '✅',
        duration: 3000,
      });
      setNewPin('');
      setShowPinField(false);
      onClose();
    } else {
      toast.error('Failed to save settings', {
        icon: '❌',
        duration: 3000,
      });
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setFormData({
      title: settings.title,
      theme: settings.theme,
      email_summaries: settings.email_summaries
    });
    setNewPin('');
    setShowPinField(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            ref={focusTrapRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="settings-title" className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Palette className="text-purple-500" size={28} />
                App Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* App Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Type size={16} />
                  App Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Neves Family Board"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">This will appear in the header of your app</p>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Palette size={16} />
                  Theme
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme: theme.value as any })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.theme === theme.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-8 rounded-lg bg-gradient-to-r ${theme.colors}`}></div>
                        <div className="text-left">
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            <span className="text-xl">{theme.emoji}</span>
                            {theme.label}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Summaries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Mail size={16} />
                  Weekly Email Summaries
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, email_summaries: !formData.email_summaries })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.email_summaries ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.email_summaries ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {formData.email_summaries ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Receive weekly progress reports with achievements and stats
                </p>
              </div>

              {/* Change Parent PIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Lock size={16} />
                  Parent PIN
                </label>
                {!showPinField ? (
                  <button
                    type="button"
                    onClick={() => setShowPinField(true)}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Change PIN
                  </button>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNewPin(val);
                      }}
                      placeholder="Enter new 4-digit PIN"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-xl font-bold tracking-widest"
                      maxLength={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newPin.length < 4 ? `${4 - newPin.length} more digit${4 - newPin.length !== 1 ? 's' : ''} needed` : 'PIN will be saved with settings'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};