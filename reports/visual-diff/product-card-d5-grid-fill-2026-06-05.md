---
block: product-card
date: 2026-06-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/product-card fills its grid track (D5) — 2026-06-05

(Cloning thread. Separate from the theme thread's `product-card-2026-06-05.md` Spec-28 report.)

**Change:** scoped the `.product-card` 380px `max-width` cap so it yields to the grid track
when the card is a grid item (`.sgs-container--grid > .product-card { max-width:none;
margin-inline:0 }`), keeping the 380px cap for the standalone case. CSS-only, no save()/markup
change, no deprecation.

**Why:** D5 / `P-CLONE-PAGE-VISUAL-TRIAGE #4b`. The converter places product cards as grid
items in a `640px 384px` track, but the card's own 380px cap made both cards render 380px —
the asymmetric featured/secondary layout was lost. Universal (R-22-9): any product-card in any
grid fills its track; standalone cards keep 380px.

**Dependency:** required the converter `display:grid → layout:"grid"` bridge (commit c97f85f1)
so the products container carries the `sgs-container--grid` class this selector targets.

## Live verification (canary 144, 1440px, after grid-bridge re-clone + cache-bust)

| Check | Before | After | Verdict |
|---|---|---|---|
| Featured card (Zookies) width | 380px (capped in a 640px track) | **640px** | PASS |
| Secondary card (Trial) width | 380px | **384px** | PASS |
| `--grid` class on container | absent | present (c97f85f1) | PASS |
| Standalone card (no grid parent) | 380px | 380px (unchanged) | PASS |
| Console errors | — | 0 | PASS |

**Result: PASS.** Asymmetric product layout faithfully restored; 380px cap retained standalone.
