# shams-e

ai commerce co-pilot for shopify workflows. shams-e combines conversational planning with tool-based actions so a demo user can go from idea to store changes quickly.

## current status (mvp in progress)
- frontend: next.js app router shell is live
- backend/api: pending `/api/chat` agent loop implementation
- integrations: shopify + research tools are planned in `TODO.md`
- fallback: mock mode planned for demo reliability

## tech stack
- next.js 15 + react 19 + typescript
- tailwind + shadcn/ui
- node runtime (npm)

## repository structure
- `src/app/` - app routes and ui pages
- `src/components/` - reusable ui components
- `src/lib/` - shared utilities and (planned) tool registry + clients
- `public/` - static assets
- `PRD/` - product planning docs
- `TODO.md` - implementation checklist and sprint priorities

## environment setup
1) install dependencies
- `npm install`

2) create env file
- copy `.env.example` to `.env`
- fill required keys (at minimum, model provider key; shopify keys when testing real store actions)

3) confirm scripts
- `npm run dev` for local development
- `npm run build` for production build check
- `npm run lint` for static checks

## local run flows

### frontend (default)
- start app: `npm run dev`
- open: `http://localhost:3000`

### api (once `/api/chat` lands)
- the api route will be served by next.js on the same dev server
- endpoint target: `POST /api/chat`
- planned behavior: stream assistant output + tool events to chat ui

### mock mode (planned reliability path)
- set `MOCK_MODE=true` in `.env`
- expected behavior:
  - bypass live shopify write calls
  - return deterministic seeded products/orders/inventory
  - keep demo flow working if external APIs fail

## architecture snapshot (target)
1. user sends message in `/app/chat`
2. ui posts conversation to `/api/chat`
3. api runs agent loop:
   - system prompt + history -> model
   - model tool calls -> tool registry handlers
   - handler results -> model continuation
4. api streams assistant text + structured tool events back to ui
5. ui renders:
   - assistant messages
   - pending/success/error tool states
   - rich blocks (product cards, research summaries, confirmations)

## demo script (target)
- flow 1: zero-to-store product creation
- flow 2: market intelligence summary
- flow 3: inventory/orders checks
- flow 4: light marketing launch support

## sprint workflow
- base branch: `development`
- create focused feature branches from `development`
- open PRs back into `development` with small, reviewable scope
- keep commit messages explicit (`feat: ...`, `fix: ...`, `docs: ...`)
- do not merge to `main` during active sprint without explicit approval

## quick troubleshooting
- app fails to start:
  - run `npm install` again
  - verify node version supports next 15
- env key errors:
  - re-check `.env` against `.env.example`
- flaky external APIs during demo:
  - switch to `MOCK_MODE=true`

## next high-impact tasks
see `TODO.md` for the authoritative checklist and build order.
