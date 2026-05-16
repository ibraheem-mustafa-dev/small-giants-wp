---
doc_type: pixel-diff-report
project: small-giants-wp
run_date: 2026-05-17
session_commits:
  - e34618f9 (voter RETIRED_BLOCK_REMAP)
  - 631dc68b (baseline + parking)
  - df3a6cbf (walker preserves SGS-BEM grouping wrappers)
source_posts:
  mockup_baseline: post 66 — refreshed 2026-05-17 04:49 with migrated mockup (sgs-brand classes)
  sgs_output: post 65 — refreshed 2026-05-17 04:47 with walker-fix converter output
  deployment: mamas-munches.css regenerated + SCP'd to sandybrown 2026-05-17
threshold: 1%
verdict: brand section closed 87 percentage points; other sections need lift-fidelity work
---

# Per-section pixel-diff post-fix — 2026-05-17

## Headline

**Brand section: 99.6% → 12.9% at tablet (87-point improvement).** Voter retired-block remap + walker BEM-wrapper preservation + mockup canonical-naming migration combined ship a working brand-pattern composition. Other sections show genuine mockup-vs-converter gap numbers (previous baseline used stale post 66 which incorrectly compressed apparent diffs).

## Numbers — fresh-vs-fresh

| Section | 1440 desktop | 768 tablet | 375 mobile | vs prior (stale) |
|---|---:|---:|---:|---|
| hero | 69.73% | **99.90%** | 80.39% | ≈ unchanged (real numbers) |
| trust-bar | 99.74% | 99.71% | 99.60% | ≈ unchanged (schema mismatch persists) |
| featured-product | 61.89% | 61.67% | 61.03% | +26pp REAL (stale was misleading) |
| **brand** | **31.75%** | **12.93%** | **35.67%** | **−68 / −87 / −64 pp WIN** |
| ingredients-section | 39.52% | 30.83% | 43.92% | mixed real |
| gift-section | 62.28% | 51.21% | 47.92% | +14pp REAL (was misleading) |
| social-proof | 81.00% | 77.94% | 79.59% | +5pp |

The "regressions" on featured-product, gift, social-proof are exposure of the **real** gap — prior baseline compared against a STALE post 66 with content from an earlier mockup version, coincidentally matching the SGS output more closely than reality.

## What this session shipped

| Commit | What |
|---|---|
| `e34618f9` | Voter `RETIRED_BLOCK_REMAP` + iteration-order safety + disjoint-keys assertion + mockup migration to `sgs-brand*` + unit test (10 assertions) + 4-rater /qc panel |
| `631dc68b` | Pixel-diff baseline run + P-PHASE8-NEW-2 parking entry |
| `df3a6cbf` | Walker preserves SGS-BEM grouping wrappers as nested sgs/container — fixes the actual P-PHASE8-NEW-2 finding (pass-through dropping `__content` wrapper) |
| (uncommitted) | Post 65 + post 66 + mamas-munches.css deployed to sandybrown |

## What's parked for next session

### P-PHASE8-NEW-3 — Hero 768px selector height mismatch

- Mockup hero at 768px = 693px tall; SGS hero at 768px = 426px tall (267px delta)
- Likely an image dimension or layout collapse difference at tablet viewport
- `@media (max-width:767px)` cutoff means tablet uses desktop layout — possibly hero's column ratio or image object-fit produces shorter SGS height
- Needs DOM inspection at 768px to identify the shrinking element
- ~30-45 min when picked up

### P-PHASE8-NEW-4 — CSS-lift media-query support

- Mockup CSS `@media (min-width:768px)` overrides aren't read by the walker's CSS-driven container detection
- Result: `columnsMobile:2` for brand section when mockup intends 1-col mobile
- Mobile renders 2-col where mockup intends single-column stack
- Walker reads only base CSS; media-query rules ignored
- Universal fix — affects any responsive container

### P-PHASE9-3 — Per-instance lift fidelity (renamed from generic "lift gaps")

- 538 medium-severity extraction_failed entries dominated by config-attrs at defaults (textColour, padding, hoverEffect, transitionDuration) — these are intentionally unset, not gaps
- **Real high-impact gaps** concentrated in:
  - Ingredients section (147 entries): info-box children — emoji/icon, heading, description per item not lifting at full fidelity
  - Gift section (106 entries): same info-box family
  - Hero (151 entries): mix of CSS-lift styling + image attrs
- Brand section now has 93 entries (mostly border/padding/spacing config) — these don't move the pixel needle
- Approach: filter `_CONTENT_BEARING_ROLES` further OR walk per-section content slots and identify the 5-10 attrs that actually visually matter

### Trust-bar schema/render mismatch (Priority #3 from prior next-session-prompt)

- ~99.7% diff across all 3 viewports — block emits stat-counter shape, mockup uses badge shape
- Three paths: variant enum / mockup rewrite / split into two blocks
- Was deferred 2026-05-16, still deferred — needs decision before progress

## Recommended next-session priorities

1. **Trust-bar schema decision** — biggest unmoved number (99.7%) with three concrete paths. ~15 min discussion + variable execution
2. **P-PHASE8-NEW-3 hero 768 height delta** — ~30-45 min, cheap win
3. **P-PHASE8-NEW-4 CSS-lift media-query** — universal infrastructure, affects every responsive section. ~1-2 hours
4. **P-PHASE9-3 lift fidelity sweep** — open-ended, scope per section
