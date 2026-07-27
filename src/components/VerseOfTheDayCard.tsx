import React from 'react';
import { BookOpen } from 'lucide-react';

// Family-friendly verses; the day of the year picks one, so every device
// shows the same verse all day and it rotates automatically at midnight.
const VERSES = [
  'John 3:16', 'Psalm 23:1', 'Psalm 118:24', 'Philippians 4:13', 'Proverbs 3:5-6',
  'Joshua 1:9', 'Psalm 46:1', 'Isaiah 41:10', 'Matthew 5:16', '1 Corinthians 16:14',
  'Ephesians 4:32', 'Colossians 3:23', 'Psalm 139:14', 'Romans 8:28', 'Jeremiah 29:11',
  'Galatians 5:22-23', 'Matthew 19:14', 'Psalm 121:1-2', 'Proverbs 17:17', '1 John 4:19',
  'Psalm 100:1-2', 'Hebrews 13:8', 'James 1:17', 'Psalm 27:1', 'Micah 6:8',
  'Matthew 22:39', 'Luke 6:31', 'Psalm 133:1', 'Proverbs 15:1', 'Isaiah 40:31',
  'Zephaniah 3:17', 'Psalm 34:8', '1 Thessalonians 5:16-18', '2 Timothy 1:7', 'Psalm 19:1',
  'Proverbs 22:6', 'Deuteronomy 6:5', 'Psalm 56:3', 'John 14:27', 'Romans 12:12',
  'Colossians 3:12', '1 Peter 5:7', 'Psalm 37:4', 'Proverbs 16:3', 'John 15:12',
  'Ephesians 6:1', 'Psalm 150:6', 'Nehemiah 8:10', 'Matthew 6:33', 'Psalm 4:8',
  'Lamentations 3:22-23', 'Romans 15:13', 'Psalm 90:12', 'Proverbs 11:25', 'John 8:12',
  'Philippians 4:6-7', 'Psalm 28:7', 'Isaiah 26:3', 'Matthew 11:28', '1 Chronicles 16:34',
  'Psalm 143:8', 'Galatians 6:9', 'Ephesians 2:10', 'Psalm 16:8', 'James 1:5',
  'Ruth 1:16', 'Psalm 119:105', 'Proverbs 18:10', 'Matthew 7:12', 'Romans 12:10',
];

const CACHE_KEY = 'verse-of-the-day';

interface CachedVerse {
  date: string;
  reference: string;
  text: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

export const VerseOfTheDayCard: React.FC = () => {
  const [verse, setVerse] = React.useState<CachedVerse | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? (JSON.parse(cached) as CachedVerse) : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    const reference = VERSES[dayOfYear() % VERSES.length];
    if (verse?.date === todayKey()) return;

    let cancelled = false;
    fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=web`)
      .then(res => {
        if (!res.ok) throw new Error(`bible-api ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (cancelled || !data.text) return;
        const fresh: CachedVerse = {
          date: todayKey(),
          reference: data.reference || reference,
          text: String(data.text).replace(/\s+/g, ' ').trim(),
        };
        setVerse(fresh);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch { /* storage full */ }
      })
      .catch(() => { /* keep whatever is cached; a stale verse beats an empty card */ });
    return () => { cancelled = true; };
  }, [verse?.date]);

  return (
    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="text-indigo-600" />
        <h3 className="font-bold text-indigo-800 text-lg">Verse of the Day</h3>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        {verse ? (
          <>
            <p className="text-sm italic text-indigo-900">“{verse.text}”</p>
            <p className="text-xs font-bold text-indigo-700 mt-2">— {verse.reference}</p>
          </>
        ) : (
          <p className="text-sm text-indigo-700">Loading today's verse...</p>
        )}
      </div>
    </div>
  );
};
