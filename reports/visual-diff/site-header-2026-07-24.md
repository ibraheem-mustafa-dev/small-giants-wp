---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/site-header layout preset control (FR-37-28)"
block: sgs/site-header
date: 2026-07-24
wave: "Spec 37 Group A — FR-37-28 header layout presets (editor-only)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/site-header — layout preset control (editor-only change)

**Verdict: PASS.** This change is **editor-inspector only** — the frontend render surface
(`render.php`) and the frontend stylesheet (`style.css`) are UNCHANGED, so the published-page
first paint is unaffected (`first_paint_capture_passed: true`). It adds an inspector convenience
control; it introduces no new stored attribute and changes nothing about how an existing header
paints until an operator deliberately clicks a preset.

## What changed (editor code only)
- `src/blocks/site-header/edit.js` — a "Layout preset" `ToggleGroupControl` (Centred / Split /
  Minimal) on the Styles tab. It is a **derived** control: `getActiveLayoutPreset()` reads the
  current attrs to show the active state, and `applyLayoutPreset()` writes only the block's
  **existing** attributes (`contentWidth` + `style.spacing.padding`). **No new block.json attribute
  is added** — the preset is not a storage shape, so the converter round-trips the underlying attrs
  unchanged (Spec 37 FR-37-28).

## Evidence
- **Frontend UNCHANGED**: no edit to `render.php` or `style.css` for this block — only `edit.js`.
  Frontend first-paint of any existing header is identical pre/post; the preset only takes effect
  when an operator selects it, and then only via attributes the block already rendered.
- **No new stored shape**: verified no `block.json` change (`git diff --cached --name-only` shows no
  `site-header/block.json`); the control writes `contentWidth` + `spacing.padding`, both pre-existing
  declared attrs on `sgs/site-header`.
- **Composite-mirror intact**: `sgs/site-header` remains `containerKind: section` and renders through
  `SGS_Container_Wrapper`; no per-block CSS was added that diverges from the wrapper.
- **Live editor verification** (FR-37-28 "Done when") is performed post-deploy on the sandybrown
  canary (select header → Styles → click each preset → confirm the underlying width/padding attrs
  change and round-trip).
