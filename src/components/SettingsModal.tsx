import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Palette, Mail, Type, Lock, Sparkles, LayoutGrid, Trophy, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { AppSettings, FamilyMember, GoalSeasonKey, Language, SeasonGoal, SinterklaasDates } from '../types';
import { LANGUAGES } from '../seasons/i18n';
import { GOAL_SEASONS, SEASON_OVERRIDES } from '../seasons';
import { defaultSinterklaasDates } from '../seasons/dates';
import { normalizeSeasonDates, withSeasonEntry } from '../seasons/store';
import { listSeasonGoals, saveSeasonGoals, SeasonGoalInput } from '../lib/seasonGoalsApi';
import { useBoardRefresh } from '../hooks/useBoardRefresh';
import { useSeason } from '../hooks/useSeason';
import toast from 'react-hot-toast';
import { useFocusTrap } from '../utils/useFocusTrap';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
  /** The Seasons and Season goals sections are only shown, and only saved, in parent mode. */
  isParentMode?: boolean;
  /** Children get a Season goals row each. */
  familyMembers?: FamilyMember[];
}

const BOARD_LAYOUTS: { value: 'home' | 'timeline'; label: string; emoji: string; hint: string }[] = [
  { value: 'home', label: 'Home', emoji: '🏠', hint: 'Clock and one Today list' },
  { value: 'timeline', label: 'Timeline', emoji: '🗓️', hint: 'Summary cards and per-person timeline' },
];

type DateField = Exclude<keyof SinterklaasDates, 'shoe_nights' | 'crossed_days'>;

const SINTERKLAAS_DATE_FIELDS: { key: DateField; label: string }[] = [
  { key: 'journaal_start', label: 'Sinterklaasjournaal starts' },
  { key: 'intocht', label: 'Intocht (national arrival)' },
  { key: 'intocht_local', label: 'Arrival in our town' },
  { key: 'pakjesavond', label: 'Pakjesavond' },
];

/** Only what a parent stored for the year; an empty field means the computed default. */
const seasonFormFrom = (settings: AppSettings, year: number) => {
  const stored = normalizeSeasonDates(settings.season_dates)[String(year)]?.sinterklaas;
  return {
    language: settings.language ?? 'en',
    override: settings.active_season ?? 'auto',
    sinterklaas: { ...stored, shoe_nights: [...(stored?.shoe_nights ?? [])] } as SinterklaasDates,
  };
};

type GoalForm = Record<string, { target: string; reward: string }>;
const goalKey = (season: GoalSeasonKey, memberId: string) => `${season}|${memberId}`;

