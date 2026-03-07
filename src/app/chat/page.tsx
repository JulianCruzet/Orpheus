"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ToolEventStatus = "pending" | "success" | "error";

type ChatBubble = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ToolEvent = {
  id: string;
  toolName: string;
  status: ToolEventStatus;
  summary: string;
  timestamp: string;
};

type RichBlockType =
  | "product_card"
  | "market_research_summary"
  | "action_confirmation";

type RichBlock = {
  id: string;
  type: RichBlockType;
  title: string;
  body: string;
  meta?: string;
};

const quickPrompts = [
  "list products with low inventory",
  "research market trends for reusable water bottles",
  "analyze competitor pricing for bluetooth speakers",
  "draft a product listing for a minimalist desk lamp",
  "confirm inventory update for sku-wb-102",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getToolEventStyle(status: ToolEventStatus): string {
  if (status === "pending") {
    return "border-amber-300/40 bg-amber-400/10 text-amber-100";
  }

  if (status === "error") {
    return "border-rose-300/40 bg-rose-400/10 text-rose-100";
  }

  return "border-emerald-300/40 bg-emerald-400/10 text-emerald-100";
}

function getRichBlockStyle(type: RichBlockType): string {
  if (type === "product_card") {
    return "border-cyan-300/40 bg-cyan-400/10 text-cyan-100";
  }

  if (type === "market_research_summary") {
    return "border-violet-300/40 bg-violet-400/10 text-violet-100";
  }

  return "border-emerald-300/40 bg-emerald-400/10 text-emerald-100";
}

function buildRichBlocks(text: string, baseId: number): RichBlock[] {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("list") || lowerText.includes("product")) {
    return [
      {
        id: `rich-product-${baseId}`,
        type: "product_card",
        title: "minimalist desk lamp",
        body: "$39.99 • inventory: 12 • status: active",
        meta: "shopify product preview",
      },
    ];
  }

  if (lowerText.includes("research") || lowerText.includes("competitor")) {
    return [
      {
        id: `rich-market-${baseId}`,
        type: "market_research_summary",
        title: "market snapshot",
        body: "avg competitor price: $34-$49 • trend: compact eco products rising",
        meta: "opportunity score: 8.2/10",
      },
    ];
  }

  if (lowerText.includes("confirm") || lowerText.includes("update")) {
    return [
      {
        id: `rich-confirm-${baseId}`,
        type: "action_confirmation",
        title: "action confirmed",
        body: "inventory updated successfully for sku-wb-102.",
        meta: "applied at checkout location toronto warehouse",
      },
    ];
  }

  return [];
}

