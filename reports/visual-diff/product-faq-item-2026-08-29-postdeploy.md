# Visual diff — sgs/product-faq-item — 2026-08-29 (post-deploy follow-up)

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: d10cb1b47
block: product-faq-item
url: https://sandybrown-nightingale-600381.hostingersite.com/delete-me-border-round-trip-probe-2026-08-29t213552-407z/

Closes the `SGS_VISUAL_GATE_SKIP` bypass logged at `2026-08-29 22:30:42` in
`manual-skips.log` — the commit (`d10cb1b47`) was accepted on the promise this
report would follow once deployed. It has now been deployed and measured.

## The bug this fixes

Same defect class as `sgs/table-of-contents`, found by the same live probe
sweep: `sgs/product-faq-item`'s border control only ever emitted CSS when
`borderStyle !== "none"`, so picking "no border" was a no-op wherever a
colliding hardcoded default existed. Not caught in the earlier pre-deploy
10-block fixture pass (that run measured this block's border as PASS) — a
later, wider probe run against all 37 border-migrated blocks together
surfaced it as a real FAIL, since page composition determines which shared
CSS actually applies.

## Live result — canary, computed styles, post-deploy

`node scripts/qa/check-border-roundtrip.js --blocks sgs/product-faq-item`:

```
PASS     sgs/product-faq-item
         [.wp-block-sgs-product-faq-item <details>] border painted from
         attributes, control clean. Observed: positive[4px solid
         rgb(230, 138, 149)] · control[0px none rgb(58, 46, 38)] · expected
         colour rgb(230, 138, 149)
```

The negative control (`borderStyle: "none"`) now correctly paints `0px none`.

## Risk

None remaining — this is the closing verification for a change already
deployed and confirmed alongside `table-of-contents` in the same probe run.
