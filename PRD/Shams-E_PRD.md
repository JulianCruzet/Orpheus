# SHAMS-E — Cursor for E-Commerce

**Product Requirements Document**
v1.0 • March 4, 2026 • Hackathon Build
Deadline: March 10, 2026 • Team: 2–3 people

---

## 1. Executive Summary

Shams-E is an AI-powered e-commerce agent that acts as a co-pilot for Shopify store owners and aspiring entrepreneurs. Think of it as Cursor, but instead of helping you write code, it helps you build, run, and grow an online store.

The agent provides a conversational chat interface backed by a rich toolkit of integrated capabilities: direct Shopify store management, market research, AI-generated product listings and mockups, marketing campaign creation, and more. It bridges the gap between having a business idea and running a profitable store by eliminating the steep learning curve that kills most e-commerce ventures before they start.

**One-liner:** *"Tell Shams-E what you want to sell, and it builds your store, researches your market, creates your listings, and launches your marketing — all from a single chat window."*

---

## 2. Problem Statement

### 2.1 The E-Commerce Barrier

Launching an e-commerce business requires expertise across dozens of domains: product sourcing, SEO, pricing strategy, marketing, inventory management, customer support, legal compliance, and more. Most aspiring entrepreneurs cannot afford specialists in each area, and existing tools address individual pain points without tying them together.

### 2.2 Key Pain Points

- **Store setup complexity:** choosing themes, configuring settings, creating optimized product listings, and setting up payments/shipping takes days of manual work.
- **Scattered market research:** entrepreneurs juggle Google Trends, competitor sites, Amazon, and social media across dozens of tabs to validate one idea.
- **Content creation bottleneck:** writing product descriptions, generating mockups, creating ad copy, and designing banners requires skills most founders lack.
- **Operational overhead:** inventory tracking, pricing, order management, and customer inquiries consume time that should go toward growth.
- **Data paralysis:** analytics dashboards provide numbers but not answers. Owners struggle to translate metrics into actions.

### 2.3 Target Users

1. First-time entrepreneurs with a product idea but no e-commerce experience.
2. Existing solo Shopify store owners looking to scale without hiring.
3. Side-hustle creators who need to move fast and cannot spend weeks learning each tool.

---

## 3. Product Vision & Principles

Shams-E is the AI co-founder every e-commerce entrepreneur deserves. It should feel like having a seasoned e-commerce operator next to you — one who can not only advise but actually execute actions on your store in real time.

### 3.1 Core Principles

- **Action-first:** the agent executes, not just suggests. "Add a product" results in a real Shopify listing.
- **Opinionated defaults, flexible overrides:** best practices baked in (SEO titles, competitive pricing, high-converting copy), but the user always has final say.
- **Transparent and reversible:** every action is logged with a readable explanation. Users can review, undo, or modify any change.
- **Progressive complexity:** beginners get guided workflows; power users get direct commands and batch operations.
- **Speed over perfection:** this is a hackathon. Ship a compelling working demo — not a production SaaS. Polish comes later.

---

## 4. Recommended Tech Stack

Optimized for a 2–3 person team building in 6 days. Every choice prioritizes speed-to-demo, ecosystem support, and minimal boilerplate.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | Next.js 14 + Tailwind + shadcn/ui | Full-stack React framework, fast iteration, polished UI primitives out of the box. |
| **Backend / API** | Next.js API Routes (TypeScript) | Co-located with frontend. No separate server. TypeScript gives type safety with Shopify SDK. |
| **Agent / LLM** | Claude API (claude-sonnet-4-5) with tool-use | Best-in-class tool calling, long context for store data, fast real-time chat. |
| **Tool Layer** | Claude native tool-use (function calling) | No framework overhead. Define tools as JSON schemas, Claude calls them. Simple and debuggable. |
| **E-Commerce API** | Shopify Admin API via @shopify/shopify-api | Official SDK, great TypeScript support, free dev store available instantly. |
| **Database** | SQLite (Drizzle ORM) or Supabase | SQLite for zero-config local dev; Supabase if you want auth/realtime later. |
| **Image Generation** | DALL-E 3 API or Stability AI | Product mockups, lifestyle photos, logos. DALL-E 3 is easiest; Stability gives more control. |
| **Web Scraping** | Firecrawl or Bright Data | Market research — competitor pricing, trending products. Firecrawl has a generous free tier. |
| **Deployment** | Vercel | One-click deploy from GitHub, automatic previews, perfect for Next.js. |

### 4.1 Why Claude Tool-Use Over LangChain/MCP

For a 6-day hackathon, framework overhead is the enemy. Claude's native tool-use lets you define tools as simple JSON schemas and handler functions — no agents, chains, or graph configs to debug. The pattern:

