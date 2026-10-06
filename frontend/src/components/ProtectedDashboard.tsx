import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Dashboard } from "./Dashboard";
import { AuthScreen } from "./AuthScreen";

export const ProtectedDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signingOutRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    };

    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (signingOutRef.current) return;
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    signingOutRef.current = true;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.setTimeout(() => {
        setSession(null);
        setIsSigningOut(false);
        signingOutRef.current = false;
      }, 320);
    } catch (error) {
      signingOutRef.current = false;
      setIsSigningOut(false);
      throw error;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-carbon-900 text-white" />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={() => undefined} />;
  }

  return (
    <div className={isSigningOut ? "auth-panel-exit" : undefined}>
      <Dashboard session={session} onSignOut={handleSignOut} />
    </div>
  );
};
