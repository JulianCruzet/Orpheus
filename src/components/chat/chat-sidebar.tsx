"use client";

import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useSpeech } from "@/hooks/use-speech";
import { VoiceButton } from "@/components/chat/voice-button";

function extractImageUrls(text: string): { cleaned: string; images: string[] } {
  const imageUrlPattern = /(https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?|https?:\/\/images\.printify\.com\/[^\s)]+|\/api\/images\/[^\s)]+)/gi;
  const images: string[] = [];
  const cleaned = text.replace(imageUrlPattern, (match) => {
    images.push(match);
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleaned, images };
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        src={src}
        alt="preview"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-xl border border-white/10 object-contain shadow-2xl"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/60 transition hover:bg-white/20 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  );
}

type ChatBubble = {
  id: string;
  role: "assistant" | "user";
  content: string;
  images?: string[];
};

type ToolActivity = {
  id: string;
  toolName: string;
  status: "running" | "done" | "error";
  summary?: string;
};

type ConfirmationState = {
  toolName: string;
  message: string;
} | null;

type ConversationSummary = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
};

const INTRO_MESSAGE =
  "hey! i'm orpheus, your e-commerce copilot. i can manage products, research markets, analyze performance, and more. what would you like to do?";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString();
}

const quickPrompts = [
  { label: "Show Products", prompt: "list my products" },
  { label: "Market Research", prompt: "research market trends for reusable water bottles" },
  { label: "Draft Listing", prompt: "create a product listing for a minimalist desk lamp" },
  { label: "Store Health", prompt: "analyze my store performance" },
  { label: "Recent Orders", prompt: "show my recent orders" },
];

const WRITE_TOOLS = new Set([
  "shopify_create_product",
  "shopify_update_product",
  "shopify_manage_inventory",
  "shopify_discounts_collections",
]);

