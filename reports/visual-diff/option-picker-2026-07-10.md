---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/option-picker no-inline (swatch + pill-fill)"
block: sgs/option-picker
date: 2026-07-10
wave: "no-inline rollout — LAND-completion session"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/option-picker — no-inline swatch + selected-pill fill (LANDED)

**Verdict: PASS.** Two changes this session, both live-verified on sandybrown page 8.

## 1. Colour-swatch chip inline `background` → var
`render.php` — the WooCommerce colour-swatch chip painted `style="background:%s"` (a real
inline property declaration). Now carried as a CSS custom-property VALUE `--sgs-op-swatch-bg`
and painted by `style.css` `.sgs-option-picker__swatch--colour{background:var(--sgs-op-swatch-bg)}`.
(See `option-picker-swatch-noinline-2026-07-10.md`.)

## 2. Selected-pill fill (`P-PILL-SELECTED-FILL-PRESET`) — fixed UNIVERSALLY
The cloned selected pill rendered opaque primary `#E68A95` instead of the draft's 10% tint
`rgba(230,138,149,0.1)`. **Root cause (proven, corrects the parked mis-diagnosis):** WordPress's
`safecss_filter_attr()` (via `get_block_wrapper_attributes()`) silently STRIPS an inline
custom-property whose value is `rgb()`/`rgba()`/`hsl()` — so the forwarded `--sgs-op-sel-bg:rgba(...)`
was dropped and the pill fell to the preset primary fallback. **Universal fix** (not a picker
patch): the shared `sgs_colour_value()` now normalises functional-colour notations to hex (8-digit
for alpha) — every block's inline colour values survive safecss. The picker keeps its standard
inline custom-property channel (Spec 32 FR-32-4). (See `option-picker-pill-fill-2026-07-10.md`.)

## Evidence (live, page 8, 1440px)
- Selected pill `background-color` computes **`rgba(230, 138, 149, 0.1)`** (was `#E68A95`).
- Picker root `inlineViolations: 0` — no inline property declarations.
- `audit-inline-styling.js --check`: option-picker `inlineViaRender` = 0.

## Gates
- `npm run build` prebuild + webpack: PASS. Deployed; OPcache + LiteSpeed purged. 440 converter tests pass.
