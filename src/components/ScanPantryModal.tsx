// src/components/ScanPantryModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Trash2, Sparkles, RotateCcw, Mic, Square } from 'lucide-react';
import { scanGroceriesPhoto, parseGroceriesText, type ScannedPantryItem } from '../lib/aiApi';
import {
  PANTRY_LOCATIONS,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  LOCATION_LABELS,
  LOCATION_EMOJIS,
  CATEGORY_EMOJIS,
  type PantryLocation,
  type PantryCategory,
  type PantryUnit,
} from '../constants/pantry';
import type { PantryItemInput } from '../lib/pantryApi';

interface ScanPantryModalProps {
  open: boolean;
  onClose: () => void;
  onAddBulk: (inputs: PantryItemInput[]) => Promise<void>;
  initialMode?: 'photo' | 'voice';
}

type Step = 'pick' | 'voice' | 'scanning' | 'review';

function getSpeechRecognition(): (new () => any) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface ReviewItem extends ScannedPantryItem {
  key: number;
}

export const ScanPantryModal: React.FC<ScanPantryModalProps> = ({
  open,
  onClose,
  onAddBulk,
  initialMode = 'photo',
}) => {
  const [step, setStep] = useState<Step>('pick');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = getSpeechRecognition() !== null;

  // Jump straight into voice mode (and start listening) when opened via the mic button
  useEffect(() => {
    if (open && initialMode === 'voice') {
      setStep('voice');
      if (speechSupported) startListening();
    }
    if (!open) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function startListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interimText = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interimText += t;
      }
      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setInterim(interimText);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setInterim('');
      if (e?.error === 'not-allowed') {
        setError('Microphone access was denied — you can type your list instead.');
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      // start() throws if already running; ignore
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }

  function reset() {
    stopListening();
    setStep('pick');
    setItems([]);
    setError(null);
    setTranscript('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function handleClose() {
    if (saving) return;
    reset();
    onClose();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }

    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('scanning');

    try {
      const scanned = await scanGroceriesPhoto(file);
      if (scanned.length === 0) {
        setError("Couldn't spot any groceries in that photo — try a clearer shot.");
        setStep('pick');
        return;
      }
      setItems(scanned.map((it, i) => ({ ...it, key: i, quantity: it.quantity || 1 })));
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'Failed to scan photo');
      setStep('pick');
    }
  }

  async function handleParseVoice() {
    const text = transcript.trim();
    if (!text) return;

    stopListening();
    setError(null);
    setStep('scanning');

    try {
      const scanned = await parseGroceriesText(text);
      if (scanned.length === 0) {
        setError("Couldn't find any groceries in that — try describing the items again.");
        setStep('voice');
        return;
      }
      setItems(scanned.map((it, i) => ({ ...it, key: i, quantity: it.quantity || 1 })));
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'Failed to understand the list');
      setStep('voice');
    }
  }

  function updateItem(key: number, patch: Partial<ScannedPantryItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function handleCategoryChange(key: number, category: string) {
    const emoji = CATEGORY_EMOJIS[category as PantryCategory];
    updateItem(key, emoji ? { category, emoji } : { category });
  }

  async function handleSave() {
    const valid = items.filter((it) => it.name.trim());
    if (valid.length === 0) return;

    setSaving(true);
    try {
      await onAddBulk(
        valid.map((it) => ({
          name: it.name.trim(),
          emoji: it.emoji || undefined,
          category: PANTRY_CATEGORIES.includes(it.category as PantryCategory) ? it.category : undefined,
          location: PANTRY_LOCATIONS.includes(it.location) ? it.location : 'cupboard',
          quantity: it.quantity > 0 ? it.quantity : 1,
          unit: PANTRY_UNITS.includes(it.unit as PantryUnit) ? it.unit : 'item',
        }))
      );
      reset();
      onClose();
    } catch {
      // parent shows the error toast; keep the modal open so nothing is lost
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" /> Scan Groceries
              </h3>
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} className="dark:text-gray-300" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {step === 'pick' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Take a photo of your groceries (or a receipt) and they'll be added to your pantry automatically.
                  </p>

                  {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Camera size={20} /> Take Photo
                  </button>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Upload size={20} /> Choose Photo
                  </button>
                  <button
                    onClick={() => {
                      setStep('voice');
                      if (speechSupported) startListening();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Mic size={20} /> Speak Your List
                  </button>
                </div>
              )}

              {step === 'voice' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {speechSupported
                      ? 'Say what you bought — e.g. "two bags of frozen peas, chicken breasts and a box of cereal".'
                      : "Voice isn't supported in this browser — type your list instead."}
                  </p>

                  {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  {speechSupported && (
                    <div className="flex justify-center">
                      <button
                        onClick={listening ? stopListening : startListening}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                          listening
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                        aria-label={listening ? 'Stop listening' : 'Start listening'}
                      >
                        {listening ? (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                          >
                            <Square size={22} fill="currentColor" />
                          </motion.div>
                        ) : (
                          <Mic size={26} />
                        )}
                      </button>
                    </div>
                  )}

                  {listening && (
                    <p className="text-center text-xs text-purple-600 dark:text-purple-300 font-medium">
                      Listening... tap to stop
                    </p>
                  )}

                  <textarea
                    value={listening && interim ? `${transcript} ${interim}`.trim() : transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    readOnly={listening}
                    rows={4}
                    placeholder={speechSupported ? 'Your words appear here...' : 'e.g. 2 bags of frozen peas, chicken breasts, a box of cereal'}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleParseVoice}
                      disabled={!transcript.trim()}
                      className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Find Items
                    </button>
                  </div>
                </div>
              )}

              {step === 'scanning' && (
                <div className="text-center py-6 space-y-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Groceries"
                      className="mx-auto max-h-48 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-300">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    >
                      <Sparkles size={18} />
                    </motion.div>
                    <span className="text-sm font-medium">Identifying your groceries...</span>
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Found {items.length} item{items.length === 1 ? '' : 's'} — check before adding:
                    </p>
                    <button
                      onClick={reset}
                      className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300 hover:underline"
                    >
                      <RotateCcw size={12} /> Retake
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((it) => (
                      <div
                        key={it.key}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-700 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl w-7 text-center">{it.emoji || '🥫'}</span>
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => updateItem(it.key, { name: e.target.value })}
                            className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <button
                            onClick={() => removeItem(it.key)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={it.location}
                            onChange={(e) => updateItem(it.key, { location: e.target.value as PantryLocation })}
                            className="flex-1 min-w-0 px-1.5 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {PANTRY_LOCATIONS.map((loc) => (
                              <option key={loc} value={loc}>
                                {LOCATION_EMOJIS[loc]} {LOCATION_LABELS[loc]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={PANTRY_CATEGORIES.includes(it.category as PantryCategory) ? it.category : 'other'}
                            onChange={(e) => handleCategoryChange(it.key, e.target.value)}
                            className="flex-1 min-w-0 px-1.5 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {PANTRY_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {CATEGORY_EMOJIS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={it.quantity}
                            onChange={(e) => updateItem(it.key, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <select
                            value={PANTRY_UNITS.includes(it.unit as PantryUnit) ? it.unit : 'item'}
                            onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                            className="w-16 px-1.5 py-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {PANTRY_UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {step === 'review' && (
              <div className="p-4 border-t dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving || items.filter((it) => it.name.trim()).length === 0}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? 'Adding...'
                    : `Add ${items.filter((it) => it.name.trim()).length} item${items.filter((it) => it.name.trim()).length === 1 ? '' : 's'} to Pantry`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
