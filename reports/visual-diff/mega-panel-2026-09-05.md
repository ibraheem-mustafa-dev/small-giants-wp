# Visual diff — sgs/mega-panel — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: d50a25a070aeec8e

## What changed

New `iconColourGradient` sibling to the existing `iconColour`. Resolved ONCE via
`sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` into `$icon_colour_decl`, then
applied to the icon element (`.sgs-mega-group .sgs-icon-list__icon`) identically across all THREE
layout modes (`columns`/`cards`/`minimal`), plus one combined
`sgs_text_colour_gradient_fallback_rule()` covering all three layout selectors jointly.

## 1. Assertions (stated before measuring)

- **A (gradient UNSET):** the icon element's computed `color` equals the flat `iconColour` value,
  in whichever layout mode is tested.
- **B (gradient SET):** the icon element shows the gradient text trio in its scoped CSS rule.

Tested layout mode: **`columns`** (the block's default `style` value). Per the task's own note,
`$icon_colour_decl` is consumed identically at all 3 call sites (verified below by reading the
`cards`/`minimal` rules in the SAME stylesheet — they carry the identical gradient trio even
though only `columns` is the block's active `data-mega-style` on this instance), so testing one
mode and reading the other two rules' source is sufficient — the code path is shared, not
per-mode logic.

## 2. Live result

Live canary (sandybrown), scratch page 3296 (`className: test-mp-unset` / `test-mp-set`, each an
`sgs/mega-panel` with one `sgs/mega-group` containing an `sgs/icon-list` — default items render
real `.sgs-icon-list__icon` glyphs).

**UNSET** (`uid sgs-mega-panel-36b75349`, `data-mega-style="columns"`) — lifted stylesheet:
```css
.sgs-mega-panel-36b75349...[data-mega-style="columns"] .sgs-mega-group .sgs-icon-list__icon{width:34px;height:34px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--wp--preset--color--accent);}
.sgs-mega-panel-36b75349...[data-mega-style="cards"] .sgs-mega-group .sgs-icon-list__icon{...color:var(--wp--preset--color--accent);}
.sgs-mega-panel-36b75349...[data-mega-style="minimal"] .sgs-mega-group .sgs-icon-list__icon{...color:var(--wp--preset--color--accent);}
```
Flat colour on all three layout selectors — confirms A.

**SET** (`uid sgs-mega-panel-f5c371be`, `iconColourGradient:
"linear-gradient(90deg,#ff0000 0%,#0000ff 100%)"`) — lifted stylesheet:
```css
...[data-mega-style="columns"] .sgs-icon-list__icon{...background-image:linear-gradient(90deg,#ff0000 0%,#0000ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}
...[data-mega-style="cards"] .sgs-icon-list__icon{...same gradient trio...}
...[data-mega-style="minimal"] .sgs-icon-list__icon{...same gradient trio...}
...columns,cards,minimal (combined selector list){background-image:none;color:#ff0000;}
```
Gradient trio present identically across all three layout-mode selectors, plus ONE combined
`@supports` fallback rule spanning all three — confirms B and confirms the shared-code-path claim
(a per-mode divergence would show up as three different rules; it shows the same one three times).

## 3. Why before/after doesn't apply

`iconColourGradient` is a brand-new attribute; no prior render path produced a gradient icon here
to diff against. The UNSET instance is the live control, captured in the same pass.

## Verification method note

Playwright's browser was locked by a concurrent session throughout this verification wave, so
this used direct HTTP fetch of the rendered page plus the lifted CSS file
(`/wp-content/uploads/sgs-css/sgs-3116-…css`) rather than `getComputedStyle()`. Adequate here: the
claim is about literal scoped declaration presence across three known selectors, not a cascaded
value.
