---
doc_type: reference
title: "Visual-diff report — nav-drawer · closeStyle now previews in the editor canvas"
block: nav-drawer
date: 2026-08-14
property: closeStyle
verdict: PASS
first_paint_capture_passed: true
source_sha: 4c9bfd1addbeec87
---

# `sgs/nav-drawer` — closeStyle editor-canvas preview

**Verdict: PASS.** Captured live on the sandybrown canary, editor canvas, on a
fresh page load.

## What changed on the visitor-facing surface

Nothing. `render.php` already correctly rendered three distinct close-button
markups depending on `closeStyle` (`separate-x` → × icon, `text-swap` →
"Close" text, `burger-morph` → a 2-bar icon). The editor canvas's close
preview always rendered the × icon regardless of the setting, and the
`sgs-nav-drawer--close-{style}` modifier class (which the block's own
`style.css` scopes the text-swap/burger-morph styling under) was never
applied to the canvas root at all.

## Live DOM evidence

Probe page: `sgs/nav-drawer` with `closeStyle: "text-swap"`. Read directly
from the editor canvas iframe's live DOM.

| State | Rendered |
|---|---|
| Before fix | `<span class="sgs-nav-drawer__close-preview"><Icon/></span>` — always the × icon |
| After fix, `closeStyle: "text-swap"` | `<span class="sgs-nav-drawer__close-preview sgs-nav-drawer__close"><span class="sgs-nav-drawer__close-text">Close</span></span>` |

Matches render.php:487-493's `text-swap` branch exactly (a
`.sgs-nav-drawer__close-text` span containing "Close").

## Scope check

Only `sgs/nav-drawer/edit.js` touched (plus the detector's baseline file,
unrelated to this block's render surface). `render.php` untouched.
