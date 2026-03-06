export default function ChatDemoPage() {
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

          <div className="flex-1 space-y-3 overflow-auto pr-1">
            <div className="max-w-[80%] rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              hey! ask me to list products, draft a product listing, or review
              your inventory.
            </div>
          </div>

          <form className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
            <input
              type="text"
              placeholder="message the shams-e agent..."
              className="h-11 flex-1 rounded-xl border border-white/15 bg-[#0b1220] px-4 text-sm outline-none placeholder:text-white/40 focus:border-cyan-300/60"
              disabled
            />
            <button
              type="button"
              className="h-11 rounded-xl bg-cyan-400 px-4 text-sm font-medium text-[#041018] opacity-70"
              disabled
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
