# Visual diff — sgs/table-of-contents — 2026-08-29 (post-deploy follow-up)

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: d10cb1b47
block: table-of-contents
url: https://sandybrown-nightingale-600381.hostingersite.com/delete-me-border-round-trip-probe-2026-08-29t213552-407z/

Closes the `SGS_VISUAL_GATE_SKIP` bypass logged at `2026-08-29 22:30:39` in
`manual-skips.log` — the commit (`d10cb1b47`) was accepted on the promise this
report would follow once deployed. It has now been deployed and measured.

## The bug this fixes

`sgs/table-of-contents`' card-style variant hardcodes `border: 1px solid …` in
`style.css` (`.sgs-toc--card`). The block's border control only ever emitted CSS
when `borderStyle !== "none"` — picking "no border" in the inspector emitted
nothing, so the hardcoded 1px border kept painting regardless of the client's
choice. Confirmed as the ORIGINAL reason this block returned NOT RUN from the
border-checking tool, before this session's fixture work made it measurable
(and before this session's fix made it correct).

## Live result — canary, computed styles, post-deploy

`node scripts/qa/check-border-roundtrip.js --blocks sgs/table-of-contents`:

```
PASS     sgs/table-of-contents
         [.wp-block-sgs-table-of-contents <nav>] border painted from attributes,
         control clean. Observed: positive[4px solid rgb(230, 138, 149)] ·
         control[0px none rgb(232, 213, 192)] · expected colour rgb(230, 138, 149)
```

The negative control (`borderStyle: "none"`) now correctly paints `0px none` —
before this fix it painted `1px solid`, matching the hardcoded card-style
default exactly.

## Risk

None remaining — this is the closing verification for a change already
deployed and confirmed. A regression spot-check on 6 unrelated affected blocks
(`accordion`, `hero`, `quote`, `testimonial`, `process-steps`, `before-after`)
also ran clean post-deploy.
