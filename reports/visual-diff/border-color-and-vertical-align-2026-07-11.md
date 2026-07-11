---
verdict: PASS
first_paint_capture_passed: true
date: 2026-07-11
decision: D306
blocks: [container, product-card, info-box, testimonial, cta-section, feature-grid, trust-bar]
---

# LANDED verification — D306: border-colour serialisation + verticalAlign default flip

Live page 8 (sandybrown), fresh clone `mamas-munches-homepage-2026-07-11-121523`, plugin deployed, OPcache reset, CDN cleared. Verified at 800px + 1440px.

## Cause 1 — border-colour (WP-core style-engine preset-ref drop)
**Fix:** `converter/services/root_supports.py` — emit `style.border.color` as a DIRECT `var(--wp--preset--color--{slug})` instead of the `var:preset|color|{slug}` preset reference (WP 7.0.1 style engine drops the latter for shorthand border-color — no `css_vars`).

LANDED (computed border-top-color, was `rgb(58,46,38)` dark on all):
| Element | Before | After | Draft target |
|---|---|---|---|
| featured product card | rgb(58,46,38) | **rgb(232,213,192)** ✓ | #E8D5C0 |
| trial card (dashed) | rgb(58,46,38) | **rgb(245,208,80)** dashed ✓ | #F5D050 accent |
| info-box | rgb(58,46,38) | **rgb(232,213,192)** ✓ | #E8D5C0 |
| testimonial classic-card | rgb(58,46,38) | **rgb(232,213,192)** ✓ | #E8D5C0 |

`var(--wp--preset--color--border-subtle)` resolves to rgb(232,213,192) live (token confirmed). Converter suite 440 pass, 1 skip (no golden regression).

## Cause 2a — verticalAlign default `"start"` → `""` (equal-height + brand button)
**Fix:** `container/block.json` verticalAlign default `""`; `class-sgs-container-wrapper.php:206` fallback `?? ''`. Blank → the wrapper's existing D288 guards (`:536`/`:549`) suppress `align-items` → CSS-initial `stretch`.

LANDED:
- Product cards: **572/572** @800px, **495/495** @1440px (were 572/536 — unequal). Grid `align-items:normal` (CSS-initial stretch).
- Brand "Read The Full Story" button: **width 450 = parent 450** (full-width), text centred @1440 (was fixed-size left-aligned).

Blast-radius verified pre-change: of 11 page-8 containers, only 3 used the old `start` default — all wanted stretch; the rest carry explicit center/stretch (unaffected).