1. Define each tool as a JSON schema (name, description, input parameters).
2. Send tool definitions + user message to the Claude API.
3. Claude returns a `tool_use` block with tool name and arguments.
4. Your backend executes the tool (e.g., calls Shopify API) and returns the result.
5. Claude incorporates the result and responds to the user.

Simple, debuggable, zero framework abstractions. If you want MCP later, the tool schemas migrate easily.

---

## 5. Agent Architecture

Shams-E follows a tool-augmented conversational agent pattern. The LLM acts as the reasoning core: it receives user messages, plans multi-step workflows, dispatches tool calls, and synthesizes results into responses with actionable next steps.

### 5.1 Core Components

- **Chat Interface:** React conversational UI with rich rendering (markdown, tables, images, action confirmations, tool status indicators).
- **Agent Core:** Claude API integration with system prompt, tool definitions, conversation memory, and multi-turn orchestration.
- **Tool Registry:** typed tool definitions (JSON schemas) and handler functions. Each tool has name, description, parameter schema, and execute function.
- **Shopify Connector:** authenticated client wrapping the Shopify Admin API. Handles OAuth, token storage, all store CRUD.
- **Action Logger:** records every tool invocation with inputs, outputs, timestamps. Powers activity feed and undo.
- **Research Engine:** web scraping and search for competitor analysis, trending products, and market validation.

### 5.2 Agent Loop (ReAct Pattern)

1. User sends a message (or system triggers an event).
2. Claude analyzes the message, conversation history, and store context to form a plan.
3. Claude emits `tool_use` calls (search_products, create_product, research_competitors, etc.).
4. Backend executes each tool call and returns `tool_result` messages.
5. Claude synthesizes results into a response with next-step suggestions.
6. Loop repeats if the user continues or Claude needs more actions.

### 5.3 System Prompt Strategy

The system prompt should include: agent persona and capabilities, current store context (name, product count, recent orders summary), available tools with usage guidelines, guardrails (confirm destructive actions, never delete without approval), and output formatting instructions (markdown, action buttons, product cards).

---

## 6. Tool Catalog

Full catalog of agent tools. **P0** = required for demo, **P1** = high value if time allows, **P2** = stretch goals.

### 6.1 P0 — Must Have (Demo Critical)

| Tool | Description & Key Operations |
|------|------------------------------|
| **shopify_create_product** | Create a new product on the connected Shopify store. Accepts title, description, price, images, tags, variants, and inventory quantity. Auto-generates SEO metadata if not provided. |
| **shopify_update_product** | Modify an existing product's fields: price, description, images, inventory, tags, status (draft/active). Supports partial updates. |
| **shopify_list_products** | Retrieve products with filtering (status, collection, price range, tag) and pagination. Returns summary data for agent reasoning. |
| **shopify_manage_orders** | List recent orders, view details, update fulfillment status. Gives the agent visibility into sales activity. |
| **shopify_manage_inventory** | Check stock levels, update quantities, set low-stock thresholds. Enables monitoring and alerts. |
| **generate_product_listing** | Given a product idea (name, image, or concept), generate an optimized title, description, tags, SEO metadata, and pricing suggestion using Claude. |
| **research_market** | Given a product category or niche, scrape competitor stores, Google Trends, and Amazon to return market size, competitor pricing, trending keywords, and opportunity assessment. |
| **research_competitors** | Given a competitor URL or store name, analyze their catalog, pricing, bestsellers, and marketing approach. Returns structured competitive intelligence. |

### 6.2 P1 — High Value (Build If Time Allows)

| Tool | Description & Key Operations |
|------|------------------------------|
| **generate_product_image** | Generate AI product photos, lifestyle mockups, or marketing banners using DALL-E 3 / Stability AI. |
| **generate_marketing_copy** | Create email campaigns, Instagram captions, Twitter threads, Facebook/Google ad copy, and promo calendars. |
| **suggest_pricing** | Analyze competitor pricing, margins, and demand signals to recommend optimal pricing strategies. |
| **shopify_manage_collections** | Create, update, organize product collections. Auto-categorize with smart collections. |
| **shopify_manage_discounts** | Create discount codes, automatic discounts, and promotional campaigns. |
| **generate_store_theme** | Suggest theme configs, color palettes, layout recommendations. Generate CSS customizations. |

### 6.3 P2 — Stretch Goals

