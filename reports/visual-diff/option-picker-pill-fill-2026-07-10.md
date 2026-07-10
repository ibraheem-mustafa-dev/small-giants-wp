---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/option-picker selected-pill fill (safecss rgba strip)"
block: sgs/option-picker
date: 2026-07-10
wave: "no-inline rollout — LAND-completion session (Task 2)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/option-picker — selected-pill fill (`P-PILL-SELECTED-FILL-PRESET`, LANDED)

**Verdict: PASS.** The cloned selected pill rendered solid opaque primary (`#E68A95`) instead of the
draft's 10% tint `rgba(230,138,149,0.1)`.

## Root cause — PROVEN (corrects the parking entry's diagnosis)
The parking entry blamed the `colourPreset='solid'` class overriding the per-pill var. **Wrong.** The
real cause: `get_block_wrapper_attributes()` runs the root inline `style` through WordPress's
`safecss_filter_attr()`, which **silently strips a custom-property declaration whose value is
`rgb()`/`rgba()`/`hsl()`** — proven live on the server:
- `safecss_filter_attr("--x:var(--wp--preset--color--primary)")` → `--x:var(...)` (survives)
- `safecss_filter_attr("--x:#E68A95")` → `--x:#E68A95` (survives)
- `safecss_filter_attr("--x:rgba(230,138,149,0.1)")` → `` (**stripped**)
- `safecss_filter_attr("--x:rgb(230,138,149)")` → `` (**stripped**)

So `--sgs-op-sel-bg:rgba(...)` was dropped; the pill fell to the consuming rule's fallback
(`var(--wp--preset--color--primary)` = opaque). The preset's proposed fix (suppress the preset) would
NOT have worked — the rgba is stripped regardless, leaving the same primary fallback.

## Fix — UNIVERSAL (`includes/helpers-tokens.php`, not a picker spot-fix)
The shared colour resolver `sgs_colour_value()` (used by EVERY SGS block) now normalises functional-
colour notations (`rgb`/`rgba`/`hsl`/`hsla`) to hex (8-digit `#RRGGBBAA` when alpha < 1 — lossless)
via the new `sgs_functional_colour_to_hex()`. Hex survives safecss everywhere (inline + scoped), so a
cloned/authored functional colour is preserved for every block, in every context — not just the picker.
- Verified conversions: `rgba(230,138,149,0.1)`→`#E68A951A`, `hsl(350,60%,72%)`→`#E28D9B`,
  `rgb(230 138 149 / 0.1)`→`#E68A951A`; hex/named/`var()`/slug pass through unchanged.
- The option-picker keeps its standard inline custom-property channel (Spec 32 FR-32-4) — no picker-
  specific code. The inline `--sgs-op-sel-bg:#E68A951A` (1,0,0,0) beats the preset class (0,1,0).
- (An initial picker-scoped spot-fix was reverted in favour of this universal fix — Bean-directed:
  "it doesn't count if the fix isn't universal.")

## Evidence (live, page 8, 1440px)
- Selected pill `background-color` computes **`rgba(230, 138, 149, 0.1)`** (alpha 0.1 — the tint). Was `#E68A95`.
- Selected pill text colour `rgb(58, 46, 38)` (contrast preserved).
- Picker root `inlineViolations: 0` — fully no-inline (root fieldset carries no inline style at all).
- No re-clone needed: render-only change (no attr-shape change); the stored
  `pickerPillSelectedBgColour="rgba(230,138,149,0.1)"` now renders correctly.

## Follow-up (universal)
Any SGS block emitting an `rgb()`/`rgba()`/`hsl()` custom-property VALUE inline via
`get_block_wrapper_attributes` hits the same silent strip — worth an audit (most blocks use
hex/slug/token, so rgba only arrives via cloned literals).

## Gates
- `npm run build` prebuild + webpack: PASS. Deployed; OPcache + LiteSpeed purged.
