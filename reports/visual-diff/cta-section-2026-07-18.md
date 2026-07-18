---
block: cta-section
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/cta-section` GOTCHA-F rewrite (Facet B) — 2026-07-18

Framework inline-zero rollout (Spec 32 FR-32-4 as amended D345), Facet B. The
shared `SGS_Container_Wrapper` now scopes a composite's `--sgs-hover-*` vars, so
cta-section's `.sgs-cta-section[style*="--sgs-hover-*"]:hover` presence-selectors
were rewritten. Converted by a `wp-sgs-developer` agent; diff fact-checked.

## What changed (`src/blocks/cta-section/style.css`, hover rules only)

3 selectors: `[style*=…]` gate removed; each declaration now
`var(--sgs-hover-*, <resting>)` — bg→`var(--wp--preset--color--primary-dark)`
(its actual resting bg), text→`inherit`, border→`transparent`. No hover VALUES
changed. Only `:hover` rules touched.

## Verification

| Check | Result |
|---|---|
| 0 live `[style*="--sgs"]` presence-selectors remain | yes (1 hit is a comment) — fact-checked |
| inert fallback = resting value | confirmed against the block's resting `.sgs-cta-section` rule |
| shared wrapper mechanism (scopes the vars) | proven live on `sgs/hero` (homepage) |

## first_paint_capture_passed

**Unchanged by construction:** only `:hover` rules were edited, each with an
inert fallback equal to the element's resting value, so the resting / first-paint
appearance is provably identical (a `:hover` rule cannot affect non-hover paint).
`sgs/cta-section` is not on the homepage canary; the hover-when-configured
behaviour (colour swap on a custom-hover instance) is deferred to a page that
exercises it. The wrapper mechanism it depends on is verified live on hero.