| Tool | Description & Key Operations |
|------|------------------------------|
| **analyze_store_performance** | Aggregate sales, traffic, conversion data into AI-generated insights and recommended actions. |
| **draft_customer_response** | Draft professional responses to customer inquiries. Handle returns/refund logic with policy awareness. |
| **generate_legal_docs** | Generate privacy policy, terms of service, and refund policy tailored to the store. |
| **optimize_seo** | Audit listings for SEO issues. Suggest title/meta/alt-text improvements and blog content ideas. |

---

## 7. Key User Flows (Demo Scenarios)

Primary demo scenarios. The hackathon presentation should walk through at least Flow 1 end-to-end.

### 7.1 Flow 1: Zero-to-Store (Hero Demo)

*User has an idea but no store. Shams-E takes them from concept to live products.*

- User: "I want to sell handmade ceramic mugs. Help me get started."
- Agent calls `research_market` — returns market size, competitor count, average pricing, trending styles.
- Agent summarizes: "Handmade ceramics market growing 12% YoY. Average mug price $28–$45. I recommend premium artisan positioning. Want me to create your first listings?"
- User confirms. Agent calls `generate_product_listing` 3x to create optimized listings for different mug styles.
- Agent calls `shopify_create_product` for each — complete with descriptions, tags, pricing.
- Agent: "Your 3 products are live! Next: competitor deep-dive, product mockup images, or a launch discount?"

### 7.2 Flow 2: Market Intelligence

*Store owner exploring a new category.*

- User: "My candle store is doing well. Should I add wax melts? What are competitors charging?"
- Agent calls `research_market` + `research_competitors` on 2–3 top wax melt stores.
- Returns competitive landscape: pricing tiers, bestselling scents, marketing approaches, and a recommendation.

### 7.3 Flow 3: Inventory & Operations

*Day-to-day store management.*

- User: "Which products are running low? Show me last week's orders."
- Agent calls `shopify_manage_inventory` + `shopify_manage_orders`.
- Agent: "3 products below restock threshold. 47 orders last week, $2,140 total. Top seller: Midnight Blue Mug (18 units). Want me to update stock or set a restock reminder?"

### 7.4 Flow 4: Marketing Launch

*Promoting a new collection.*

- User: "I just added a spring collection. Help me promote it."
- Agent calls `generate_marketing_copy` (email + 3 Instagram captions + Facebook ad) and `shopify_manage_discounts` ("SPRING15" code).
- Presents all assets in one response with copy-ready text and the active discount.

---

## 8. UI/UX Requirements

### 8.1 Chat Interface

- Text messages with full markdown rendering (bold, links, code, tables).
- Tool call status: spinner during execution, collapsible result panel, tool name badge.
- Product cards: inline card with image, title, price, status badge, "View on Shopify" link.
- Confirmation modals before destructive actions (delete, bulk price change).
- Inline image previews for generated mockups and product photos.

### 8.2 Sidebar

- Store connection status indicator.
- Quick stats: total products, orders today, revenue this week.
- Activity log: chronological feed of all agent actions.
- Suggested prompts: contextual quick-actions ("Add a product", "Check inventory", "Research competitors").

### 8.3 Design Direction

Clean, modern UI with dark mode option. Inspiration: Cursor's chat, Vercel's dashboard, Linear's polish. Use shadcn/ui for speed and consistency. Brand color: purple (#7C3AED).

---

## 9. Shopify Dev Store Setup

Day 1 setup checklist (30–45 minutes total):

1. Create a Shopify Partner account at partners.shopify.com (free).
2. Create a Development Store from the Partner dashboard (free, no trial limits).
3. Create a Custom App under Settings > Apps > Develop apps.
4. Configure API scopes: read/write products, orders, inventory, customers, discounts, themes, content.
5. Generate Admin API access token, store in `.env`.
6. Seed with 5–10 sample products (use the agent itself once `create_product` works!).
7. Install `@shopify/shopify-api` and verify with a product list call.

---

## 10. Six-Day Build Plan

Realistic schedule for a 2–3 person team, roughly 8–10 hours/day of focused work.

| Day | Date | Goals & Deliverables |
|-----|------|----------------------|
| **Day 1** | Mar 4 | Project setup: Next.js app, Tailwind + shadcn/ui, Shopify Partner + dev store, env config. Basic chat UI with hardcoded responses. Shopify client with product list working. |
| **Day 2** | Mar 5 | Agent core: Claude API + tool-use loop. Implement P0 Shopify tools (create, update, list products; orders; inventory). Chat renders tool status. |
| **Day 3** | Mar 6 | AI tools: `generate_product_listing` (Claude copywriting), `research_market` + `research_competitors` (web scraping). End-to-end Flow 1 working. |
| **Day 4** | Mar 7 | P1 tools: image gen, marketing copy, pricing, collections, discounts. Sidebar with stats + activity log. Rich messages (product cards, images). |
| **Day 5** | Mar 8 | Polish: error handling, loading states, confirmations, responsive design, edge cases. Seed demo store with compelling data. Test all 4 flows. |
| **Day 6** | Mar 9 | Demo prep: record backup video, write presentation script, deploy to Vercel, final bug fixes. Rehearse 3+ times. Submit March 10. |

