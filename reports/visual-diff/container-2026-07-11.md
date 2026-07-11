---
verdict: PASS
first_paint_capture_passed: true
block: container
date: 2026-07-11
decision: D306
---

# container — verticalAlign default `"start"` → `""` (D306)

**Change:** `src/blocks/container/block.json` `verticalAlign` default `"start"`→`""`; shared wrapper `class-sgs-container-wrapper.php:206` fallback `?? 'start'`→`?? ''`. A blank align now falls to the CSS-initial `stretch` via the existing D288 guards (`:536`/`:549` emit `align-items` only when non-empty). Fixes the injected default that made cloned grid/flex containers top-align (unequal cards) instead of stretching (FR-31-5.1 absent→initial).

## LANDED (live sandybrown page 8, fresh clone, CDN cleared)
- Product-card grid: cards **572/572** @800px, **495/495** @1440px (were 572/536). Grid `align-items:normal` (CSS-initial stretch).
- Brand content column (flex): "Read The Full Story" button **width 450 = parent 450** (full-width), text centred @1440 (was fixed-size, left-aligned).
- first_paint: page renders correctly at 375/800/1440; no layout regression on the other 8 containers (they carry explicit center/stretch, unaffected by the default change).

## Blast radius
Pre-change live scan of all 11 page-8 containers: only 3 relied on the old `start` default — all 3 want stretch. No container that wants top-alignment was harmed.
