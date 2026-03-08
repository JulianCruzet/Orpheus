# <img src="https://img.shields.io/badge/-%E2%97%BC-5EEAD4?style=flat-square" alt="" height="20"/> Shams-E

**AI-Powered E-Commerce Copilot for Shopify**

Tell Shams-E what you want to sell, and it builds your store, researches your market, creates your listings, and launches your marketing — all from a single chat window.

## Features

- **Gemini AI Agent** — Powered by Gemini 2.5 Flash with function-calling across 12 tools
- **Cursor-Style Dashboard** — Split layout with live store dashboard (left) and AI chat sidebar (right)
- **Product Management** — List, create, and update Shopify products through natural language
- **Market Research** — Analyze trends, pricing bands, and competitor positioning
- **Store Analytics** — Health score, revenue tracking, conversion rates, and AI-generated insights
- **Inventory & Orders** — Monitor stock levels, view orders, manage fulfillment
- **Discounts & Collections** — Create discount codes and organize collections
- **Product Listing Generation** — AI-generated titles, descriptions, tags, SEO metadata, and pricing suggestions
- **Mock Mode** — Full demo flow with seeded data when Shopify credentials aren't available

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **AI:** Google Gemini 2.5 Flash (function-calling)
- **Auth:** Supabase Auth (email/password + magic link)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animation:** Framer Motion, Three.js (WebGL shaders), Spline (3D)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in the required keys:

```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MOCK_MODE=true
```

Set `MOCK_MODE=true` to run with seeded demo data (no Shopify credentials needed).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page, or sign in to access the dashboard at `/chat`.

### Build

```bash
npm run build
```

## Project Structure

```
src/
  app/
    page.tsx                  # Landing page (WebGL shader hero + Spline 3D)
    auth/page.tsx             # Authentication (sign in / sign up / magic link)
    chat/page.tsx             # Dashboard + AI chat sidebar
    api/chat/route.ts         # SSE streaming chat endpoint (Gemini agent loop)
    api/dashboard/route.ts    # Dashboard data endpoint
  components/
    chat/
      dashboard-panel.tsx     # Store dashboard with metrics, products, orders
      chat-sidebar.tsx        # AI chat with SSE streaming + tool activity
    ui/
      shams-e-logo.tsx        # Brand logo SVG component
      shader-animation.tsx    # WebGL ring shader
      spotlight.tsx           # SVG spotlight effect
  lib/
    ai/
      gemini-agent.ts         # Gemini function-calling orchestrator + fallback
      tool-schemas.ts         # JSON Schema definitions for all 12 tools
    tools/
      registry.ts             # Tool registry and execution engine
      mock-tools.ts           # Mock mode handlers with seeded data
      ...                     # Individual tool implementations
    db/                       # Conversation and action log persistence
    security/                 # Input redaction utilities
    supabase/                 # Supabase client configuration
```

## Architecture

1. User sends a message in the chat sidebar
2. Frontend POSTs conversation to `/api/chat`
3. API runs the Gemini agent loop:
   - Conversation history + system prompt sent to Gemini 2.5 Flash
   - Gemini decides to call a tool or respond directly
   - Tool results are fed back for continuation (up to 5 iterations)
4. API streams SSE events back: `token`, `tool_call`, `tool_result`, `done`
5. Frontend renders streamed text, tool activity pills, and refreshes dashboard on write operations
