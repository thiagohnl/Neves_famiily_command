import React from 'react';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

// ─── EDIT HERE: family contacts ──────────────────────────────────────────────
// name:     label the kids see (keep it short)
// whatsapp: country code + number, digits only — no "+", no spaces (e.g. 5511987654321)
// photo:    optional — an emoji ('👩') OR an image path/URL ('/contacts/mama.jpg').
//           Image paths need the file in a `public/` folder at the project root.
const CONTACTS: { name: string; whatsapp: string; photo?: string }[] = [
  { name: 'Mama', whatsapp: '00000000000', photo: '👩' },
  { name: 'Papa', whatsapp: '00000000000', photo: '👨' },
  { name: 'Vovó', whatsapp: '00000000000', photo: '👵' },
];
// ─────────────────────────────────────────────────────────────────────────────

const isImage = (photo: string) => photo.startsWith('/') || photo.startsWith('http');

export const CallFamilyCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <Phone className="text-green-600" />
        <h3 className="font-bold text-green-800 text-lg">Call Family</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CONTACTS.map(contact => (
          <motion.a
            key={contact.name}
            href={`https://wa.me/${contact.whatsapp}`}
            whileTap={{ scale: 0.92 }}
            className="min-h-[140px] bg-white rounded-2xl border-4 border-green-200 shadow-sm flex flex-col items-center justify-center gap-2 p-4"
          >
            {contact.photo && isImage(contact.photo) ? (
              <img src={contact.photo} alt={contact.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="text-6xl leading-none">{contact.photo || '📞'}</span>
            )}
            <span className="text-3xl font-bold text-gray-800">{contact.name}</span>
            <span className="flex items-center gap-1 bg-green-500 text-white rounded-full px-3 py-1 text-sm font-bold">
              <Phone size={16} /> Call
            </span>
          </motion.a>
        ))}
      </div>
    </div>
  );
};
