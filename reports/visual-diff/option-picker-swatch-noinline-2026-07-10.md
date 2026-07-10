---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/option-picker colour-swatch inline background"
block: sgs/option-picker
date: 2026-07-10
wave: "no-inline rollout — LAND-completion session"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/option-picker — colour-swatch inline `background` fix (LANDED)

**Verdict: PASS.** The WooCommerce colour-swatch chip painted `style="background:%s"` inline (a real
property declaration). Though it's a data value (the colour term's own swatch), it still tripped the
zero-inline scan.

## Fix
- `render.php` — carry the swatch colour as a CSS custom-property VALUE `--sgs-op-swatch-bg` (allowed
  inline) instead of a `background:` declaration; matches the sibling `--sgs-op-swatch-text` var the
  block already used.
- `style.css` — `.sgs-option-picker__swatch--colour{ background: var(--sgs-op-swatch-bg, transparent) }`.

## Evidence
- **Static audit**: option-picker `inlineViaRender` 1 → **0**. Framework-wide block-private
  `INLINE-via-render sites` = **0**.
- Build PASS; deployed to sandybrown; OPcache + LiteSpeed purged.

## Notes
- The pill-fill (selected-state) fidelity is a SEPARATE item (`P-PILL-SELECTED-FILL-PRESET`, Task 2) —
  not touched here. This report covers only the swatch-chip inline→var move.

## Gates
- `npm run build` prebuild + webpack: PASS.
