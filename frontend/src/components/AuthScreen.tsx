import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type AuthScreenProps = {
  onAuthenticated: () => void;
};

export const AuthScreen = ({ onAuthenticated }: AuthScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const action = mode === "sign-in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await action({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(mode === "sign-in" ? "Signed in successfully." : "Check your email to confirm your account.");
      onAuthenticated();
    }

    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-carbon-900 px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.4em] text-carbon-200/70">Carbon Commit</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Sign in to manage campus sustainability logs.</h1>
            <p className="max-w-xl text-sm leading-6 text-carbon-100/80 sm:text-base">
              Use Supabase Auth to protect the dashboard, limit log entry to authenticated users, and keep the API tied to real user sessions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[1.75rem] bg-white p-6 text-carbon-900 shadow-2xl">
            <div className="mb-5 flex gap-2 rounded-full bg-carbon-50 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={`flex-1 rounded-full px-4 py-2 transition ${mode === "sign-in" ? "bg-carbon-900 text-white" : "text-carbon-600"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={`flex-1 rounded-full px-4 py-2 transition ${mode === "sign-up" ? "bg-carbon-900 text-white" : "text-carbon-600"}`}
              >
                Sign Up
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-carbon-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-carbon-200 px-4 py-3 outline-none transition focus:border-carbon-500"
                placeholder="name@tiet.edu"
                required
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-sm font-medium text-carbon-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-carbon-200 px-4 py-3 outline-none transition focus:border-carbon-500"
                placeholder="Your password"
                minLength={6}
                required
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-carbon-900 px-4 py-3 font-medium text-white transition hover:bg-carbon-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Please wait..." : mode === "sign-in" ? "Sign In" : "Create Account"}
            </button>

            {message ? <p className="mt-4 text-sm text-carbon-600">{message}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
};
