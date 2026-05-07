import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Dashboard } from "./Dashboard";
import { AuthScreen } from "./AuthScreen";

// Mock session for development
const createDevSession = (): Session => ({
  user: {
    id: "dev-user-id",
    aud: "authenticated",
    email: "dev@thapar.edu",
    user_metadata: {},
    app_metadata: {},
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    role: "authenticated",
  },
  access_token: "dev-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

export const ProtectedDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode] = useState(true);  // Development mode bypass

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      // Development mode: bypass auth for testing
      if (isDevMode) {
        if (!active) return;
        setSession(createDevSession());
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    };

    void loadSession();

    // In dev mode, don't listen for auth changes
    if (isDevMode) {
      return () => {
        active = false;
      };
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [isDevMode]);

  if (loading) {
    return <div className="min-h-screen bg-carbon-900 text-white" />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={() => undefined} />;
  }

  return <Dashboard session={session} onSignOut={async () => void (await supabase.auth.signOut())} />;
};
