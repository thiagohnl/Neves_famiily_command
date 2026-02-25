import React, { useState, useEffect, Suspense } from 'react';
import { RefreshCw, Wifi, WifiOff, Settings, Palette } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useChores } from './hooks/useChores';
import { useAppSettings } from './hooks/useAppSettings';
import { useParentAuth } from './hooks/useParentAuth';
import { EditFamilyMembers } from './components/EditFamilyMembers';
import { SettingsModal } from './components/SettingsModal';
import { ParentAuthModal } from './components/ParentAuthModal';
import { ParentModeToggle } from './components/ParentModeToggle';

// Lazy-loaded tab components for code splitting
const TimelineChoreBoard = React.lazy(() =>
  import('./components/TimelineChoreBoard').then(m => ({ default: m.TimelineChoreBoard }))
);
const ChoreManagement = React.lazy(() => import('./components/ChoreManagement'));
const MealPlan = React.lazy(() =>
  import('./components/MealPlan').then(m => ({ default: m.MealPlan }))
);
const Schedule = React.lazy(() =>
  import('./components/Schedule').then(m => ({ default: m.Schedule }))
);
const FunIdeas = React.lazy(() =>
  import('./components/FunIdeas').then(m => ({ default: m.FunIdeas }))
);

const TabSpinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
  </div>
);

type TabView = 'board' | 'chores' | 'meals' | 'schedule' | 'fun';

function App() {
  const { chores, familyMembers, loading, error, completeChore, addChore, refetch } = useChores();
  const { settings, loading: settingsLoading, updateSettings } = useAppSettings();
  const { isAuthenticated: isParentMode, authenticateParent, exitParentMode } = useParentAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParentAuth, setShowParentAuth] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabView>('board');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    return await completeChore(choreId, points, assignedTo);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'kids-theme');
    if (settings.theme === 'dark') root.classList.add('dark');
    else if (settings.theme === 'kids') root.classList.add('kids-theme');
  }, [settings.theme]);

  const getThemeClasses = () => { /* ... same as before ... */ };
  const getHeaderClasses = () => { /* ... same as before ... */ };

  if (showEditMembers) { return <EditFamilyMembers onBack={() => setShowEditMembers(false)} />; }
  if (loading || settingsLoading) { /* ... same as before ... */ }
  if (error) { /* ... same as before ... */ }

  return (
    <div className={`min-h-screen ${getThemeClasses()}`}>
      <Toaster position="top-center" />

      {/* Skip-to-content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Sticky Header Stack */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
        {/* Header Bar */}
        <header className={`${getHeaderClasses()} h-14 border-b border-gray-100`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center justify-between h-full">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{settings.title}</h1>
              <div className="flex items-center gap-2">
                <ParentModeToggle isParentMode={isParentMode} onRequestAuth={() => setShowParentAuth(true)} onExitParentMode={exitParentMode} />
                {isOnline ? <Wifi size={18} className="text-green-500" /> : <WifiOff size={18} className="text-red-500" />}
                <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-100 rounded-md transition-colors" aria-label="Settings"><Palette size={18} /></button>
                {isParentMode && <button onClick={() => setShowEditMembers(true)} className="p-2 hover:bg-gray-100 rounded-md transition-colors" aria-label="Edit members"><Settings size={18} /></button>}
                <button onClick={refetch} className="p-2 hover:bg-gray-100 rounded-md transition-colors" aria-label="Refresh"><RefreshCw size={18} /></button>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <nav className={`${getHeaderClasses()} h-11`} aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full" role="tablist">
              {[
                { id: 'board', label: 'Board', emoji: '🗓️' },
                { id: 'chores', label: 'Chores', emoji: '📋' },
                { id: 'meals', label: 'Meal Plan', emoji: '🍽️' },
                { id: 'schedule', label: 'Schedule', emoji: '🕓' },
                { id: 'fun', label: 'Fun Ideas', emoji: '🎯' }
              ].map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as TabView)}
                    className={`relative shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-colors ${
                      isActive ? 'text-purple-600' : 'text-gray-600'
                    }`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="main-content"
                    tabIndex={isActive ? 0 : -1}
                  >
                    <span className="text-lg">{tab.emoji}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span
                      className={`pointer-events-none absolute left-2 right-2 -bottom-1 h-0.5 rounded ${
                        isActive ? 'bg-purple-500' : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main
        id="main-content"
        role="tabpanel"
        aria-live="polite"
        className="relative pt-[100px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
      >
        <Suspense fallback={<TabSpinner />}>
          {currentTab === 'board' && <TimelineChoreBoard familyMembers={familyMembers} chores={chores} onCompleteChore={handleCompleteChore} />}
          {currentTab === 'chores' && <ChoreManagement familyMembers={familyMembers} chores={chores} isParentMode={isParentMode} onAddChore={addChore} onRefresh={refetch} />}
          {currentTab === 'meals' && <MealPlan familyMembers={familyMembers} isParentMode={isParentMode} />}
          {currentTab === 'schedule' && <Schedule familyMembers={familyMembers} isParentMode={isParentMode} />}
          {currentTab === 'fun' && <FunIdeas />}
        </Suspense>
      </main>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onUpdateSettings={updateSettings} />
      <ParentAuthModal isOpen={showParentAuth} onClose={() => setShowParentAuth(false)} onAuthenticate={(pin) => { const success = authenticateParent(pin); if (success) setShowParentAuth(false); return success; }} />
    </div>
  );
}
export default App;
