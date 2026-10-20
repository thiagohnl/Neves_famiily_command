import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { FamilyMember } from '../../types';
import { TodayItem } from '../../types/today';
import { memberColor } from '../../constants/memberColors';
import { nowLineIndex } from '../../lib/todayItems';
import { MemberAvatar } from './MemberAvatar';

interface TodayListProps {
  items: TodayItem[];
  familyMembers: FamilyMember[];
  nowMinutes: number;
  onComplete: (item: TodayItem) => void;
}

const formatNow = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const Faces: React.FC<{ ids: string[]; familyMembers: FamilyMember[] }> = ({ ids, familyMembers }) => (
  <span className="flex -space-x-1.5 shrink-0">
    {ids.map(id => {
      const member = familyMembers.find(m => m.id === id);
      return member ? (
        <MemberAvatar key={id} member={member} color={memberColor(familyMembers, id)} size={28} className="border-2 border-white" />
      ) : null;
    })}
  </span>
);

const PastRow: React.FC<{ item: TodayItem }> = ({ item }) => (
  <li className="flex items-center gap-3 px-3 py-1.5 text-[17px] text-gray-400">
    <CheckCircle size={18} className="text-green-500 shrink-0" />
    <span className="w-14 shrink-0 font-semibold">{item.start}</span>
    <span className="shrink-0 opacity-60">{item.emoji}</span>
    <span className="line-through truncate">{item.title}</span>
  </li>
);

const ItemCard: React.FC<{ item: TodayItem; familyMembers: FamilyMember[]; onComplete: (item: TodayItem) => void }> = ({
  item,
  familyMembers,
  onComplete,
}) => (
  <li
    className={`flex items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-3 border-l-8 ${
      item.isNow && !item.allDay ? 'ring-[3px] ring-season-accent' : ''
    }`}
    style={{ borderLeftColor: item.color || '#E5E7EB' }}
  >
    <span className="w-16 shrink-0 text-lg font-bold text-gray-700 leading-tight">
      {item.allDay ? 'All day' : item.start}
    </span>
    <span className="text-4xl leading-none shrink-0" aria-hidden="true">{item.emoji}</span>
    <div className="flex-1 min-w-0">
      <div className="text-[22px] font-bold text-gray-900 leading-tight truncate">{item.title}</div>
      {(item.subtitle || item.memberIds.length > 0) && (
        <div className="flex items-center gap-2 mt-1 min-w-0">
          <Faces ids={item.memberIds} familyMembers={familyMembers} />
          {item.subtitle && <span className="text-base text-gray-600 truncate">{item.subtitle}</span>}
        </div>
      )}
    </div>
    {item.completable && (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onComplete(item)}
        className="h-[52px] px-5 shrink-0 bg-green-500 text-white rounded-xl text-lg font-bold flex items-center gap-2"
      >
        <CheckCircle size={22} /> Done!
      </motion.button>
    )}
  </li>
);

/** Today's items with a red NOW line between what has started and what is still to come. */
export const TodayList: React.FC<TodayListProps> = ({ items, familyMembers, nowMinutes, onComplete }) => {
  if (items.length === 0) {
    return <p className="text-xl text-gray-500 text-center py-10">Nothing planned today 🎉</p>;
  }
  const lineAt = nowLineIndex(items, nowMinutes);
  const nowLine = (
    <li key="now-line" data-now-line className="flex items-center gap-2 py-1" aria-label={`Now, ${formatNow(nowMinutes)}`}>
      <span className="text-sm font-extrabold text-red-600 tracking-wide">NOW {formatNow(nowMinutes)}</span>
      <span className="flex-1 h-1 rounded bg-red-500" />
    </li>
  );

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <React.Fragment key={item.id}>
          {i === lineAt && nowLine}
          {item.isPast ? <PastRow item={item} /> : <ItemCard item={item} familyMembers={familyMembers} onComplete={onComplete} />}
        </React.Fragment>
      ))}
      {lineAt === items.length && nowLine}
    </ul>
  );
};
