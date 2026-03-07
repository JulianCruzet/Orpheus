# Shams-E 5-Minute Pitch Rehearsal Script

goal: rehearse a strict 3-5 minute showcase delivery with timing checkpoints and fallback cuts.

## timing plan (target: 4:30)
- 0:00-0:30 intro + problem
- 0:30-1:10 why now + market pain
- 1:10-2:55 live demo flow (chat -> tools -> visible result)
- 2:55-3:35 architecture + technical depth
- 3:35-4:10 reliability + safety
- 4:10-4:30 close + call to action

## full script

### 0:00-0:30 | intro + problem
"hey judges, we're Team Shams-E. small commerce teams waste hours jumping between product copy, inventory updates, pricing research, and order decisions. we built an agent interface that turns those multi-tool workflows into one conversational loop with visible actions."

### 0:30-1:10 | why this matters
"the problem isn't lack of tools, it's operational fragmentation. store owners context-switch across Shopify, spreadsheets, and docs. Shams-E keeps context in one chat surface and executes the right commerce action while showing exactly what happened."

### 1:10-2:55 | demo flow
"in chat, i ask Shams-E to launch a new product. first it generates listing copy, then prepares pricing and tags, then applies a launch discount path. as i send prompts, the activity panel shows pending, success, or error tool events. rich result blocks show product cards, market research summaries, and action confirmations so the user can verify changes fast."

"next, i ask for market intelligence. Shams-E returns niche summary, competitor pricing range, trend keywords, and an opportunity score. then i switch to operations by asking for low inventory and order context. this demonstrates one continuous system covering growth plus execution."

### 2:55-3:35 | architecture + technical depth
"under the hood, `/api/chat` streams server-sent events. the agent loop processes conversation history, routes tool calls through a typed registry, returns structured results, and continues until final assistant output. we persist conversations, messages, and action logs with a lightweight sqlite/drizzle stack for auditability and continuity."

### 3:35-4:10 | reliability + safety
"for demo safety we support mock mode with seeded store data and cached research fallback. user trust controls include action summaries, confirmation for risky operations, and secret redaction in logs. so even when APIs are flaky, the demo and product story stay stable."

### 4:10-4:30 | close
"Shams-E turns fragmented ecommerce work into one guided control surface: chat in, verified actions out. thank you, we're ready for questions."

## strict rehearsal checklist
- run this script with a timer and stay under 5:00
- practice once at normal pace and once at +10% speed
- mark any section that exceeds its window and trim before final run
- verify demo prompts in `/app/chat` are preloaded before presenting
- capture one backup run recording for no-risk playback

## emergency 3-minute cut
if time is compressed, use only:
- intro/problem (0:20)
- one launch demo flow (1:20)
- architecture one-liner (0:35)
- reliability/safety one-liner (0:25)
- close (0:20)
