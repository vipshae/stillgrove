import { useState, useEffect } from 'react'
import { AnimatePresence } from 'motion/react';
import { Leaf, Settings } from 'lucide-react';
import { type Screen } from './types.ts';
import Landing from './components/Landing.tsx';
import Auth from './components/Auth.tsx';
import Naming from './components/Naming.tsx';
import Sanctuary from './components/Sanctuary.tsx';
import PreSession from './components/PreSession.tsx';
import Breathing from './components/Breathing.tsx';
import Closing from './components/Closing.tsx';
import { useTrees } from './hooks/useTrees'
import { useAuth } from './hooks/useAuth'
import Loading from './components/Loading'
import TreeSketch from './TreeSketch.tsx'
import { calculateSQS } from './sqs.ts'
import { triggerEndSession } from './sketch.ts'

// export default function App() {
//   const { user, trees, loading: treesLoading } = useTrees()
//   const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'naming' | 'main'>('landing')

//   // For demo purposes, using state; in real app, load from selected tree
//   const [totalHours, setTotalHours] = useState(8)
//   const [sqs, setSqs] = useState(0.7)

//   if (treesLoading) {
//     return <div>Loading...</div>
//   }

//   if (!user) {
//     console.log('User', user)
//     if (currentView === 'landing') {
//       return <Landing onGetStarted={() => setCurrentView('auth')} />
//     }
//     return <Auth />
//   }

//   // if (trees.length === 0) {
//   //   if (currentView !== 'naming') {
//   //     setCurrentView('naming')
//   //   }
//   //   return <Naming onTreeCreated={() => {
//   //     setCurrentView('main')
//   //     // For now, select the first tree
//   //     setSelectedTree(trees[0]?.id || null)
//   //   }} />
//   // }

//   // Main app view
//   const handleEndSession = () => {
//     // Example session data
//     const session = {
//       durationMinutes: 30,
//       uninterruptedMinutes: 25,
//       stillnessScore: 0.8,
//       moodBefore: 3,
//       moodAfter: 4,
//       distractionCount: 2,
//       distractionSeconds: 60
//     }
//     const history = {
//       recentSQS: [0.6, 0.65],
//       sessionsLast7Days: 3,
//       totalHours: totalHours
//     }
//     const newSqs = calculateSQS(session, history)
//     const newHours = totalHours + 0.5
//     setSqs(newSqs)
//     setTotalHours(newHours)
//     triggerEndSession(newHours, session.durationMinutes / 60)
//   }

//   return (
//       <section id="center">
//         <div className="hero">
//           <h1>StillGrove</h1>
//             <TreeSketch totalHours={totalHours} sqs={sqs} />
//         </div>
//         <div>
//           <h2>Session Quality Score: {sqs.toFixed(2)}</h2>
//           <button onClick={handleEndSession}>
//             End Session (+0.5 hours)
//           </button>
//         </div>
//       </section>
//   )
// }


