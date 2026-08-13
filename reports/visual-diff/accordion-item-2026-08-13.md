---
doc_type: reference
title: "Visual-diff report — accordion · defaultOpen now previews in the editor canvas"
block: accordion-item
date: 2026-08-13
property: defaultOpen (context-propagated to accordion-item)
verdict: PASS
first_paint_capture_passed: true
source_sha: 805274905229d0e6
---

# `sgs/accordion` + `sgs/accordion-item` — defaultOpen editor-canvas preview

**Verdict: PASS.** Captured live on the sandybrown canary, editor canvas, on a
fresh page load.

## What changed on the visitor-facing surface

Nothing. `render.php` for both blocks is untouched — the frontend already
correctly opened the `defaultOpen`-indexed item (via its own `data-default-open`
attribute read by `view.js`). This fix is editor-canvas-only: `sgs/accordion`
gained `providesContext["sgs/accordionDefaultOpen"]` and `sgs/accordion-item`
gained the matching `usesContext` entry (both `block.json` additions), plus
`accordion-item/edit.js` now derives its own sibling index (mirroring
`sgs/tab`'s existing `getBlockIndex` pattern) and compares it against the
parent's `defaultOpen` context to decide its initial open/closed canvas state.

## Live DOM evidence — the state that matters

Probe page: two `sgs/accordion-item` children inside one `sgs/accordion` with
`defaultOpen: 1` (the second item, 0-indexed). Read directly from the editor
canvas iframe's live DOM (not a static screenshot comparison — this is a
binary show/hide state, so `className`/`getComputedStyle` is the correct
check, per this project's own computed-style-over-screenshot discipline for
non-colour/non-layout properties).

| Item | `sgs-accordion-item--open` class | Body `display` | Correct? |
|---|---|---|---|
| index 0 ("First question") | absent | `none` (hidden) | ✅ matches `defaultOpen: 1` pointing elsewhere |
| index 1 ("Second question") | present | not `none` (visible) | ✅ matches `defaultOpen: 1` |

Before this fix, `defaultOpen` had zero effect on the canvas — both items
always rendered in whatever state a manual click last left them (defaulting
to open on mount, per the block's original `useState(isOpen)`), so a client
changing "Default open item" saw no visible difference until publishing.

## Scope check

Only `sgs/accordion` and `sgs/accordion-item` touched. No other block's
`block.json`/`edit.js`/`render.php` in this change.
