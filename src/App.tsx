import { useState, useEffect, useRef, useCallback, startTransition } from 'react'
import { AnimatePresence } from 'motion/react';
import { Leaf, Settings, LogOut, ChevronDown } from 'lucide-react';
import { type Screen } from './core/types.ts';
import { useTrees } from './hooks/useTrees'
import { useAuth } from './hooks/useAuth'
import { useSession } from './hooks/useSession'
import Landing from './components/screens/Landing.tsx';
import Auth from './components/screens/Auth.tsx';
import Naming from './components/screens/Naming.tsx';
import Sanctuary from './components/screens/Sanctuary.tsx';
import PreSession from './components/screens/PreSession.tsx';
import Breathing from './components/screens/Breathing.tsx';
import Closing from './components/screens/Closing.tsx';
import Loading from './components/screens/Loading.tsx'
import SessionResult from './components/screens/SessionResult.tsx'

export default function App() {
  // ---- Routing ----
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const historyRef = useRef<Screen[]>(['landing']);

  // ---- Data ----
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAccountMenu) return;
    const handler = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAccountMenu]);
  const { trees, initialized: treesInitialized, error: treesError, createTree, createSession, updateSession, updateTree } = useTrees(user);
  const { sessionDurationMinutes, sessionResult, onSignal, startSession, finishSession, resetSession } = useSession({ createSession, updateSession, updateTree });

  // Derived — never stored separately to avoid drift
  const treeName = trees.find(t => t.id === selectedTreeId)?.name ?? '';
  const hasAnchorTree = selectedTreeId !== null || trees.length > 0;

  // ---- Auth routing ----

  // hasRoutedRef prevents the effect from re-routing on every Firestore snapshot update.
  // It is reset to false on sign-out so the next sign-in triggers routing again.
  // treesInitialized (not treesLoading) is the stable signal: it flips false→true exactly
  // once after the first snapshot regardless of whether Firestore returns cached data
  // before startTransition commits setLoading(true) (the stale-false race).
  const hasRoutedRef = useRef(false);
  useEffect(() => {
    if (!treesInitialized || authLoading || !user || hasRoutedRef.current) return;
    hasRoutedRef.current = true;
    const destination = trees.length > 0 ? 'sanctuary' : 'naming';
    historyRef.current = [destination]; // reset history — auth routing is not back-navigable
    startTransition(() => {
      setSelectedTreeId(trees[0]?.id ?? null);
      setCurrentScreen(destination);
    });
  }, [treesInitialized, authLoading, user, trees]);

  // Sign-out: discard any active session and return to landing
  useEffect(() => {
    if (!authLoading && !user) {
      hasRoutedRef.current = false;
      resetSession();
      startTransition(() => {
        setCurrentScreen(prev => (['landing', 'auth'].includes(prev) ? prev : 'landing'));
        setSelectedTreeId(null);
      });
    }
  }, [user, authLoading, resetSession]);

  // ---- Navigation ----

  // useCallback: hasAnchorTree is a boolean stable after initial tree load; user
  // changes only on sign-in/out. Nav reference stability matters for screens that
  // pass it into useEffect deps (none currently, but this keeps the door open).
  const navigate = useCallback((screen: Screen, data?: { treeId?: string }) => {
    if (screen === 'auth' && user && hasAnchorTree) {
      historyRef.current = [...historyRef.current, 'sanctuary'];
      setCurrentScreen('sanctuary');
      return;
    }
    if (data?.treeId) setSelectedTreeId(data.treeId);
    if (historyRef.current[historyRef.current.length - 1] !== screen) {
      historyRef.current = [...historyRef.current, screen];
    }
    setCurrentScreen(screen);
  }, [user, hasAnchorTree]);

  // useCallback: no deps, always stable — PreSession's back button.
  const goBack = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setCurrentScreen(historyRef.current[historyRef.current.length - 1]);
  }, []);

  // ---- Session lifecycle ----
  // These are plain async functions — no useCallback needed since their deps
  // (selectedTreeId, trees) change on Firestore updates anyway, and no child
  // component uses them in a useEffect dep array.

  // Lifted from Naming so that component stays a pure form with no Firestore calls
  const handleCreateTree = async (name: string) => {
    const newTree = await createTree(name);
    if (!newTree?.id) throw new Error('Tree creation returned no id');
    startTransition(() => {
      historyRef.current = [...historyRef.current, 'sanctuary'];
      setSelectedTreeId(newTree.id);
      setCurrentScreen('sanctuary');
    });
  };

  const handleStartSession = async (moodBefore: number) => {
    if (!selectedTreeId) { console.warn('No tree selected'); return; }
    try {
      await startSession(selectedTreeId, moodBefore);
      historyRef.current = [...historyRef.current, 'breathing'];
      setCurrentScreen('breathing');
    } catch (err) {
      console.error('Failed to start session', err);
    }
  };

  const handleFinishSession = async (moodAfter: number) => {
    try {
      await finishSession(moodAfter, trees);
      historyRef.current = [...historyRef.current, 'session_result'];
      setCurrentScreen('session_result');
    } catch (err) {
      console.error('Failed to finalize session', err);
    }
  };

  // ---- Render ----

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <Landing key="landing" onNavigate={navigate} />;
      case 'auth':
        return <Auth key="auth" hasAnchorTree={hasAnchorTree} onNavigate={navigate} />;
      case 'naming':
        return <Naming key="naming" onCreateTree={handleCreateTree} />;
      case 'sanctuary':
        return <Sanctuary key="sanctuary" treeName={treeName} treeId={selectedTreeId} onNavigate={navigate} />;
      case 'pre_session':
        return <PreSession key="pre_session" onStartSession={handleStartSession} onBack={goBack} />;
      case 'breathing':
        return <Breathing key="breathing" onEndSession={() => {
          historyRef.current = [...historyRef.current, 'closing'];
          setCurrentScreen('closing');
        }} onSignal={onSignal} />;
      case 'closing':
        return <Closing key="closing" onFinish={handleFinishSession} durationMinutes={sessionDurationMinutes} />;
      case 'session_result':
        return sessionResult ? (
          <SessionResult key="session_result" {...sessionResult} onNavigate={navigate} />
        ) : null;
      default:
        return <Landing key="landing" onNavigate={navigate} />;
    }
  };

  const showHeaderFooter = ['landing', 'auth', 'naming', 'sanctuary', 'pre_session', 'closing'].includes(currentScreen);

  if (authLoading || (user && !treesInitialized)) {
    return <Loading message="Preparing your grove…" />;
  }
  if (treesError) {
    return <Loading message="Error loading trees" error={treesError} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary-container selection:text-on-primary-container">
      {showHeaderFooter && (currentScreen === 'landing' || currentScreen === 'sanctuary') && (
        <header className={`${currentScreen === 'landing' ? 'absolute bg-transparent' : 'sticky bg-white/80 backdrop-blur-md border-b border-on-surface/5'} top-0 left-0 right-0 z-50 transition-all duration-500`}>
          <div className="flex justify-between items-center w-full px-10 py-6 md:px-16 max-w-screen-2xl mx-auto font-headline">
            <a 
              onClick={() => navigate('landing')}
              className="flex items-center gap-3 text-2xl font-bold text-primary italic tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Leaf className="w-6 h-6 text-primary rotate-[-20deg]" />
              StillGrove
            </a>
            <nav className="hidden md:flex items-center gap-12 text-[15px] font-body">
              {[
                { label: 'Sanctuary' },
                { label: currentScreen === 'sanctuary' ? 'Rituals' : 'Journal' },
                { label: currentScreen === 'sanctuary' ? 'My Grove' : 'Rituals' },
                { label: currentScreen === 'sanctuary' ? 'Journal' : 'About' },
              ].map((item) => (
                <a
                  key={item.label}
                  className={`transition-all duration-300 cursor-pointer ${
                    item.label === 'Sanctuary' && currentScreen === 'sanctuary'
                      ? 'text-primary border-b-2 border-primary pb-0.5 font-bold'
                      : 'text-primary/60 hover:text-primary'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            {user && <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu(prev => !prev)}
                className="flex items-center gap-1.5 text-primary/60 hover:text-primary transition-colors p-2"
              >
                <span className="material-symbols-outlined text-2xl">account_circle</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-on-surface/5 overflow-hidden z-50 py-1.5">
                  {user && (
                    <>
                      <div className="px-4 py-3 border-b border-on-surface/5">
                        <p className="font-body text-[11px] uppercase tracking-widest font-bold text-on-surface/40">Signed in as</p>
                        <p className="font-body text-sm text-on-surface/80 truncate mt-0.5">{user.email}</p>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => setShowAccountMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left font-body text-sm text-on-surface/70 hover:bg-surface-container-low hover:text-on-surface transition-colors"
                  >
                    <Settings className="w-4 h-4 opacity-60" />
                    Settings
                  </button>
                  {user && (
                    <button
                      onClick={() => { setShowAccountMenu(false); signOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left font-body text-sm text-red-500/80 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  )}
                </div>
              )}
            </div>}
          </div>
        </header>
      )}

      <main className="flex-grow flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>

      {showHeaderFooter && (
        <footer className={`bg-[#f5f5f0] w-full mt-auto relative z-20 ${currentScreen === 'landing' ? 'pb-20' : 'pb-12'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 py-10 px-10 md:px-16 border-t border-on-surface/5 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-8 h-full">
              <a 
                onClick={() => navigate('landing')}
                className="text-2xl font-headline font-bold text-primary italic tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
              >
                StillGrove
              </a>
              <nav className="flex items-center gap-8 font-body text-[13px] font-medium text-on-surface/60">
                {['Privacy', 'Terms', 'Support'].map((item) => (
                  <a key={item} className="hover:text-primary transition-opacity duration-300 cursor-pointer">
                    {item}
                  </a>
                ))}
              </nav>
            </div>
            <div className="font-body text-[13px] text-on-surface/40">
              © 2026 StillGrove. Cultivate stillness.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
