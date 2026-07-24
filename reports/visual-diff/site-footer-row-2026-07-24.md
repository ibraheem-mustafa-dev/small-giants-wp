---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/site-footer-row promoted quick-insert palette (FR-37-34)"
block: sgs/site-footer-row
date: 2026-07-24
wave: "Spec 37 Group A — FR-37-34 row promoted palette (editor-only)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/site-footer-row — promoted quick-insert palette (editor-only change)

**Verdict: PASS.** This change is **editor-canvas only** — the frontend render surface
(`render.php`) and the frontend stylesheet (`style.css`) are UNCHANGED, so the published-page
first paint is unaffected (`first_paint_capture_passed: true`). It adds an editor-only quick-insert
placeholder that steers block insertion; it changes nothing about how an already-built row paints.

## What changed (editor code only)
- `src/blocks/site-footer-row/edit.js` — same shared `RowQuickInsertAppender` mechanism as the
  header row, promoting footer-appropriate elements (business info / contact / social / footer nav /
  CTA / copyright) when the row is empty, plus `prioritizedInserterBlocks`. **No `allowedBlocks`
  lock — freeform preserved (Spec 37 §3.5).**
- `src/blocks/site-footer-row/editor.css` — editor-only placeholder button styling. Editor bundle
  only, never the frontend.

## Evidence
- **Frontend UNCHANGED**: no edit to `render.php` or `style.css` for this block — only `edit.js` +
  `editor.css`. Frontend first-paint is identical pre/post.
- **Steering, not gating**: `renderAppender` (empty-row only) + `prioritizedInserterBlocks`; the full
  inserter stays unrestricted. Promoted slugs all verified to exist.
- **Live editor verification** (FR-37-34 "Done when") is performed post-deploy on the sandybrown
  canary.
