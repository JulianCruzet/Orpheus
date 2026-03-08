"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DashboardPanel } from "@/components/chat/dashboard-panel";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ShamsELogo } from "@/components/ui/shams-e-logo";

export default function ChatPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardVersion, setDashboardVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);

      if (!data.session) {
        router.replace("/auth?next=/chat");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);

      if (!nextSession) {
        router.replace("/auth?next=/chat");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleDashboardRefresh = useCallback(() => {
    setDashboardVersion((v) => v + 1);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (authLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#050505] text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="h-4 w-4 rounded-full border border-[#5EEAD4]/40 border-t-[#5EEAD4] animate-spin" />
          <span className="text-sm text-white/60">Authenticating...</span>
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main style={{ height: "100dvh" }} className="flex flex-col bg-[#050505] text-[#e8e4de] overflow-hidden">
      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-5"
      >
        <div className="flex items-center gap-3">
          <ShamsELogo size={20} />
          <span
            className="text-[14px] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Shams-E
          </span>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <span
            className="hidden text-[10px] tracking-[0.12em] text-white/25 sm:block"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            WORKSPACE
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-white/35">{session.user.email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/40 transition hover:border-white/20 hover:text-white/70"
          >
            Sign Out
          </button>
        </div>
      </motion.header>

      {/* Body: Dashboard + Chat Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 overflow-hidden"
        >
          <DashboardPanel dashboardVersion={dashboardVersion} />
        </motion.section>

        {/* Chat Sidebar */}
        <ChatSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onDashboardRefresh={handleDashboardRefresh}
        />
      </div>
    </main>
  );
}
