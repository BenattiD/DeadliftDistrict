import { useState, useEffect } from 'react';
import { account } from './lib/appwrite';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import { UserProfile } from './types';
import { Loader2, Dumbbell } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

  // Check if session exists on load
  const checkCurrentSession = async () => {
    setSessionCheckLoading(true);
    try {
      // According to spec, session check via Appwrite Web SDK account.get()
      const userDoc = await account.get();
      setCurrentUser({
        id: userDoc.$id,
        email: userDoc.email,
        name: userDoc.name || userDoc.email.split('@')[0],
      });
    } catch (err) {
      // Not logged in or session expired
      console.log('No active session found:', err);
      setCurrentUser(null);
    } finally {
      setSessionCheckLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentSession();
  }, []);

  const handleLoginSuccess = () => {
    checkCurrentSession();
  };

  const handleLogoutSuccess = () => {
    setCurrentUser(null);
  };

  if (sessionCheckLoading) {
    return (
      <div id="initial-loading-viewport" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] animate-bounce">
            <Dumbbell className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold font-display text-zinc-100 tracking-tight">
            Workout Tracker
          </h2>
          <p className="text-zinc-400 text-xs mt-2 mb-6">
            Establishing secure handshake with Appwrite Web SDK...
          </p>
          <div className="flex items-center gap-2.5 text-zinc-500 font-mono text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Verifying Credentials</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-150">
      {currentUser ? (
        <DashboardView 
          user={currentUser} 
          onLogout={handleLogoutSuccess} 
        />
      ) : (
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}
    </div>
  );
}
