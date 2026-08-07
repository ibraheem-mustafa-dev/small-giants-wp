---
block: sgs/testimonial
date: 2026-08-07
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp against the live sandybrown canary (Playwright reserved for a co-active session)
deployed_build: deploy 2026-08-07, deployed files md5-verified against local build
change: Four rest-state colour fallbacks deleted (values restate what the element inherits); painted tokens de-specified via :where().
---

## Live measurement
Homepage, 9 sgs/testimonial instances. **0 elements below 4.5:1**.

## Negative control
One deletion candidate here named '--wp--preset--color--heading', which is NOT a palette slug and therefore always fell through to the 'text' fallback — deleting it is provably a no-op, not a colour change.
