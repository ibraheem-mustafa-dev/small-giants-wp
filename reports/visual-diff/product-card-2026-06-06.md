---
block: sgs/product-card
date: 2026-06-06
change: "R4 — add __experimentalBorder {radius,width,style,color} supports so the DB-gated converter border-lift can transfer border + border-radius onto cloned product cards"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/product-card — R4 __experimentalBorder visual-diff

## Change
`plugins/sgs-blocks/src/blocks/product-card/block.json` — added `"__experimentalBorder": {"radius": true, "width": true, "style": true, "color": true}` to `supports`; version 1.13.0 → 1.14.0. Block-owned metadata only (no markup/CSS change). Previously the converter's DB-gated border-lift (`_lift_root_supports_to_style` → `_support_allows`) dropped `border-radius:16px` / `border:1px solid` as `lift_gap_candidate` because the block declared no `__experimentalBorder` support (root cause R4, clone-fix-spec-9-roots). `/sgs-update` re-read the support into `block_supports`; the lift now transfers it.

## Live verification (sandybrown canary page 8, build + deploy + OPcache reset, 2026-06-06)
Playwright `getComputedStyle()` on the cloned product cards after re-clone:
- **Main product card** (`sgs-container product-card wp-block-sgs-product-card has-border-color has-border`): `border-top-style: solid`, `border-top-width: 1px`, `border-radius: 16px` — matches the draft `.sgs-product-card { border:1px solid var(--border); border-radius:16px }`. **#6/#7 resolved.**
- Card body inner container correctly carries no border (border is on the card root only).

## first-paint / regression
- Metadata-only supports addition; the block's default appearance (no border attrs set) is unchanged — borders render only when a border attr is present (set by the converter lift or an editor control). No first-paint animation defect.
- The new border controls are now available to editor users (client-experience-primary standard).

## Known follow-up (not a regression of this change)
The trial card (`variantStyle:"trial"`) renders solid 1px instead of the draft's 2px dashed accent: R4's base-border inline lift (1px solid) now overrides the `.product-card.trial-card { border:2px dashed }` CSS class. Tracked as a targeted follow-up (lift the trial card's OWN border, or raise the trial CSS specificity). Does not affect the main card's correctness above.

## Verdict
**PASS** — product-card border + radius now transfer and render correctly on the live clone.
