import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Dashboard } from "./Dashboard";
import { AuthScreen } from "./AuthScreen";

export const ProtectedDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-carbon-900 text-white" />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={() => undefined} />;
  }

  return <Dashboard session={session} onSignOut={async () => void (await supabase.auth.signOut())} />;
};