export function ChatSidebar({
  collapsed,
  onToggle,
  onDashboardRefresh,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onDashboardRefresh: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([
    { id: "intro", role: "assistant", content: INTRO_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const sendRef = useRef<(text: string) => void>(undefined);
  const { voiceState, toggleRecording } = useVoiceInput(
    useCallback((text: string) => {
      if (text && sendRef.current) sendRef.current(text);
    }, []),
  );
  const {
    speakingId,
    toggle: toggleSpeech,
    voices,
    selectedVoiceName,
    setVoice,
    autoVoiceName,
  } = useSpeech();
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tools, setTools] = useState<ToolActivity[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const conversationRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tools, isStreaming]);

  const sendToApi = useCallback(
    async (userText: string) => {
      conversationRef.current.push({ role: "user", content: userText });

      setIsStreaming(true);
      let streamedText = "";
      let assistantId = `assistant-${Date.now()}`;
      let hadWriteTool = false;
      let receivedConvId = conversationId;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationId ?? undefined,
            messages: conversationRef.current.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
              continue;
            }

            if (line.startsWith("data: ")) {
              const raw = line.slice(6);
              let payload: Record<string, unknown>;
              try {
                payload = JSON.parse(raw);
              } catch {
                continue;
              }

              switch (currentEvent) {
                case "start": {
                  if (payload.conversationId) {
                    receivedConvId = payload.conversationId as string;
                    setConversationId(receivedConvId);
                  }
                  break;
                }

                case "token": {
                  const text = (payload.text as string) ?? "";
                  streamedText += text;
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === assistantId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: streamedText }
                          : m,
                      );
                    }
                    return [
                      ...prev,
                      { id: assistantId, role: "assistant", content: streamedText },
                    ];
                  });
                  break;
                }

                case "tool_call": {
                  const toolName = (payload.toolName as string) ?? "unknown";
                  const toolId = `tool-${Date.now()}-${toolName}`;
                  setTools((prev) => [
                    ...prev,
                    { id: toolId, toolName, status: "running" },
                  ]);
                  break;
                }

                case "tool_result": {
                  const result = payload.result as Record<string, unknown> | undefined;
                  const toolName = (result?.toolName as string) ?? "";
                  const status = (result?.status as string) === "error" ? "error" : "done";

                  if (WRITE_TOOLS.has(toolName) && status === "done") {
                    hadWriteTool = true;
                  }

                  // Inject image bubbles for image tools
                  if (status === "done") {
                    const data = result?.data as Record<string, unknown> | undefined;
                    if (toolName === "printify_generate_mockups" && Array.isArray(data?.mockupUrls)) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `mockups-${Date.now()}`,
                          role: "assistant",
                          content: `here are your mockups:`,
                          images: data.mockupUrls as string[],
                        },
                      ]);
                    } else if (toolName === "generate_product_image" && typeof data?.imageUrl === "string") {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `img-${Date.now()}`,
                          role: "assistant",
                          content: `generated artwork:`,
                          images: [data.imageUrl as string],
                        },
                      ]);
                    }
                  }

                  setTools((prev) => {
                    const idx = prev.findIndex(
                      (t) => t.toolName === toolName && t.status === "running",
                    );
                    if (idx === -1) return prev;
                    const updated = [...prev];
                    updated[idx] = {
                      ...updated[idx],
                      status: status as "done" | "error",
                      summary: (result?.message as string) ?? undefined,
                    };
                    return updated;
                  });
                  break;
                }

                case "confirmation_required": {
                  setConfirmation({
                    toolName: (payload.toolName as string) ?? "",
                    message: (payload.message as string) ?? "",
                  });
                  break;
                }

                case "assistant_thought": {
                  // Show thought as a brief tool activity
                  break;
                }

                case "error": {
                  const errMsg =
                    (payload.message as string) ??
                    "something went wrong. please try again.";
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `error-${Date.now()}`,
                      role: "assistant",
                      content: errMsg,
                    },
                  ]);
                  break;
                }

                case "done": {
                  const writtenTools = payload.writtenTools as string[] | undefined;
                  if (writtenTools && writtenTools.length > 0) {
                    hadWriteTool = true;
                  }
                  break;
                }
              }

              currentEvent = "";
            }
          }
        }

        // Persist assistant message in conversation ref
        if (streamedText) {
          conversationRef.current.push({
            role: "assistant",
            content: streamedText,
          });
        }

        if (hadWriteTool) {
          onDashboardRefresh();
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "connection failed. please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, onDashboardRefresh],
  );

  // Wire voice auto-submit to the same flow as handleQuickPrompt
  sendRef.current = (text: string) => {
    if (!text.trim() || isStreaming) return;
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);
    setTools([]);
    sendToApi(text);
  };

  function handleNewChat() {
    setMessages([{ id: "intro", role: "assistant", content: INTRO_MESSAGE }]);
    setDraft("");
    setTools([]);
    setConfirmation(null);
    setConversationId(null);
    setShowHistory(false);
    conversationRef.current = [];
  }

  const fetchConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      }
    } catch {
      // Leave the list empty if it can't load.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  function openHistory() {
    setShowHistory(true);
    fetchConversations();
  }

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) return;

      const data = await res.json();
      const persisted: { role: string; content: string }[] = Array.isArray(data.messages)
        ? data.messages
        : [];

      // Keep the full raw history so the model can continue the conversation.
      conversationRef.current = persisted.map((m) => ({ role: m.role, content: m.content }));

      // Build clean display bubbles — drop internal tool_call / tool messages.
      const bubbles: ChatBubble[] = [];
      persisted.forEach((m, i) => {
        if (m.role === "user") {
          bubbles.push({ id: `loaded-${i}`, role: "user", content: m.content });
        } else if (
          m.role === "assistant" &&
          !m.content.startsWith("tool_call:") &&
          !m.content.startsWith("confirmation_required:")
        ) {
          bubbles.push({ id: `loaded-${i}`, role: "assistant", content: m.content });
        }
      });

      setMessages(
        bubbles.length > 0
          ? bubbles
          : [{ id: "intro", role: "assistant", content: INTRO_MESSAGE }],
      );
      setConversationId(id);
      setTools([]);
      setConfirmation(null);
      setShowHistory(false);
    } catch {
      // Ignore load failures — the user can pick another conversation.
    }
  }

  async function deleteConversationItem(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch {
      fetchConversations();
    }
    // If the open conversation was deleted, reset to a fresh chat.
    if (id === conversationId) handleNewChat();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isStreaming) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);
    setDraft("");
    setTools([]);
    sendToApi(text);
  }

  function handleQuickPrompt(prompt: string) {
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: prompt },
    ]);
    setTools([]);
    sendToApi(prompt);
  }

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        type="button"
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#5EEAD4] text-[#050505] shadow-lg shadow-[#5EEAD4]/20 transition-transform hover:scale-105"
        title="Open chat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    );
  }

  return (
    <>
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: "400px", minWidth: "400px", maxWidth: "400px" }}
      className="relative flex shrink-0 flex-col border-l border-white/[0.06]"
    >
      {/* Sidebar header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/30"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          AI Chat
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowVoiceMenu((v) => !v)}
            className={`rounded-md p-1.5 transition hover:bg-white/[0.06] ${
              showVoiceMenu ? "text-[#5EEAD4]" : "text-white/30 hover:text-white/60"
            }`}
            title="Read-aloud voice"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={openHistory}
            className="rounded-md p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            title="Conversation history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-md p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            title="New chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            title="Collapse chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Read-aloud voice picker */}
      {showVoiceMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowVoiceMenu(false)}
          />
          <div
            className="absolute right-3 top-12 z-40 w-64 overflow-hidden rounded-lg border border-white/10 shadow-xl"
            style={{ backgroundColor: "#0c0c0c" }}
          >
            <div
              className="border-b border-white/[0.06] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Read-aloud voice
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  setVoice(null);
                  setShowVoiceMenu(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-white/[0.05] ${
                  selectedVoiceName === null ? "text-[#5EEAD4]" : "text-white/70"
                }`}
              >
                <span className="truncate">
                  {autoVoiceName ? `Automatic (${autoVoiceName})` : "Automatic (best)"}
                </span>
                {selectedVoiceName === null && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              {voices
                .filter(
                  (v) => v.name !== autoVoiceName || v.name === selectedVoiceName,
                )
                .map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => {
                    setVoice(v.name);
                    setShowVoiceMenu(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-white/[0.05] ${
                    selectedVoiceName === v.name ? "text-[#5EEAD4]" : "text-white/70"
                  }`}
                >
                  <span className="truncate">{v.name}</span>
                  {selectedVoiceName === v.name && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
              {voices.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-white/30">loading voices…</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Conversation history panel */}
      {showHistory && (
        <div className="absolute inset-x-0 bottom-0 top-12 z-20 flex flex-col bg-[#050505]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Conversations
            </span>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="rounded-md p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
              title="Close history"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {historyLoading ? (
              <p className="px-3 py-4 text-[12px] text-white/30">loading…</p>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-white/30">no saved conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition hover:bg-white/[0.04] ${
                    c.id === conversationId ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-white/80">{c.title}</p>
                    <p className="text-[11px] text-white/30">
                      {relativeTime(c.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversationItem(c.id);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-white/20 opacity-0 transition hover:bg-white/[0.06] hover:text-white/60 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`py-2 ${msg.role === "user" ? "flex justify-end" : ""}`}
              >
                {msg.role === "assistant" ? (
                  (() => {
                    const { cleaned, images: extractedImages } = extractImageUrls(msg.content);
                    const allImages = [...(msg.images ?? []), ...extractedImages];
                    return (
                  <div className="flex gap-3.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[9px] text-[#5EEAD4]">
                      S
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] leading-[1.65] text-white/75 prose-sm prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-white/90">
                        <ReactMarkdown components={{
                          img: ({ src, alt }) => (typeof src === 'string') ? (
                            <img src={src} alt={alt ?? ''} onClick={() => setPreviewSrc(src)}
                              className="cursor-zoom-in rounded-lg border border-white/10 object-cover transition hover:border-white/30"
                              style={{ width: '100%', maxWidth: '280px' }} />
                          ) : null,
                          a: ({ href, children }) => {
                            if (href && /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(href)) {
                              return <img src={href} alt={String(children)} onClick={() => setPreviewSrc(href)}
                                className="cursor-zoom-in rounded-lg border border-white/10 object-cover transition hover:border-white/30"
                                style={{ width: '100%', maxWidth: '280px' }} />;
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#5EEAD4] underline">{children}</a>;
                          }
                        }}>{cleaned}</ReactMarkdown>
                      </div>
                      {allImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {allImages.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`mockup ${i + 1}`}
                              onClick={() => setPreviewSrc(src)}
                              className="cursor-zoom-in rounded-lg border border-white/10 object-cover transition hover:border-white/30"
                              style={{ width: "100%", maxWidth: "280px" }}
                            />
                          ))}
                        </div>
                      )}
                      {cleaned.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleSpeech(msg.id, cleaned)}
                          className={`mt-1.5 flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/[0.06] ${
                            speakingId === msg.id
                              ? "text-[#5EEAD4]"
                              : "text-white/25 hover:text-white/60"
                          }`}
                          title={speakingId === msg.id ? "Stop" : "Read aloud"}
                        >
                          {speakingId === msg.id ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                    );
                  })()
                ) : (
                  <div className="max-w-[85%] rounded-xl bg-white/[0.06] px-3 py-2">
                    <p className="text-[13px] leading-[1.65] text-white/85">
                      {msg.content}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Tool activity pills */}
          <AnimatePresence>
            {tools.map((tool) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-1"
              >
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      tool.status === "running"
                        ? "bg-amber-400 animate-pulse"
                        : tool.status === "error"
                          ? "bg-rose-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className="text-[10px] tracking-[0.06em] text-white/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {tool.toolName}
                  </span>
                  {tool.status === "running" && (
                    <div className="ml-auto h-3 w-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                  )}
                  {tool.status !== "running" && (
                    <span className="ml-auto text-[10px] text-white/25">
                      {tool.status === "done" ? "done" : "failed"}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming indicator */}
          {isStreaming && tools.every((t) => t.status !== "running") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3.5 py-2"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[9px] text-[#5EEAD4]">
                S
              </div>
              <div className="flex items-center gap-1 pt-0.5">
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  className="block h-1 w-1 rounded-full bg-[#5EEAD4]/50"
                />
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  className="block h-1 w-1 rounded-full bg-[#5EEAD4]/50"
                />
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  className="block h-1 w-1 rounded-full bg-[#5EEAD4]/50"
                />
              </div>
            </motion.div>
          )}

          {/* Confirmation dialog */}
          {confirmation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3"
            >
              <p className="text-[12px] font-medium text-amber-200/80">
                Confirmation Required
              </p>
              <p className="mt-1 text-[11px] text-amber-200/50">
                {confirmation.message}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toolName = confirmation.toolName;
                    setConfirmation(null);
                    setMessages((prev) => [
                      ...prev,
                      { id: `user-${Date.now()}`, role: "user", content: "confirmed, go ahead." },
                    ]);
                    sendToApi(`confirm ${toolName}`);
                  }}
                  className="rounded-md bg-amber-400/20 px-3 py-1 text-[11px] font-medium text-amber-200 transition hover:bg-amber-400/30"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  className="rounded-md border border-white/10 px-3 py-1 text-[11px] text-white/50 transition hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom input */}
      <div style={{ paddingBottom: "12px" }} className="shrink-0 border-t border-white/[0.06] px-4 pt-3">
        {/* Quick prompts (when conversation is fresh) */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex flex-wrap gap-1.5"
          >
            {quickPrompts.map(({ label, prompt }) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isStreaming}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/40 transition hover:border-[#5EEAD4]/25 hover:text-[#5EEAD4]/70 disabled:pointer-events-none disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            placeholder="Ask Orpheus..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isStreaming}
            style={{ paddingLeft: "16px" }}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pr-24 text-[13px] outline-none transition placeholder:text-white/20 focus:border-[#5EEAD4]/30 disabled:opacity-50"
          />
          <VoiceButton
            state={voiceState}
            onClick={toggleRecording}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isStreaming}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-[#5EEAD4] px-3 py-1 text-[12px] font-medium text-[#050505] transition hover:bg-[#7df0de] disabled:opacity-0"
          >
            Send
          </button>
        </form>
      </div>
    </motion.aside>

    <AnimatePresence>
      {previewSrc && (
        <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
      )}
    </AnimatePresence>
    </>
  );
}
