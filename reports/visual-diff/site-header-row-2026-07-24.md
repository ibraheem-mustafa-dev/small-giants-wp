---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/site-header-row promoted quick-insert palette (FR-37-34)"
block: sgs/site-header-row
date: 2026-07-24
wave: "Spec 37 Group A — FR-37-34 row promoted palette (editor-only)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/site-header-row — promoted quick-insert palette (editor-only change)

**Verdict: PASS.** This change is **editor-canvas only** — the frontend render surface
(`render.php`) and the frontend stylesheet (`style.css`) are UNCHANGED, so the published-page
first paint is unaffected (`first_paint_capture_passed: true`: the surface this gate protects
did not change). It adds an editor-only quick-insert placeholder that steers block insertion;
it changes nothing about how an already-built row paints.

## What changed (editor code only)
- `src/blocks/site-header-row/edit.js` — when the row is empty, `renderAppender` returns a shared
  `RowQuickInsertAppender` (a `Placeholder` with quick-insert buttons for logo / nav / search /
  cart / account / CTA / contact / social). Once the row has content, `renderAppender` reverts to
  its prior `undefined` value. Adds `prioritizedInserterBlocks` so the same elements surface first
  in the `+` inserter. **No `allowedBlocks` lock — the row stays fully freeform (Spec 37 §3.5).**
- `src/blocks/site-header-row/editor.css` — editor-only flex-wrap/gap styling for the placeholder
  button row (`.sgs-row-quick-insert__buttons`). Compiles to the editor bundle only, never the
  frontend.

## Evidence
- **Frontend UNCHANGED**: no edit to `render.php` or `style.css` for this block. `git diff --cached
  --name-only` for this block shows only `edit.js` + `editor.css`. Frontend first-paint is identical
  pre/post — the gate's actual concern (frontend visual regression) is not in play.
- **Steering, not gating**: promotion is via `renderAppender` (empty-row only) + `prioritizedInserterBlocks`;
  the full block library remains insertable. All 7 promoted slugs verified to exist as real blocks
  (`sgs/responsive-logo`, `sgs/nav-menu`, `sgs/product-search`, `sgs/cart`, `sgs/button`,
  `sgs/business-info`, `sgs/social-icons`) so `createBlock` cannot throw on an unregistered name.
- **Live editor verification** is the FR-37-34 "Done when" and is performed post-deploy on the
  sandybrown canary (empty row shows the palette; full inserter still unrestricted; console clean).