export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [treeName, setTreeName] = useState<string>('');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [history, setHistory] = useState<Screen[]>(['landing']);
  const { user, loading: authLoading } = useAuth();
  const { trees, loading: treesLoading, error: treesError } = useTrees(user);

  // On startup, decide which screen to show once auth + trees have loaded.
  useEffect(() => {
    // while auth is resolving, don't change screens
    if (authLoading) return;

    // not signed in -> show landing (don't auto-route)
    if (!user) {
      setCurrentScreen('landing');
      return;
    }

    // signed in: wait for trees to finish loading
    if (treesLoading) return;

    // route based on whether user already has an anchor tree
    if (Boolean(treeName) || (trees || []).length > 0) {
      // ensure treeName is populated from the server-loaded trees on refresh
      if (!treeName && (trees || []).length > 0) {
        setTreeName(trees[0].name);
      }
      setCurrentScreen('sanctuary');
    } else {
      setCurrentScreen('naming');
    }
  }, [authLoading, user, treesLoading, trees, treeName]);

  const navigate = (screen: Screen, data?: { treeName?: string, treeId?: string, hasAnchorTree?: boolean }) => {
    // If user is trying to open the auth screen but they're already signed in
    // and they have an existing anchor tree, send them to the sanctuary instead.
    if (screen === 'auth' && user && hasAnchorTree) {
      setHistory([...history, 'sanctuary']);
      setCurrentScreen('sanctuary');
      return;
    }
    if (data?.treeName) {
      setTreeName(data.treeName);
    }
    if (data?.treeId) {
      setSelectedTreeId(data.treeId);
    }

    // If navigating to sanctuary without an explicit treeName, pick the first tree's name/id if available
    if (screen === 'sanctuary' && !data?.treeName && (trees || []).length > 0) {
      setTreeName(trees[0].name);
      setSelectedTreeId(trees[0].id);
    }
    // avoid pushing duplicate history entry when updating the same screen (e.g., setting id)
    if (screen === currentScreen) {
      return;
    }
    setHistory([...history, screen]);
    setCurrentScreen(screen);
  };

  
  // derive whether user has an anchor tree from local `treeName` or loaded `trees`
  const hasAnchorTree = Boolean(treeName) || ((trees || []).length > 0);

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentScreen(prevScreen);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <Landing key="landing" onNavigate={(s) => navigate(s)} />;
      case 'auth':
        return <Auth key="auth" hasAnchorTree={hasAnchorTree} onNavigate={(s, data) => navigate(s, data)} />;
      case 'naming':
        return <Naming key="naming" onNavigate={(s, data) => navigate(s, data)} />;
      case 'sanctuary':
        return <Sanctuary key="sanctuary" treeName={treeName} treeId={selectedTreeId} onNavigate={(s) => navigate(s)} />;
      case 'pre_session':
        return <PreSession key="pre_session" onNavigate={(s) => navigate(s)} onBack={goBack} />;
      case 'breathing':
        return <Breathing key="breathing" onNavigate={(s) => navigate(s)} />;
      case 'closing':
        return <Closing key="closing" onNavigate={(s) => navigate(s)} />;
      default:
        return <Landing key="landing" onNavigate={(s) => navigate(s)} />;
    }
  };

  const showHeaderFooter = ['landing', 'auth', 'naming', 'sanctuary', 'pre_session', 'closing'].includes(currentScreen);
  // If we're still resolving auth or (signed-in user and trees), show a splash to avoid UI flicker
  if (authLoading || (user && treesLoading)) {
    return <Loading message="Preparing your grove…" />;
  }

  if (treesError) {
    return <Loading message="Error loading trees" error={treesError} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary-container selection:text-on-primary-container">
      {/* Texture noise is in index.css as body pseudo-element */}
      
      {showHeaderFooter && (currentScreen === 'landing' || currentScreen === 'sanctuary') && (
        <header className={`${currentScreen === 'landing' ? 'absolute bg-transparent' : 'sticky bg-white/80 backdrop-blur-md border-b border-on-surface/5'} top-0 left-0 right-0 z-50 transition-all duration-500`}>
          <div className="flex justify-between items-center w-full px-10 py-6 md:px-16 max-w-screen-2xl mx-auto font-headline">
            <a className="flex items-center gap-3 text-2xl font-bold text-primary italic tracking-tight hover:opacity-80 transition-opacity cursor-pointer">
              <Leaf className="w-6 h-6 text-primary rotate-[-20deg]" />
              StillGrove
            </a>
            <nav className="hidden md:flex items-center gap-12 text-[15px] font-body">
              {[
                { label: 'Sanctuary', href: 'sanctuary' },
                { label: currentScreen === 'sanctuary' ? 'Rituals' : 'Journal', href: '#' },
                { label: currentScreen === 'sanctuary' ? 'My Grove' : 'Rituals', href: '#' },
                { label: currentScreen === 'sanctuary' ? 'Journal' : 'About', href: '#' }
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
            <div className="flex items-center gap-4">
              {currentScreen === 'sanctuary' && (
                <button className="text-primary/60 hover:text-primary transition-colors p-2">
                  <Settings className="w-6 h-6" />
                </button>
              )}
              <button className="text-primary/60 hover:text-primary transition-colors p-2">
                <span className="material-symbols-outlined text-2xl">account_circle</span>
              </button>
            </div>
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
              <a className="text-2xl font-headline font-bold text-primary italic tracking-tight cursor-pointer">StillGrove</a>
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

