import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBadgeProps {
  ready: boolean;
  hasCache: boolean;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ ready, hasCache }) => {
  // Don't show badge if Supabase is ready or if there's no cached data
  if (ready || !hasCache) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium"
      title="Add Supabase later in Integrations"
    >
      <WifiOff size={14} />
      <span className="hidden sm:inline">Offline mode</span>
    </div>
  );
};