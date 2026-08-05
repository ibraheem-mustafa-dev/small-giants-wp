---
block: trustpilot-reviews
date: 2026-08-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/trustpilot-reviews: dead `direction`/`wrap` attribute deletion — 2026-08-05

**Change.** Removed the bare `direction` and `wrap` attribute declarations from `block.json`. Nothing
else — no render, CSS, or editor change.

**Why they were dead.** This block also declares `flexDirection`/`flexWrap`, which are the pair the
shared wrapper actually consumes (`includes/class-sgs-container-wrapper.php:441-442`). The bare pair
had no consumer anywhere: not the block's own files, not the shared `includes/` tree. Verified with a
positive control — the same grep shape run against `flexDirection` returns the wrapper hits, so the
zero result for `direction`/`wrap` is a real absence and not a broken search.

**Live capture performed (post-deploy, this change deployed to the canary on 2026-08-05):**
`https://sandybrown-nightingale-600381.hostingersite.com/` loaded in Playwright at TWO viewports —
desktop (1745px inner) and mobile (341px inner). Measured on the real painted DOM:

| | desktop | mobile |
|---|---|---|
| `sgs/site-header` | 1731 x 93, text 73 chars | h 90 |
| `sgs/site-footer` | 1731 x 188, text 143 chars | h 363 |
| `sgs/responsive-logo` img | 180 x 67.6, real src, alt "Mama&#39;s Munches home" | visible, same src + alt |
| broken images (naturalWidth===0) | 0 | 0 |
| horizontal overflow | none | none |

Deployed schema re-read over SSH from `wp-content/plugins/sgs-blocks/build/` ON THE SERVER — not from
the local tree — confirming the shipped `block.json` carries the intended attributes.

**What the capture proves for THIS block.** This block does NOT appear on the canary homepage, so it was not directly observed in the capture. Stated plainly rather than glossed: the page-level evidence is that the deploy verified clean and the rest of the page renders unchanged; the block-level evidence is the no-consumer proof and the zero-finding oldshape audit above. The deployed `block.json` was re-read over SSH from the server and confirmed to no longer declare the two attrs.

**Why no render change is possible.** A `block.json` attribute with no reader cannot affect output;
removing the declaration removes a value nothing consumed. The one real risk of deleting a declared
attribute is stranding STORED content — WordPress silently discards undeclared attrs and deletes them
on the next editor save. That risk was measured, not assumed: the deploy's `oldshape-audit` scanned
405 canary posts and reported ZERO findings for this block. It DID report 3 HIGH findings for
`sgs/multi-button`, which is why that block's rename was pulled from this deploy and is deliberately
not covered by this report.

**Gates.** `check-dead-controls` 0 net-new; `check-dead-pattern-attrs` OK (every `sgs/*` attr in every
theme pattern and part still declared); `check-control-ux` 0 net-new.
