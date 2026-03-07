# Shams-E Architecture Slide (Hackathon)

## One-liner
Shams-E is an AI commerce copilot that turns natural-language requests into safe, auditable Shopify actions with real-time chat feedback.

## Architecture (single-slide version)

```mermaid
flowchart LR
  U[User in Chat UI] --> FE[Next.js /app/chat]
  FE --> API[/POST /api/chat (streaming SSE)/]
  API --> AGENT[Agent Loop
  prompt + history + tool planning]

  AGENT --> TR[Tool Registry]
  TR --> ST[Shopify Tools
  products/inventory/orders]
  TR --> AT[AI Tools
  listing + market + competitors]

  ST --> SHOP[(Shopify Admin API)]
  AT --> MODEL[(Gemini / model provider)]

  AGENT --> DB[(SQLite + Drizzle
  conversations/messages/action_log)]
  AGENT --> FE

  DB --> FE
```

## Data flow (talk track)
1. user sends a message in `/app/chat`
2. frontend posts conversation state to `/api/chat`
3. agent loop plans and executes tool calls through a typed registry
4. each tool result is normalized, logged, and streamed back to UI
5. persistence stores chat + action logs for replay, trust, and demos

## Trust and safety controls
- confirmation step for destructive/bulk actions
- transparent pre-action summaries
- redacted secrets in logs
- mock mode fallback for demo reliability

## Why this architecture scores well
- innovation: natural-language to executable commerce workflows
- technical complexity: tool-calling loop + streaming + typed registry + persistence
- functionality: live Shopify + AI research + content generation in one workflow
- presentation quality: visible action timeline with auditable states
- real-world applicability: directly usable by merchants and operators
