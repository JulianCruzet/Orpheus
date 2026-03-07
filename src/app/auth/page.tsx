"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/chat");

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (next) {
      setNextPath(next);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setMessage(
          "account created. if email confirmation is enabled, check your inbox before signing in.",
        );
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(nextPath);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
        },
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setMessage("magic link sent. check your email to continue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage("signed out.");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070f] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,0.2),transparent_40%)]" />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#060b16]/90 p-6 shadow-2xl shadow-black/30"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">shams-e auth</p>
        <h1 className="mt-2 text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          welcome back
        </h1>
        <p className="mt-2 text-sm text-white/70">
          sign in to access your commerce workspace and saved conversation history.
        </p>

        {session ? (
          <div className="mt-5 rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <p>signed in as {session.user.email}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => router.push(nextPath)}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-medium text-[#041018]"
              >
                go to chat
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80"
              >
                sign out
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  mode === "signin"
                    ? "bg-cyan-400 text-[#041018]"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  mode === "signup"
                    ? "bg-cyan-400 text-[#041018]"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="email"
                className="h-11 w-full rounded-xl border border-white/15 bg-[#0b1220] px-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-300/60"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="password (min 6 chars)"
                className="h-11 w-full rounded-xl border border-white/15 bg-[#0b1220] px-4 text-sm outline-none placeholder:text-white/35 focus:border-cyan-300/60"
              />

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-cyan-400 text-sm font-medium text-[#041018] disabled:opacity-60"
              >
                {loading
                  ? "working..."
                  : mode === "signin"
                    ? "sign in"
                    : "create account"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading || !email}
              className="mt-3 h-10 w-full rounded-xl border border-cyan-300/35 bg-cyan-400/10 text-xs uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-50"
            >
              send magic link instead
            </button>
          </>
        )}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
      </motion.section>
    </main>
  );
}
