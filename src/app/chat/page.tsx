const quickPrompts = [
  "find my best-selling products from the last 30 days",
  "draft a product listing for a minimalist black tote bag",
  "compare competitor pricing for wireless charging docks",
  "show low inventory items that could stock out this week",
];

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">
            shams-e demo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            ai commerce copilot chat
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            this is the product-demo route for the live assistant flow. chat,
            tool events, and action confirmations will be rendered here as mvp
            features are wired in.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm text-slate-300">quick prompts</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="mb-3 text-sm font-medium text-slate-200">messages</p>
            <div className="h-[420px] rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
              message timeline placeholder
            </div>
            <div className="mt-4 flex items-center gap-3">
              <input
                aria-label="chat composer"
                placeholder="ask shams-e to update products, research a niche, or check inventory..."
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/70 focus:outline-none"
              />
              <button
                type="button"
                className="h-11 rounded-xl bg-cyan-400 px-4 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                send
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="mb-3 text-sm font-medium text-slate-200">activity</p>
            <div className="h-[420px] rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
              tool status + confirmations placeholder
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
