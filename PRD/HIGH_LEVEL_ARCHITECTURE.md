# Shams-E High-Level Architecture

```mermaid
flowchart LR
  U[User]
  UI[Next.js Frontend\nLanding + Auth + Chat Workspace]
  AUTH[Supabase Auth\nSignin / Session]

  CHATAPI[/api/chat\nAgent Orchestration]
  DASHAPI[/api/dashboard\nDashboard Aggregation]

  AGENT[Gemini Agent Core\nIntent + Tool Selection]
  REG[Tool Registry]

  SHOP[Shopify Admin API]
  RESEARCH[Market Research Sources]
  IMG[Image Generation]

  DB[(SQLite + Drizzle\nConversations / Messages / Action Logs)]
  SAFE[Safety Layer\nConfirmations + Redaction + Undo]

  U --> UI
  UI --> AUTH
  UI --> CHATAPI
  UI --> DASHAPI

  CHATAPI --> AGENT --> REG
  REG --> SHOP
  REG --> RESEARCH
  REG --> IMG

  CHATAPI --> DB
  CHATAPI --> SAFE
  SAFE --> REG

  DASHAPI --> REG
  DASHAPI --> DB
```

## Summary
- Users authenticate via Supabase and interact through the chat workspace.
- `/api/chat` runs Gemini with tool orchestration for execution-heavy tasks.
- `/api/dashboard` aggregates product, order, and performance data.
- Shopify/research/image tools are mediated through a central registry.
- Safety controls guard risky actions; logs/history persist in SQLite.
