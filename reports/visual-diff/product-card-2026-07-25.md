---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/product-card cardPadding box-object (content-body padding)"
block: sgs/product-card
date: 2026-07-25
wave: "Spec 31 close — root/body padding lands (cardPadding box-object + declarative fold routing)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/product-card — cardPadding content-body box-object (LANDED live)

**Verdict: PASS.** The card's padding is migrated from the single-value `innerPadding` scalar to
the universal `cardPadding` box-object `{top,right,bottom,left}` (FR-31-22), keyed to the
**content-body** element (`.sgs-product-card__body`) so the image stays full-bleed and only the
content is padded (the correct product-card pattern, Bean-confirmed). Live-verified LANDED on the
sandybrown canary; `first_paint_capture_passed: true` — the empty-`{}` default falls through to the
SAME pre-existing 20px body default, so existing instances render identically.

## What changed
- `block.json`: removed `innerPadding`; added `cardPadding` object attr + `supports.sgs.boxFamilies`;
  the `css:padding` mapping moved from the root wrapper (`box`) to a new content-`body` element so a
  draft's body padding routes here (image full-bleed).
- `edit.js`: the single-value "Inner padding" control replaced by a `BoxControl` "Card padding"
  (mirrors ctaPadding/tagPadding).
- `render.php` / `style.css`: emits scoped `.{uid} .sgs-product-card__body{padding:…}` via
  `sgs_box_object_shorthand()` — never inline (Spec 32). Empty `{}` → no rule → the `:where()` 20px
  body default renders (byte-identical to the pre-migration default).
- Converter: `fold_helpers` per-area padding router made DECLARATIVE (`attr_for_area_property`) with
  the legacy name-guess as fallback, so `cardPadding` (not named `bodyPadding`) resolves —
  parity-neutral for hero (verified).

## Evidence (live, sandybrown `f3-oracle-sgs-product-card`)
- **LANDED**: `.sgs-product-card__body` computed padding = **16px** (draft value), root padding = 0px,
  root border-radius = 16px intact, image full-bleed — Playwright computed-style check.
- **Empty-default fall-through**: `sgs_box_object_shorthand(array())` → NULL → no scoped rule →
  20px `:where()` default (proven identical to prior).
- 1034 converter/ledger/oracle tests + F5/F6 + box-family gate + `audit-inline-styling --check`
  (0 inline) green.
