import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { FamilyMember } from '../../types';
import { CLOCK_ORDER, Whereabout, WHEREABOUT_EMOJI, WHEREABOUT_LABEL } from '../../constants/whereabouts';
import { memberColor } from '../../constants/memberColors';
import { MemberWhereabouts } from '../../lib/whereabouts';
import { MANUAL_OVERRIDE_HOURS } from '../../lib/whereaboutsApi';
import { useFocusTrap } from '../../utils/useFocusTrap';
import { MemberAvatar } from './MemberAvatar';

interface WhereaboutsSheetProps {
  memberId: string | null;
  familyMembers: FamilyMember[];
  whereabouts: Record<string, MemberWhereabouts>;
  /** Parents can pick anyone; otherwise only the tapped member is offered. */
  isParentMode: boolean;
  onPick: (memberId: string, status: Whereabout | null) => void;
  onClose: () => void;
}

export const WhereaboutsSheet: React.FC<WhereaboutsSheetProps> = ({
  memberId,
  familyMembers,
  whereabouts,
  isParentMode,
  onPick,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState(memberId);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(!!memberId);
  useEffect(() => setSelectedId(memberId), [memberId]);

  const selected = familyMembers.find(m => m.id === selectedId);
  if (!memberId || !selected) return null;
  const choices = isParentMode ? familyMembers : [selected];
  const current = whereabouts[selected.id];

  const pick = (status: Whereabout | null) => {
    onPick(selected.id, status);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        ref={focusTrapRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="font-body bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[640px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whereabouts-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="whereabouts-title" className="text-2xl font-extrabold text-gray-900">Where is {selected.name}?</h2>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {choices.length > 1 && (
          <div className="flex gap-2 mb-4" role="radiogroup" aria-label="Family member">
            {choices.map(m => (
              <button
                key={m.id}
                role="radio"
                aria-checked={m.id === selected.id}
                onClick={() => setSelectedId(m.id)}
                className={`min-h-[44px] flex items-center gap-2 rounded-full pl-1 pr-4 border-2 text-lg font-bold ${
                  m.id === selected.id ? 'border-season-accent bg-gray-50' : 'border-transparent'
                }`}
              >
                <MemberAvatar member={m} color={memberColor(familyMembers, m.id)} size={36} />
                {m.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {CLOCK_ORDER.map(status => (
            <motion.button
              key={status}
              whileTap={{ scale: 0.95 }}
              onClick={() => pick(status)}
              className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${
                current?.status === status ? 'border-season-accent bg-gray-50' : 'border-gray-200'
              }`}
            >
              <span className="text-4xl leading-none">{WHEREABOUT_EMOJI[status]}</span>
              <span className="text-lg font-bold text-gray-800">{WHEREABOUT_LABEL[status]}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 gap-4">
          <p className="text-base text-gray-500">Stays for {MANUAL_OVERRIDE_HOURS} hours, then the calendar takes over.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => pick(null)}
            className="min-h-[52px] px-6 rounded-xl bg-gray-100 text-lg font-bold text-gray-800 shrink-0"
          >
            Clear
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
