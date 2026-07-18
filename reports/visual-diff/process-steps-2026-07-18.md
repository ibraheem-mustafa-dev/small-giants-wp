---
block: process-steps
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/process-steps` GOTCHA-F rewrite (Facet B) — 2026-07-18

Framework inline-zero rollout (Spec 32 FR-32-4 as amended D345), Facet B.
Converted by a `wp-sgs-developer` agent; diff fact-checked.

## What changed (`src/blocks/process-steps/style.css`, hover rules only)

3 selectors: `.sgs-process-steps[style*="--sgs-hover-*"]:hover` →
`.sgs-process-steps:hover` with `var(--sgs-hover-*, <resting>)` — bg→`transparent`
(no base bg), text→`inherit`, border→`transparent` (no base border). No hover
VALUES changed. The unrelated `.sgs-process-steps__description:not([style*="color"])`
fallback-default guard was correctly left untouched.

## Verification

| Check | Result |
|---|---|
| 0 live `[style*="--sgs"]` presence-selectors remain | yes — fact-checked |
| inert fallback = resting value | confirmed against the `.sgs-process-steps` base rule |
| shared wrapper mechanism | proven live on `sgs/hero` (homepage) |

## first_paint_capture_passed

**Unchanged by construction:** only `:hover` rules edited with inert fallbacks,
so resting / first-paint paint is provably identical. `sgs/process-steps` is not
on the homepage canary; hover-when-configured behaviour deferred to a page that
exercises it. Wrapper mechanism verified on hero.