export default function ChatDemoPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "hey! ask me to list products, draft a product listing, or review your inventory.",
    },
  ]);
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [richBlocks, setRichBlocks] = useState<RichBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const canSend = draft.trim().length > 0;

  const helperText = useMemo(() => {
    if (isProcessing) {
      return "processing request... tool states and rich blocks are updating.";
    }

    if (canSend) {
      return "ready to send. this now previews pending/success/error tool activity and rich result blocks.";
    }

    return "pick a quick prompt or type a message to start the demo.";
  }, [canSend, isProcessing]);

  function handleQuickPromptClick(prompt: string): void {
    setDraft(prompt);
  }

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const text = draft.trim();
    if (!text || isProcessing) {
      return;
    }

    const now = new Date();
    const baseId = Date.now();

    const userMessage: ChatBubble = {
      id: `user-${baseId}`,
      role: "user",
      content: text,
    };

    const pendingEvent: ToolEvent = {
      id: `tool-pending-${baseId}`,
      toolName: "agent_router",
      status: "pending",
      summary: "routing request to tool chain...",
      timestamp: formatTime(now),
    };

    const statusFromPrompt: ToolEventStatus = text.includes("error")
      ? "error"
      : "success";

    const resultEvent: ToolEvent = {
      id: `tool-result-${baseId}`,
      toolName: "agent_router",
      status: statusFromPrompt,
      summary:
        statusFromPrompt === "error"
          ? "tool run failed. showing fallback response."
          : "tool run finished. structured response ready.",
      timestamp: formatTime(new Date(now.getTime() + 1500)),
    };

    const assistantMessage: ChatBubble = {
      id: `assistant-${baseId}`,
      role: "assistant",
      content:
        statusFromPrompt === "error"
          ? "i hit a tool error in this demo run. try another prompt and i'll retry."
          : "done! tool activity is now rendering with live status states and rich result blocks.",
    };

    const nextRichBlocks =
      statusFromPrompt === "error" ? [] : buildRichBlocks(text, baseId);

    setIsProcessing(true);
    setMessages((prev) => [...prev, userMessage]);
    setEvents((prev) => [pendingEvent, ...prev].slice(0, 8));
    setDraft("");

    await new Promise((resolve) => setTimeout(resolve, 700));

    setMessages((prev) => [...prev, assistantMessage]);
    setEvents((prev) => [resultEvent, ...prev].slice(0, 8));
    setRichBlocks((prev) => [...nextRichBlocks, ...prev].slice(0, 6));
    setIsProcessing(false);
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070f] text-white">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100"
        >
          checking authentication...
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#05070f] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:flex-row">
        <section className="flex min-h-[68vh] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:min-h-[70vh] sm:p-4">
          <header className="mb-4 border-b border-white/10 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  shams-e demo
                </p>
                <h1 className="mt-1 text-2xl font-semibold">agent chat</h1>
                <p className="mt-1 text-sm text-white/70">
                  prototype surface for tool-driven commerce conversations.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-white/55">{session.user.email}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 min-h-10 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  sign out
                </button>
              </div>
            </div>
          </header>

          <div className="mb-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
              quick actions
            </p>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {quickPrompts.map((prompt) => (
                <motion.button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPromptClick(prompt)}
                  disabled={isProcessing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="min-h-10 shrink-0 snap-start rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-0 sm:py-1.5"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>

          <p className="mb-3 text-xs text-white/50">{helperText}</p>

          <div className="flex-1 space-y-3 overflow-auto pr-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">conversation</p>

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`max-w-[92%] rounded-xl px-4 py-3 text-sm sm:max-w-[80%] ${
                  message.role === "assistant"
                    ? "border border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                    : "ml-auto border border-white/20 bg-[#0b1220] text-white"
                }`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] opacity-60">
                  {message.role === "assistant" ? "assistant" : "you"}
                </p>
                <p>{message.content}</p>
              </motion.div>
            ))}

            {isProcessing ? (
              <div className="max-w-[85%] animate-pulse rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100/80 sm:max-w-[70%]">
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] opacity-60">assistant</p>
                <p>assistant is thinking...</p>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-white/10 bg-[#05070f]/85 pt-3 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:bg-transparent sm:pb-0"
          >
            <input
              type="text"
              placeholder="message the shams-e agent..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isProcessing}
              className="h-12 flex-1 rounded-xl border border-white/15 bg-[#0b1220] px-4 text-sm outline-none placeholder:text-white/40 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-cyan-400 px-4 text-sm font-medium text-[#041018] disabled:opacity-60 sm:h-11"
              disabled={!canSend || isProcessing}
            >
              {isProcessing ? "sending..." : "send"}
            </button>
          </form>
        </section>

        <aside className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 lg:w-96">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            activity panel
          </h2>
          <p className="mt-2 text-sm text-white/70">
            assistant/tool execution states and rich blocks render below.
          </p>

          <div className="mt-4 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-white/50">
                no tool events yet. send a prompt to see pending/success/error.
              </p>
            ) : (
              events.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl border px-3 py-2 text-sm ${getToolEventStyle(
                    item.status,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] opacity-80">
                      {item.toolName}
                    </span>
                    <span className="rounded-full border border-current/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{item.summary}</p>
                  <p className="mt-1 text-[11px] opacity-70">updated {item.timestamp}</p>
                </motion.div>
              ))
            )}

            {isProcessing ? (
              <div className="animate-pulse rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs uppercase tracking-[0.12em] text-amber-100">
                syncing tool states...
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
            <h3 className="text-xs uppercase tracking-[0.14em] text-white/60">
              rich result blocks
            </h3>
            {richBlocks.length === 0 ? (
              <p className="text-sm text-white/50">
                no rich blocks yet. try prompts about products, research, or confirmation.
              </p>
            ) : (
              richBlocks.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`rounded-xl border px-3 py-2 ${getRichBlockStyle(
                    block.type,
                  )}`}
                >
                  <p className="text-xs uppercase tracking-[0.12em] opacity-80">
                    {block.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-medium">{block.title}</p>
                  <p className="mt-1 text-sm">{block.body}</p>
                  {block.meta ? (
                    <p className="mt-1 text-xs opacity-75">{block.meta}</p>
                  ) : null}
                </motion.div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
