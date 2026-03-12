"use client";

import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { VoiceButton } from "@/components/chat/voice-button";

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
    {
      id: "intro",
      role: "assistant",
      content:
        "hey! i'm orpheus, your e-commerce copilot. i can manage products, research markets, analyze performance, and more. what would you like to do?",
    },
  ]);
  const [draft, setDraft] = useState("");
  const sendRef = useRef<(text: string) => void>(undefined);
  const { voiceState, toggleRecording } = useVoiceInput(
    useCallback((text: string) => {
      if (text && sendRef.current) sendRef.current(text);
    }, []),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [tools, setTools] = useState<ToolActivity[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

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
    setMessages([
      {
        id: "intro",
        role: "assistant",
        content:
          "hey! i'm orpheus, your e-commerce copilot. i can manage products, research markets, analyze performance, and more. what would you like to do?",
      },
    ]);
    setDraft("");
    setTools([]);
    setConfirmation(null);
    setConversationId(null);
    conversationRef.current = [];
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
      className="flex shrink-0 flex-col border-l border-white/[0.06]"
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
                  <div className="flex gap-3.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[9px] text-[#5EEAD4]">
                      S
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] leading-[1.65] text-white/75 prose-sm prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-white/90">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.images && msg.images.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.images.map((src, i) => (
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
                    </div>
                  </div>
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
