# Shams-E Demo Narrative (Judging-Aligned)

last updated: 2026-03-06
owner: julian + ali (+ faye support)

## Demo Goal (3-5 minutes)
Show that Shams-E is an AI commerce operator that can reason, act through tools, and produce business outcomes faster than manual workflows.

## Scoring Alignment

### 1) Innovation
- Position Shams-E as an "AI teammate" instead of a single-purpose bot.
- Highlight the agent loop: reasoning + tool use + visible action trace.
- Differentiate from normal dashboards by showing natural-language operations across multiple store tasks.

### 2) Technical Complexity
- Explain architecture quickly:
  - Next.js app + chat UI
  - `/api/chat` orchestration layer
  - Tool registry + typed execution contracts
  - Shopify + AI tool integrations
  - persistence for conversations and action logs
- Mention safety controls: confirmations for destructive actions and structured audit trails.

### 3) Functionality
- Run one end-to-end scenario live:
  1. Ask Shams-E to research a product niche.
  2. Generate listing copy and pricing recommendation.
  3. Publish/update product and verify in tool results.
  4. Check inventory/orders summary.
- Show fallback reliability (`MOCK_MODE`) if external APIs fail.

### 4) Presentation Quality
- Keep one clean narrative arc: "from idea to live store action."
- Use concise overlays:
  - user intent
  - tool selected
  - result returned
  - business impact
- Timebox each segment to avoid over-explaining internals.

### 5) Real-World Applicability
- Frame immediate value for small merchants:
  - faster product launch cycles
  - better pricing and market context
  - fewer manual admin steps
- Reinforce trust angle: transparent action summaries and logs.

## Suggested 4-Minute Script
- 0:00-0:30: Problem statement (manual e-commerce ops are fragmented and slow).
- 0:30-1:00: What Shams-E is (AI commerce operator with tool execution).
- 1:00-3:00: Live walkthrough (research -> listing -> publish/update -> verify).
- 3:00-3:40: Reliability + safety (mock mode, confirmations, logs).
- 3:40-4:00: Impact + close.

## Demo Operator Checklist
- Confirm environment keys are loaded.
- Keep a seeded fallback product for fast success path.
- Keep one cached market response available.
- Keep mock mode toggle ready before presenting.
- Pre-open the chat route and reset conversation state.

## Backup Talking Points (if a live call fails)
- "The same flow is available in mock mode with deterministic outputs."
- "We can still demonstrate decision quality and execution trace transparently."
- "Production connectors are isolated behind typed tool handlers for reliability."
