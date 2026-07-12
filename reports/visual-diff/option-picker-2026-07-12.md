---
verdict: PASS
first_paint_capture_passed: true
block: sgs/option-picker (shared pill — also drives sgs/product-card pack pills)
change: D316 selection-tick gap — absolute ::before overlay → in-flow tick + margin-right gap
date: 2026-07-12
page: sandybrown page 8 (https://sandybrown-nightingale-600381.hostingersite.com/?page_id=8)
caches_cleared_before_measure: OPcache web-pool reset + LiteSpeed purge-all + Hostinger CDN clear
---

# Visual-diff — D316 selection-tick gap (option-picker + product-card pills)

## What changed
Bean-reported 2026-07-12: on the selected pill the ✓ tick had **no gap** before the value and
**overlapped the number at some resolutions**.

- **Root cause:** the tick was an **absolutely-positioned `::before`** (`left: 0.7em`) sitting
  OVER the centred pill text — an out-of-flow overlay collides with the value on tight pills.
- **Fix (`src/blocks/option-picker/style.css`):** the tick `::before` is now an **in-flow flex
  item** with `margin-right: 0.3em` (the small, space-bar-sized gap), shown only on the SELECTED
  pill (`display: none` when unselected → unselected pills keep the draft-tight width, honouring
  the 2026-07-11 "draft pills reserve no tick space" directive). Being in-flow, the tick can
  **never overlap** the value at any viewport.
- **Universal:** `sgs/product-card` pack pills render via `render_block('sgs/option-picker')`
  (typed + bound), so both blocks share `.sgs-option-picker__pill` — this ONE change covers both
  (the old `.sgs-product-card__pill` rules were removed 2026-07-10).
- **Editor parity:** the matching tick-colour reveal added to `editor.css` (`--selected` class),
  so the client sees the coloured check in the block editor too.
- `block.json` 0.1.9 → 0.1.10 (CSS `?ver` cache-bust — the permitted pre-production bump).

## Live verification (sandybrown page 8, caches cleared, first paint captured)
Fresh CSS confirmed loaded: `style-index.css?ver=0.1.10`.

Selected "8-pack" pill, `getComputedStyle(pill, '::before')`:

| Viewport | ::before display | width | margin-right (gap) | tick colour | overlap |
|---|---|---|---|---|---|
| **1440px** | `block` (in-flow) | 7px | **4.2px** (0.3em) | rgb(58,46,38) dark on pale pill | none |
| **375px** | `block` (in-flow) | 7px | **3.9px** (0.3em) | rgb(58,46,38) | none |

Unselected pills: `::before display: none` → no tick, no reserved space (draft-tight). 768px is
covered by construction — an in-flow box cannot overlap its sibling text at any width.

## Cropped pairs
- `reports/visual-diff/option-picker-pills-1440-2026-07-12.png` — `✓ 8-pack` with a clean gap; unselected pills tight.
- `reports/visual-diff/option-picker-pills-375-2026-07-12.png` — same, pills wrapped 2×2 at 375; gap holds, no overlap.

## Verdict
**PASS.** The tick now sits a small consistent gap before the value and cannot overlap at any
viewport; unselected pills stay tight; universal across option-picker + product-card; editor
preview matches the frontend. Live-verified with caches cleared + first-paint capture.
