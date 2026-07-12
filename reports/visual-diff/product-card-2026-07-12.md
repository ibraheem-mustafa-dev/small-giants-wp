---
block: sgs/product-card
date: 2026-07-12
verdict: PASS
first_paint_capture_passed: true
change: "Trial tag = full functional mirror of sgs/label (Fix 4) — shared box helper + full-width like the CTA"
verified_on: "sandybrown page 8 (Mama's homepage), live computed-style 375/768/1440"
---

# sgs/product-card — trial-tag full mirror (Fix 4)

## What changed
- The in-body TRIAL tag ("New? Start here") now renders its box (padding/radius/background/full-width) through the SAME shared `sgs_label_box_css_rule()` helper the standalone `sgs/label` uses — Bean's composite-mirror requirement (R-31-9, Spec 31 §13.6 D294 block-private clean reproduction).
- New client-editable tag box attrs: `tagPadding`, `tagBackgroundColour`, `tagTextColour`, `tagBorderRadius`, `tagFullWidth` (default true = the trial tag's card-design full-width; a card-design constant, not a converter carve-out). Scoped to `.{uid}.sgs-product-card__tag--trial` (0,2,0) — wins by source order, never touches the featured overlay.
- `style.css`: removed `width:max-content` from the base `.sgs-product-card__tag` rule (was forcing the trial tag to hug) and re-asserted it on `.sgs-product-card__tag--featured` (protects the featured overlay badge + image-less fallback hug). Base `padding`/`border-radius` converted to overridable var-defaults (F3 gate — the new attrs govern them).
- FEATURED badge deliberately NOT mirrored (empty on this draft + a distinct overlay component — capability preserved, not broken).

## Live computed-style verification (page 8, 3 breakpoints)
| Element | 375 | 768 | 1440 | Verdict |
|---|---|---|---|---|
| Trial tag `New? Start here` | display block, padding 4px 10px, bg accent rgb(245,208,80), radius 6, **w276 / parent 316 = full-width** | **w217 / 257 = full-width** | **w340 / 380 = full-width** | PASS — stretches to card content width like the CTA (was w130 hug) |

## No-inline compliance (Spec 32 §6.1)
- The trial tag box emits via the shared helper into the card's own scoped `<style>` at class-level — no inline property declarations. PASS.

## Tests
- Converter unit suite 449 pass / 1 skip (green).
- Conformance goldens: 15 pre-existing red, 0 new (render-side change; converter emit unchanged for page 8 — the tag colour overrides are DB-seeded but resolve to the same accent/text as the base defaults).
- `/sgs-update --stage 1` seeded the 6 new attr rows (5 tag* + label fullWidth); db-consistency + all prebuild gates green.
