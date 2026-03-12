"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OrpheusLogo } from "@/components/ui/orpheus-logo";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/chat");

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) setNextPath(next);
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
          "Account created! If email confirmation is enabled, check your inbox before signing in.",
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

      setMessage("Magic link sent! Check your email to continue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage("Signed out successfully.");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] px-4 py-12 text-[#e8e4de]">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#5EEAD4]/[0.04] blur-[120px]" />
        <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 mx-auto w-full max-w-md"
      >
        {/* Logo + heading */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-5 flex justify-center"
          >
            <OrpheusLogo size={40} />
          </motion.div>
          <h1
            className="text-3xl tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome Back
          </h1>
          <p className="mt-2 text-[14px] text-white/35">
            Sign in to your commerce workspace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm">
          {session ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <p className="text-[14px] text-emerald-200/80">
                Signed in as{" "}
                <span className="font-medium text-emerald-200">
                  {session.user.email}
                </span>
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push(nextPath)}
                  className="rounded-lg bg-[#5EEAD4] px-4 py-2 text-[13px] font-medium text-[#050505] transition hover:bg-[#7df0de]"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/60 transition hover:bg-white/[0.04]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-lg px-3 py-2 text-[13px] transition ${
                    mode === "signin"
                      ? "bg-[#5EEAD4] font-medium text-[#050505]"
                      : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-lg px-3 py-2 text-[13px] transition ${
                    mode === "signup"
                      ? "bg-[#5EEAD4] font-medium text-[#050505]"
                      : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-[12px] font-medium text-white/40"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] outline-none transition placeholder:text-white/20 focus:border-[#5EEAD4]/40 focus:bg-white/[0.04]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-password"
                    className="mb-1.5 block text-[12px] font-medium text-white/40"
                  >
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] outline-none transition placeholder:text-white/20 focus:border-[#5EEAD4]/40 focus:bg-white/[0.04]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-[#5EEAD4] text-[14px] font-medium text-[#050505] transition hover:bg-[#7df0de] disabled:opacity-50"
                >
                  {loading
                    ? "Working..."
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[11px] text-white/20">or</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* Magic Link */}
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="h-10 w-full rounded-lg border border-[#5EEAD4]/20 bg-[#5EEAD4]/[0.06] text-[13px] font-medium text-[#5EEAD4]/80 transition hover:bg-[#5EEAD4]/10 disabled:opacity-40"
              >
                Send Magic Link Instead
              </button>
            </>
          )}

          {/* Messages */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[13px] text-emerald-200/80"
            >
              {message}
            </motion.p>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-[13px] text-rose-200/80"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[12px] text-white/15">
          Orpheus — AI-powered commerce
        </p>

        {/* Back to Home */}
        <div className="mt-4 flex justify-center">
          <Link
            href="/"
            className="group flex items-center gap-2 text-[13px] text-white/25 transition hover:text-white/50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
