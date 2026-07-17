"use client";

import Link from "next/link";
import { OrpheusLogo } from "@/components/ui/orpheus-logo";

type AuthErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthErrorPage({
  error,
  reset,
}: AuthErrorPageProps) {
  const isConfigurationError =
    error.name === "SupabaseConfigurationError" ||
    error.message.includes("NEXT_PUBLIC_SUPABASE");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-12 text-[#e8e4de]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#5EEAD4]/[0.04] blur-[120px]" />
        <div className="absolute -right-48 -bottom-48 h-[600px] w-[600px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
      </div>

      <section
        role="alert"
        className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/20 bg-white/[0.02] p-6 text-center backdrop-blur-sm"
      >
        <div className="flex justify-center">
          <OrpheusLogo size={40} />
        </div>

        <div
          aria-hidden="true"
          className="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 font-medium text-amber-200"
        >
          !
        </div>

        <h1 className="mt-4 text-2xl tracking-[-0.02em]">
          {isConfigurationError
            ? "Sign-in is temporarily unavailable"
            : "Something went wrong"}
        </h1>

        <p className="mt-3 text-[14px] leading-6 text-white/50">
          {isConfigurationError
            ? "Orpheus authentication hasn’t been configured yet. Please try again later."
            : "We couldn’t load the authentication page. Please retry or return home."}
        </p>

        {isConfigurationError &&
          process.env.NODE_ENV === "development" && (
            <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-left">
              <p className="text-[12px] leading-5 text-amber-100/60">
                DEV NOTE: add NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the
                development server.
              </p>
            </div>
          )}

        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/60 transition hover:bg-white/[0.04] hover:text-white/80"
          >
            Back to Home
          </Link>

          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#5EEAD4] px-4 py-2 text-[13px] font-medium text-[#050505] transition hover:bg-[#7df0de]"
          >
            Try Again
          </button>
        </div>
      </section>
    </main>
  );
}