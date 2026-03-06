# CLAUDE.md — Shams-E


## Project Overview

Shams-E is an AI-powered e-commerce agent ("Cursor for Shopify") — a hackathon build due **March 10, 2026**. The full PRD lives at `PRD/Shams-E_PRD.md`.

**One-liner:** Tell Shams-E what you want to sell, and it builds your store, researches your market, creates your listings, and launches your marketing — all from a single chat window.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animation:** Framer Motion, Three.js (WebGL shaders), Spline (3D)
- **Package manager:** npm
- **Deployment target:** Vercel

## Project Structure

```
src/
  app/
    page.tsx          # Landing page V1 (original — ring shader + Spline robot)
    v2/page.tsx       # Landing page V2 (chromatic shader + scroll expansion hero)
    layout.tsx        # Root layout — Instrument Serif, Libre Franklin, IBM Plex Mono fonts
    globals.css       # Theme variables, scrollbar, spotlight animation
  components/ui/
    shader-animation.tsx      # V1 hero shader (concentric rings)
    web-gl-shader.tsx         # V2 shader (chromatic aberration sine wave)
    scroll-expansion-hero.tsx # Scroll-driven media expansion component
    splite.tsx                # Spline 3D scene wrapper (used in V1 only)
    spotlight.tsx             # SVG spotlight effect
    card.tsx                  # shadcn card primitives
  lib/
    utils.ts          # cn() utility
```

## Design System

- **Background:** `#050505`
- **Text:** `#e8e4de`
- **Accent/Primary:** `#5EEAD4` (teal)
- **Fonts:** Instrument Serif (display), Libre Franklin (body), IBM Plex Mono (mono)
- **CSS variables:** defined in `globals.css` under `:root` and `.dark`

## Landing Page Versions

Two mockups exist side-by-side for comparison:

- **V1** (`/`) — WebGL ring shader hero, Spline 3D robot in Agent section, 2x2 feature grid, 3-column process steps
- **V2** (`/v2`) — Scroll expansion hero (image expands on scroll), no Spline/robot, alternating feature rows, process steps with chromatic shader background, stats bar, trust strip

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Key Conventions

- All pages/components use `"use client"` where hooks or browser APIs are needed
- shadcn components live in `src/components/ui/`
- External images require domains in `next.config.ts` `images.remotePatterns`
- The scroll expansion hero hijacks window scroll — it must be at the top of the page, not mid-page
- Keep V1 and V2 independent — changes to one should not affect the other

## What's Built vs What's Not

**Done:** Landing page (two versions), shader animations, scroll expansion hero, responsive layout, fonts, theme

**Not yet built (per PRD):** Chat interface, Claude API agent integration, Shopify API connector, tool definitions, database, market research engine, image generation, sidebar, action logger — all backend/agent work is ahead

## Hackathon Timeline

- Day 1 (Mar 4): Project setup + landing page ← **current**
- Day 2 (Mar 5): Agent core + Shopify tools
- Day 3 (Mar 6): AI tools + research + end-to-end flow
- Day 4 (Mar 7): P1 tools + sidebar + rich messages
- Day 5 (Mar 8): Polish + testing
- Day 6 (Mar 9): Demo prep + deploy
