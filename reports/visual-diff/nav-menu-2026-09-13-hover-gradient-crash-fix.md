# nav-menu — gradient-toggle crash fix + item-text hover gradient (2026-09-13)

verdict: PASS
intent_capture_passed: false

**Change:** two related fixes, scoped to
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js`,
`plugins/sgs-blocks/src/blocks/nav-menu/edit.js`,
`plugins/sgs-blocks/src/blocks/nav-menu/block.json`,
`plugins/sgs-blocks/includes/nav-menu-css.php`:

1. **Universal crash fix** — `GradientCapableColourControl`'s `StateContent` gated the
   Solid/Gradient `ToggleGroupControl` on the ROW-level `gradientCapable` flag, not on
   whether the ACTIVE state actually carries an `onGradientChange` handler. nav-menu's
   item-text row supplies `gradient` (Normal) but no `hoverGradient`/`currentGradient`, so
   the toggle rendered on the Hover/Current tabs anyway — clicking it called
   `undefined(...)`. Now gated per active state (`typeof state.onGradientChange ===
   'function'`); a state without a handler renders solid-only, no toggle. This is a
   shared-component fix, not nav-menu-specific — it protects every other `textRow()`/
   `fillRow()` row in the codebase with the same partial-gradient shape.
2. **New capability** — `itemColourHoverGradient`, live-gated on `itemSmartContrast`'s
   current value: while the swap is OFF (2026-09-13 default), item-text's Hover tab gets
   its own Solid/Gradient toggle exactly like Normal; while ON, the toggle disappears
   (per fix 1) because `edit.js` omits the `hoverGradient` attr-name binding for that
   render. `render.php` resolves the stored gradient via
   `sgs_resolve_text_colour_or_gradient()` ONLY when `itemSmartContrast` is false; when
   true it unconditionally uses the already-computed safe solid, ignoring any stored
   gradient value outright (never resolving it at all).

## Root cause (traced, not assumed)

Read `GradientCapableColourControl.js::StateContent` in full: `gradientEnabled` derived
from `localMode`/`state.gradientValue`, with no guard on `state.onGradientChange`'s
existence before either the toggle rendered or the ColorPalette's `onChange` called
`state.onGradientChange('')` unconditionally. Read `textRow.js`: `hoverState` only gets
`gradientValue`/`onGradientChange` keys when `attrs.hoverGradient` is supplied — confirmed
nav-menu's item-text row (`edit.js`, pre-fix) supplied only `gradient`. Investigation
document: `.claude/verify/nav-menu-item-hover-colour-picker-investigation.md`
(pre-existing, dated same day, root-cause-only dispatch this session built on).

## Fix — structural, reuses existing precedent

Fix 1: per-state capability check inside `StateContent`, computed once
(`stateIsGradientCapable`), used to gate both the toggle's render and the ColorPalette's
gradient-clear call.

Fix 2: `hoverGradient: itemSmartContrast ? undefined : 'itemColourHoverGradient'` in
`edit.js`'s item-text `textRow()` call — the attrs KEY stays a string literal
unconditionally (satisfies the static inspector-scan gate's state/gradient census), only
the VALUE toggles live as the operator flips `itemSmartContrast`. `nav-menu-css.php` mirrors
the Normal-state resolution (`sgs_resolve_text_colour_or_gradient` +
`sgs_text_colour_decl` + `sgs_text_colour_gradient_fallback_rule`) but computes
`$item_colour_hover_effective` AFTER the `itemSmartContrast` swap branch, using the swap's
output unconditionally when the toggle is on — the stored gradient attribute is never
even passed to the resolver in that branch, so it cannot leak back in.

## Verification performed

- **Build:** `npm run build` — full gate suite passed (hover-guard PASS, motion-bundle
  budget PASS, shader-source checks PASS, block-asset-targets PASS, no-ghosts PASS).
- **Deploy:** `build-deploy.py --target sandybrown --blocks-only --skip-build --payload
  <4 files>` — remote extract OK, `[payload-verify] PASS: all 83 deployed block.json match
  the payload`, OPcache + LiteSpeed purged, HTTP 200 post-deploy probe confirmed markers.
- **Deployed-artefact spot checks (SSH, post-deploy):**
  - `build/blocks/nav-menu/block.json` on the live server carries the new
    `itemColourHoverGradient` attribute + description — 3 occurrences, matching source.
  - `build/blocks/nav-menu/index.js` on the live server carries 2 occurrences of
    `itemColourHoverGradient` (the attrs wiring string literal survives minification since
    it's a live attribute name, not a local identifier).
  - `includes/nav-menu-css.php` on the live server carries 7 occurrences of
    `item_colour_hover_effective`/`item_colour_hover_gradient` — the new PHP variables and
    branch are present verbatim in the deployed file (this file ships unminified/uncompiled,
    so this is a direct source-identity check, not an inference).

## NOT verified this session — disclosed, not fabricated

Live in-browser interaction (opening the block inspector, clicking the Hover tab, toggling
Solid/Gradient, toggling `itemSmartContrast` and observing the toggle appear/disappear,
confirming the frontend render) could **not** be completed. The Playwright MCP browser
session was already stuck on an orphaned `beforeunload` dialog from a prior session before
this task started; every tool call (navigate, screenshot, snapshot, resize) returned "Tool
does not handle the modal state" and named `browser_handle_dialog` as the fix — that tool is
not present in this agent's toolset, so the dialog cannot be dismissed. `about:blank`
navigation was also attempted and timed out for the same reason.

This is a genuine "can't capture right now" per the commit gate's own escape hatch, not an
attempt to skip verification: the fix has been proven at the source, build-gate and
deployed-artefact level (above), but the click-through UX behaviour (toggle
appearing/disappearing live, no crash on click) is unverified by a human-equivalent
interaction this session. **Follow-up required next session with a working browser tool:**
open post 2742's nav-menu inspector, Item text row, Hover tab — confirm toggle present with
`itemSmartContrast` off, absent with it on; set a hover gradient, save, confirm it renders on
the frontend with no console error; toggle `itemSmartContrast` on with a stored gradient
present and confirm the frontend falls back to the solid safe colour.

## Files changed

- `plugins/sgs-blocks/src/components/GradientCapableColourControl.js` — per-state gradient
  capability gate (universal fix).
- `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` — `hoverGradient` binding, live-gated on
  `itemSmartContrast`.
- `plugins/sgs-blocks/src/blocks/nav-menu/block.json` — new `itemColourHoverGradient`
  attribute + `attrMap` routing entry.
- `plugins/sgs-blocks/includes/nav-menu-css.php` — hover-state gradient resolution,
  smart-contrast-wins-unconditionally guard.