const goalFormFrom = (goals: SeasonGoal[]): GoalForm =>
  Object.fromEntries(
    goals.map(g => [goalKey(g.season_key, g.member_id), { target: String(g.target_points), reward: g.reward_label ?? '' }])
  );

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isParentMode = false,
  familyMembers = []
}) => {
  const { today } = useBoardRefresh();
  const { goalSeason: runningSeason } = useSeason();
  const year = Number(today.slice(0, 4));
  const defaults = defaultSinterklaasDates(year);
  const children = familyMembers.filter(m => !m.is_parent);
  const [formData, setFormData] = useState({
    title: settings.title,
    theme: settings.theme,
    email_summaries: settings.email_summaries,
    board_layout: settings.board_layout ?? 'home'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showPinField, setShowPinField] = useState(false);
  const [seasonForm, setSeasonForm] = useState(() => seasonFormFrom(settings, year));
  const [savedGoals, setSavedGoals] = useState<SeasonGoal[]>([]);
  const [goalForm, setGoalForm] = useState<GoalForm>({});
  const [goalSeason, setGoalSeason] = useState<GoalSeasonKey>('sinterklaas');
  const [newShoeNight, setNewShoeNight] = useState('');
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
    if (isParentMode) {
      // Drop cleared inputs so an empty date doesn't land in the JSON as ''
      const sinterklaas = Object.fromEntries(
        Object.entries(seasonForm.sinterklaas).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
      ) as SinterklaasDates;
      updates.language = seasonForm.language;
      updates.active_season = seasonForm.override === 'auto' ? null : seasonForm.override;
      // Keyed by year; other years, Christmas and crossed-off days are kept
      updates.season_dates = withSeasonEntry(settings.season_dates, year, 'sinterklaas', sinterklaas);
    }
    let success = await onUpdateSettings(updates);
    if (success && isParentMode) {
      try {
        await saveGoals();
      } catch (err) {
        console.error('Error saving season goals:', err);
        success = false;
      }
    }

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

  // Children with a target get a goal; clearing a target deletes the saved goal
  const saveGoals = async () => {
    const upserts: SeasonGoalInput[] = [];
    const remove: Pick<SeasonGoalInput, 'member_id' | 'season_key' | 'year'>[] = [];
    GOAL_SEASONS.forEach(({ key: season_key }) => {
      children.forEach(child => {
        const entry = goalForm[goalKey(season_key, child.id)];
        const target = Number(entry?.target);
        const saved = savedGoals.find(g => g.member_id === child.id && g.season_key === season_key);
        if (entry && Number.isFinite(target) && target > 0) {
          upserts.push({ member_id: child.id, season_key, year, target_points: Math.round(target), reward_label: entry.reward.trim() || null });
        } else if (saved) {
          remove.push({ member_id: child.id, season_key, year });
        }
      });
    });
    if (upserts.length > 0 || remove.length > 0) await saveSeasonGoals(upserts, remove);
  };

  const setGoalField = (memberId: string, field: 'target' | 'reward', value: string) =>
    setGoalForm(f => {
      const key = goalKey(goalSeason, memberId);
      return { ...f, [key]: { ...(f[key] ?? { target: '', reward: '' }), [field]: value } };
    });

  const resetSinterklaasDefaults = () =>
    setSeasonForm(f => {
      const sinterklaas = { ...f.sinterklaas };
      SINTERKLAAS_DATE_FIELDS.forEach(field => delete sinterklaas[field.key]);
      return { ...f, sinterklaas };
    });

  const handleReset = () => {
    setFormData({
      title: settings.title,
      theme: settings.theme,
      email_summaries: settings.email_summaries,
      board_layout: settings.board_layout ?? 'home'
    });
    setNewPin('');
    setShowPinField(false);
    setSeasonForm(seasonFormFrom(settings, year));
    setNewShoeNight('');
    setGoalForm(goalFormFrom(savedGoals));
  };

  // Settings load after this modal mounts, so pick up the saved values each time it opens.
  // Otherwise a save could write the empty defaults back over the season dates.
  useEffect(() => {
    if (isOpen) handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Season goals live in their own table; load this year's when a parent opens Settings
  useEffect(() => {
    if (!isOpen || !isParentMode) return;
    setGoalSeason(runningSeason ?? 'sinterklaas');
    let cancelled = false;
    listSeasonGoals(year)
      .then(goals => {
        if (cancelled) return;
        setSavedGoals(goals);
        setGoalForm(goalFormFrom(goals));
      })
      .catch(err => console.error('Error loading season goals:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isParentMode, year]);

  const setSinterklaasDate = (key: DateField, value: string) =>
    setSeasonForm(f => ({ ...f, sinterklaas: { ...f.sinterklaas, [key]: value } }));

  const addShoeNight = () => {
    if (!newShoeNight) return;
    setSeasonForm(f => {
      const nights = new Set([...(f.sinterklaas.shoe_nights ?? []), newShoeNight]);
      return { ...f, sinterklaas: { ...f.sinterklaas, shoe_nights: [...nights].sort() } };
    });
    setNewShoeNight('');
  };

  const removeShoeNight = (night: string) =>
    setSeasonForm(f => ({
      ...f,
      sinterklaas: { ...f.sinterklaas, shoe_nights: (f.sinterklaas.shoe_nights ?? []).filter(n => n !== night) },
    }));

  const inputClass = 'w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all';

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
                      onClick={() => setFormData({ ...formData, theme: theme.value as AppSettings['theme'] })}
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

              {/* Board Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <LayoutGrid size={16} />
                  Board Layout
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BOARD_LAYOUTS.map(layout => (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, board_layout: layout.value })}
                      className={`min-h-[44px] p-3 rounded-xl border-2 text-left transition-all ${
                        formData.board_layout === layout.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-gray-800">{layout.emoji} {layout.label}</div>
                      <div className="text-xs text-gray-500">{layout.hint}</div>
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

              {/* Seasons (parent only) */}
              {isParentMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Sparkles size={16} />
                    Seasons
                  </label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="season-language" className="block text-xs text-gray-500 mb-1">Season language</label>
                        <select
                          id="season-language"
                          value={seasonForm.language}
                          onChange={(e) => setSeasonForm({ ...seasonForm, language: e.target.value as Language })}
                          className={inputClass}
                        >
                          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="season-override" className="block text-xs text-gray-500 mb-1">Season</label>
                        <select
                          id="season-override"
                          value={seasonForm.override}
                          onChange={(e) => setSeasonForm({ ...seasonForm, override: e.target.value })}
                          className={inputClass}
                        >
                          <option value="auto">Auto (by date)</option>
                          {SEASON_OVERRIDES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-700">🎁 Sinterklaas dates ({year})</p>
                        <button
                          type="button"
                          onClick={resetSinterklaasDefaults}
                          className="min-h-[44px] px-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 flex items-center gap-1"
                        >
                          <RotateCcw size={14} /> Reset to defaults
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {SINTERKLAAS_DATE_FIELDS.map(field => (
                          <div key={field.key}>
                            <label htmlFor={`sk-${field.key}`} className="block text-xs text-gray-500 mb-1">{field.label}</label>
                            <input
                              id={`sk-${field.key}`}
                              type="date"
                              value={seasonForm.sinterklaas[field.key] ?? ''}
                              placeholder={defaults[field.key]}
                              onChange={(e) => setSinterklaasDate(field.key, e.target.value)}
                              className={inputClass}
                            />
                            {/* Android date inputs don't show a placeholder, so spell the default out */}
                            <p className="text-xs text-gray-500 mt-1">
                              Default: {dayjs(defaults[field.key]).format('ddd D MMM')}
                              {seasonForm.sinterklaas[field.key] ? '' : ' (in use)'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="sk-shoe-night" className="block text-xs text-gray-500 mb-1">👟 Shoe nights</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(seasonForm.sinterklaas.shoe_nights ?? []).map(night => (
                          <button
                            key={night}
                            type="button"
                            onClick={() => removeShoeNight(night)}
                            className="min-h-[44px] px-3 rounded-full bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-1"
                            aria-label={`Remove shoe night ${night}`}
                          >
                            {night} <X size={14} />
                          </button>
                        ))}
                        {(seasonForm.sinterklaas.shoe_nights ?? []).length === 0 && (
                          <span className="text-xs text-gray-500">No shoe nights yet</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          id="sk-shoe-night"
                          type="date"
                          value={newShoeNight}
                          onChange={(e) => setNewShoeNight(e.target.value)}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={addShoeNight}
                          disabled={!newShoeNight}
                          className="min-h-[44px] px-4 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Auto shows Sinterklaas from the journaal start to Pakjesavond, Christmas from 6 to 26 December, and birthdays on the day.
                    Empty dates use the usual calendar for the year.
                  </p>
                </div>
              )}

              {/* Season goals (parent only) */}
              {isParentMode && children.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Trophy size={16} />
                    Season goals ({year})
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3" role="tablist">
                    {GOAL_SEASONS.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        role="tab"
                        aria-selected={goalSeason === option.key}
                        onClick={() => setGoalSeason(option.key)}
                        className={`min-h-[44px] rounded-xl border-2 font-medium ${
                          goalSeason === option.key ? 'border-purple-500 bg-purple-50 text-gray-800' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {option.emoji} {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {children.map(child => {
                      const entry = goalForm[goalKey(goalSeason, child.id)] ?? { target: '', reward: '' };
                      const saved = savedGoals.find(g => g.member_id === child.id && g.season_key === goalSeason);
                      return (
                        <div key={child.id} className="grid grid-cols-[1fr_96px] gap-2 items-end">
                          <div>
                            <label htmlFor={`goal-reward-${child.id}`} className="block text-xs text-gray-500 mb-1">
                              {child.avatar} {child.name}: reward{saved ? ` (earned ${saved.earned_points})` : ''}
                            </label>
                            <input
                              id={`goal-reward-${child.id}`}
                              type="text"
                              value={entry.reward}
                              onChange={(e) => setGoalField(child.id, 'reward', e.target.value)}
                              placeholder={goalSeason === 'sinterklaas' ? `Chocolate letter ${child.name.charAt(0).toUpperCase()}` : 'Christmas treat'}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor={`goal-target-${child.id}`} className="block text-xs text-gray-500 mb-1">Target ⭐</label>
                            <input
                              id={`goal-target-${child.id}`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={entry.target}
                              onChange={(e) => setGoalField(child.id, 'target', e.target.value)}
                              placeholder="200"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Chore points earned while the season runs count towards the goal, and the board shows each child's progress. Clear a target to remove the goal.
                  </p>
                </div>
              )}

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