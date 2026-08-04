import React from 'react';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

// ─── EDIT HERE: family contacts ──────────────────────────────────────────────
// name:     label the kids see (keep it short)
// whatsapp: country code + number, digits only — no "+", no spaces (e.g. 5511987654321)
// photo:    optional — an emoji ('👩') OR an image path/URL ('/contacts/mama.jpg').
//           Image paths need the file in a `public/` folder at the project root.
const CONTACTS: { name: string; whatsapp: string; photo?: string }[] = [
  { name: 'Mama', whatsapp: '31651054931', photo: '👩' },
  { name: 'Papa', whatsapp: '31655533898', photo: '👨' },
  { name: 'Vovó', whatsapp: '5569993112283', photo: '👵' },
];
// ─────────────────────────────────────────────────────────────────────────────

const isImage = (photo: string) => photo.startsWith('/') || photo.startsWith('http');

// Compact call pills for the tab bar. Tapping opens the contact's WhatsApp
// chat — the call button is one tap away there (web links can't dial
// directly). Uses an Android intent:// URL: inside the kiosk WebView, wa.me
// just renders WhatsApp's website (app-links don't fire for in-WebView
// navigations) and a bare whatsapp:// scheme gets silently dropped, but
// intent URLs are the WebView-sanctioned way to launch an app; the embedded
// browser_fallback_url falls back to wa.me if the intent is blocked too.
// Touch-only feedback via whileTap; no hover reliance.
const whatsappHref = (phone: string) =>
  `intent://send?phone=${phone}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(`https://wa.me/${phone}`)};end`;
export const CallFamilyButtons: React.FC = () => {
  return (
    <div className="ml-auto flex items-center gap-1.5 pl-2 shrink-0">
      {CONTACTS.map(contact => (
        <motion.a
          key={contact.name}
          href={whatsappHref(contact.whatsapp)}
          whileTap={{ scale: 0.9 }}
          className="shrink-0 flex items-center gap-1.5 bg-green-500 text-white rounded-full pl-1.5 pr-3 py-1 text-sm font-bold"
        >
          {contact.photo && isImage(contact.photo) ? (
            <img src={contact.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <span className="text-lg leading-none">{contact.photo || '📞'}</span>
          )}
          {contact.name}
          <Phone size={14} />
        </motion.a>
      ))}
    </div>
  );
};
