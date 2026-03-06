"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatBubble = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "list products with low inventory",
  "research market trends for reusable water bottles",
  "analyze competitor pricing for bluetooth speakers",
  "draft a product listing for a minimalist desk lamp",
];

export default function ChatDemoPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "hey! ask me to list products, draft a product listing, or review your inventory.",
    },
  ]);

  const canSend = draft.trim().length > 0;

  const helperText = useMemo(() => {
    if (canSend) {
      return "ready to send. this will wire into live agent flow next.";
    }

    return "pick a quick prompt or type a message to start the demo.";
  }, [canSend]);

  function handleQuickPromptClick(prompt: string): void {
    setDraft(prompt);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    const userMessage: ChatBubble = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantMessage: ChatBubble = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content:
        "demo ack: message captured. next step is rendering streamed tool events from /api/chat.",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft("");
  }

  return (
    <main className="min-h-screen bg-[#05070f] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <section className="flex min-h-[70vh] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <header className="mb-4 border-b border-white/10 pb-3">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              shams-e demo
            </p>
            <h1 className="mt-1 text-2xl font-semibold">agent chat</h1>
            <p className="mt-1 text-sm text-white/70">
              prototype surface for tool-driven commerce conversations.
            </p>
          </header>

          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPromptClick(prompt)}
                className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-400/20"
              >
                {prompt}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs text-white/50">{helperText}</p>

          <div className="flex-1 space-y-3 overflow-auto pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  message.role === "assistant"
                    ? "border border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                    : "ml-auto border border-white/20 bg-[#0b1220] text-white"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3"
          >
            <input
              type="text"
              placeholder="message the shams-e agent..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="h-11 flex-1 rounded-xl border border-white/15 bg-[#0b1220] px-4 text-sm outline-none placeholder:text-white/40 focus:border-cyan-300/60"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-cyan-400 px-4 text-sm font-medium text-[#041018] disabled:opacity-60"
              disabled={!canSend}
            >
              send
            </button>
          </form>
        </section>

        <aside className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:w-96">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
            activity panel
          </h2>
          <p className="mt-2 text-sm text-white/70">
            tool events, execution status, and action confirmations will render
            here.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>- pending tool runs</li>
            <li>- success/error outputs</li>
            <li>- structured result cards</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
