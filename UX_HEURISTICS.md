# UX heuristics pass (final)

date: 2026-03-07
scope: `/src/app/chat/page.tsx` demo chat experience

## checklist
- clarity: improved secondary guidance labels and helper status wording
- feedback: async send states + activity feedback already in place
- error recovery: added inline recovery banner when latest tool event is error with one-click safe prompt
- perceived speed: motion + staged pending/result transitions already in place
- accessibility signal: helper line now uses `aria-live="polite"`

## changes applied in this pass
1) added `lastEvent`/`hasRecentError` state derivation from activity events
2) added inline error recovery card directly under helper text
3) added `handleRecoveryPrompt()` to preload safe retry prompt
4) added aria-live support for status helper text

## outcome
the chat surface now gives clearer in-context recovery guidance after failures while preserving fast perceived response flow.