### 10.1 Work Division

**Person A (Frontend + UX):** Chat interface, sidebar, rich message components, product cards, loading/error states, responsive design, Vercel deployment.

**Person B (Agent + Tools):** Claude API integration, tool definitions + handlers, Shopify API client, all tool implementations, system prompt engineering.

**Person C (Research + Polish):** Market research engine (web scraping), image gen integration, demo data seeding, presentation prep, QA. If only 2 people, split between A and B.

---

## 11. Technical Specifications

### 11.1 Tool Definition Format

Each tool follows the Claude tool-use JSON schema format:

```json
{
  "name": "shopify_create_product",
  "description": "Create a new product on the connected Shopify store...",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "price": { "type": "number" },
      "tags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["title", "price"]
  }
}
```

### 11.2 API Route Structure

- `/api/chat` — Main agent endpoint. Streams Claude responses with tool calls.
- `/api/shopify/[action]` — Shopify proxy routes (products, orders, inventory, collections, discounts).
- `/api/research/[type]` — Market research endpoints.
- `/api/generate/[type]` — AI generation endpoints (listings, copy, images).

### 11.3 Environment Variables

```env
ANTHROPIC_API_KEY=       # Claude API key
SHOPIFY_STORE_URL=       # Dev store URL (your-store.myshopify.com)
SHOPIFY_ACCESS_TOKEN=    # Admin API token from custom app
OPENAI_API_KEY=          # For DALL-E 3 image generation (P1)
FIRECRAWL_API_KEY=       # For web scraping in market research
```

### 11.4 Data Models (Minimal)

- **conversations:** id, created_at, title (auto-generated).
- **messages:** id, conversation_id, role, content, tool_calls (JSON), created_at.
- **action_log:** id, conversation_id, tool_name, input, output, status, created_at.

---

## 12. Success Criteria

1. Hero demo (Flow 1: Zero-to-Store) works end-to-end live — idea to real Shopify listings from one conversation.
2. At least 6 P0 tools functional and integrated into the agent loop.
3. UI feels polished: tool status visible, product cards render, chat is responsive.
4. Agent handles multi-step workflows (research → generate → create) without manual intervention.
5. 3-minute backup demo video exists in case of live issues.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Shopify API rate limits** | Tools fail mid-demo | Use GraphQL bulk ops. Cache locally. Keep demo store small. |
| **Claude tool-calling errors** | Agent hallucinates tools or bad args | Strict input validation. Fallback errors. Test edge cases Day 5. |
| **Web scraping blocks** | Research tool returns empty | Use Firecrawl. Cache fallback data. Pre-scrape competitors. |
| **Scope creep** | Too many tools, nothing works | P0 only Days 1–3. P1 on Day 4 only if P0 solid. Cut P2. |
| **Live demo failure** | Internet/API down during presentation | Record backup video Day 6. Local mock mode with cached responses. |
| **Image gen latency** | 10–15s DALL-E pause in demo | Async generation with placeholder. Or pre-generate demo images. |

---

## 14. Future Vision (Post-Hackathon)

- **Multi-platform:** extend to WooCommerce, Etsy, Amazon Seller Central, Square Online.
- **MCP integration:** migrate tools to Model Context Protocol for standardized, shareable definitions.
- **Autonomous mode:** proactive monitoring — restock alerts, price adjustments, review responses.
- **Analytics dashboard:** charts, funnels, cohort analysis from store data.
- **Team accounts:** multi-user with role-based permissions.
- **Mobile app:** native mobile chat interface for on-the-go management.
- **Tool marketplace:** third-party developers contribute tools to the ecosystem.

---

## 15. Appendix

### 15.1 Resources

- Shopify Admin REST API: shopify.dev/docs/api/admin-rest
- Shopify GraphQL Admin API: shopify.dev/docs/api/admin-graphql
- Claude Tool Use: docs.anthropic.com/en/docs/build-with-claude/tool-use
- Next.js App Router: nextjs.org/docs/app
- shadcn/ui: ui.shadcn.com
- Firecrawl: firecrawl.dev

### 15.2 Required Shopify API Scopes

```
read_products, write_products, read_orders, write_orders, read_inventory,
write_inventory, read_customers, read_discounts, write_discounts,
read_content, write_content, read_themes, read_analytics
```

---

*End of Document — Let's build something great.*
