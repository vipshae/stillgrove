import { useState } from 'react';
import { motion } from 'motion/react';
import { GoogleSignInButton, SignUpAuthScreen, SignInAuthScreen } from '@firebase-oss/ui-react';
import { type Screen } from '../../core/types';

interface AuthProps {
  onNavigate: (screen: Screen) => void;
  hasAnchorTree: boolean;
  key?: string;
}

function navigateAfterSignInUp({ onNavigate, hasAnchorTree }: AuthProps) {
  // After sign-in/up, navifate based on whether the user has an anchor tree or not.
  if (hasAnchorTree) {
    onNavigate('sanctuary');
  } else {
    onNavigate('naming');
  }
}

export default function Auth({ onNavigate, hasAnchorTree }: AuthProps) {
  const [authScreen, setAuthScreen] = useState<'signin' | 'signup'>('signin');
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex-grow flex items-center justify-center py-24 px-6 relative z-10"
    >
      <div className="max-w-md w-full relative">
        <div className="bg-white/80 backdrop-blur-[12px] rounded-[40px] p-12 shadow-[0_20px_60px_rgba(45,45,42,0.05)] border border-on-surface/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="text-center mb-10 relative z-10">
            <h1 className="font-headline text-5xl text-primary tracking-widest uppercase font-bold mb-3 italic">StillGrove</h1>
            <p className="text-on-surface opacity-50 text-sm font-body uppercase tracking-widest font-semibold">Return to your center.</p>
          </div>
          
          {authScreen === 'signin' && (
            <>
              <div className="firebase-ui-screen">
                <SignInAuthScreen onSignIn={() => navigateAfterSignInUp({ onNavigate, hasAnchorTree })} />
              </div>
              
              <div className="my-10 flex items-center justify-center space-x-6 relative z-10">
                <div className="h-px bg-on-surface/5 w-full"></div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface opacity-20 font-body">or</span>
                <div className="h-px bg-on-surface/5 w-full"></div>
              </div>

              <GoogleSignInButton themed onSignIn={() => {
                // After sign-in, you can perform additional actions here if needed
                if (hasAnchorTree) {
                  onNavigate('sanctuary');
                } else {
                  onNavigate('naming');
                }
              }} 
              />

              <div className="mt-12 text-center relative z-10">
                <p className="text-on-surface opacity-40 text-xs uppercase tracking-widest font-bold mb-6">New to the grove?</p>
                <button 
                  onClick={() => setAuthScreen('signup')}
                  className="inline-block bg-white text-primary border border-primary/20 font-body text-[10px] uppercase tracking-[0.3em] font-bold py-5 px-12 shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-500 rounded-full"
                >
                  Begin your journey
                </button>
              </div>
            </>
          )}

          {authScreen === 'signup' && (
            <div className="space-y-6 relative z-10">
              <div className="firebase-ui-screen">
                <SignUpAuthScreen onSignUp={() => navigateAfterSignInUp({ onNavigate, hasAnchorTree })} />
              </div>
              <button 
                onClick={() => setAuthScreen('signin')}
                className="w-full text-primary font-body text-[10px] uppercase tracking-[0.3em] font-bold py-3 hover:text-primary-container transition-colors duration-400"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );  
}