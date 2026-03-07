# Shams-E Implementation TODOs

last updated: 2026-03-06
owner: julian + ali (+ faye support)

## 0) project setup + docs
- [x] replace default `README.md` with project-specific setup, architecture, and demo instructions
- [x] add `.env.example` with all required keys and brief descriptions
- [x] document local run steps for frontend + api + mock mode
- [x] define branch/commit workflow for sprint week (feature branches + PR cadence)

## 1) core agent backend (p0)
- [x] create `/api/chat` endpoint (streaming response)
- [x] add conversation input schema validation (zod or equivalent)
- [x] implement agent loop:
  - [x] send system prompt + conversation history to model
  - [x] parse tool calls
  - [x] execute tool handlers
  - [x] return tool results to model
  - [x] continue until final assistant response
- [x] add graceful error handling and user-safe fallback responses

## 2) tool registry + types
- [x] create shared tool type definitions (`src/lib/tools/types.ts`)
- [x] implement tool registry with metadata + handler mapping
- [x] add logging for each tool call (start/end/status/duration)
- [x] return structured tool results for consistent UI rendering

## 3) shopify integration (p0)
- [x] create `src/lib/shopify/client.ts` with authenticated admin client
- [x] implement `shopify_list_products`
- [x] implement `shopify_create_product`
- [x] implement `shopify_update_product`
- [x] implement `shopify_manage_inventory` (read + update)
- [x] implement `shopify_manage_orders` (list + detail)
- [x] add retries + friendly errors for rate limits and auth failures

## 4) ai tools (p0)
- [x] implement `generate_product_listing`
  - [x] title
  - [x] description
  - [x] tags
  - [x] seo metadata
  - [x] pricing suggestion
- [x] implement `research_market`
  - [x] niche summary
  - [x] competitor pricing range
  - [x] keyword/trend summary
  - [x] opportunity score / recommendation
- [x] implement `research_competitors`
  - [x] competitor catalog snapshot
  - [x] pricing patterns
  - [x] positioning analysis

## 5) chat product ui (separate from marketing landing)
- [x] create `/app/chat` route for product demo
- [x] build chat layout (message list, composer, side panel)
- [x] render assistant/tool events (pending/success/error states)
- [x] render rich blocks:
  - [x] product cards
  - [x] market research summaries
  - [x] action confirmations
- [x] add quick prompt buttons for hero demo flow

## 6) persistence (mvp)
- [x] choose storage (sqlite + drizzle recommended for speed)
- [x] create tables:
  - [x] conversations
  - [x] messages
  - [x] action_log
- [x] persist + reload conversation history
- [x] persist tool execution logs for audit/activity feed

## 7) safety + trust controls
- [x] add confirmation step for destructive actions (delete/bulk updates)
- [x] add transparent action summaries before execution
- [x] add undo path for reversible changes where possible
- [x] redact secrets from logs and responses

## 8) demo reliability (very important)
- [x] build `MOCK_MODE=true` path for offline/fallback demo
- [x] pre-seed demo store data (products/orders/inventory)
- [x] cache at least one market research response for backup
- [x] produce backup video (3 minutes) in case live APIs fail

## 9) flow completion targets (hackathon)
- [x] flow 1 (zero-to-store) works end-to-end live
- [x] flow 2 (market intelligence) works with real or cached data
- [x] flow 3 (inventory + orders) works with real data
- [x] flow 4 (marketing launch) works at least partially (copy + discount)

## 10) judging polish
- [x] align demo narrative to judging criteria:
  - [x] innovation
  - [x] technical complexity
  - [x] functionality
  - [x] presentation quality
  - [x] real-world applicability
- [x] add concise architecture slide/diagram
- [x] rehearse 3-5 minute pitch with strict timing

## 11) UI/UX excellence pass (must feel premium)
- [ ] elevate typography scale/weights and spacing rhythm to match landing-page quality
- [x] improve chat information hierarchy (primary actions vs secondary metadata)
- [ ] add tasteful Framer Motion micro-interactions (message enter, tool state transitions, hover/focus)
- [x] add polished loading/skeleton and async state choreography
- [ ] tighten mobile/responsive layout behavior and touch targets
- [ ] improve visual consistency of rich result blocks (product/research/confirmation)
- [ ] run final UX heuristics pass (clarity, feedback, error recovery, perceived speed)

## 12) authentication (supabase)
- [x] add Supabase browser client wiring
- [x] create auth screen with sign in + create account + magic link
- [x] protect `/chat` behind authenticated session checks
- [x] add sign-out control in chat UI
- [x] add auth env vars to `.env.example`

## 13) stretch goals (if p0 is done)
- [x] image generation tool (`generate_product_image`)
- [x] discounts + collections tooling
- [x] analytics insight tool (`analyze_store_performance`)
- [x] customer response drafting

## proposed build order (fastest path)
1. `/api/chat` + mock tool registry
2. shopify list/create/update product
3. chat ui + tool status rendering
4. `generate_product_listing`
5. `research_market` + `research_competitors`
6. persistence + polishing + demo prep
