---
doc_type: phase-plan
title: Converter content-routing fix (FR-22-2 wiring) — render featured-product + social-proof
created: 2026-05-31
status: superseded
spec: specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md (FR-22-2, FR-22-4, R-22-3/9/14)
branch: feat/fr22-6-content-render (groundwork committed at c9c6544d; complete the fix here, then merge to main)
baseline: "Mama's page 144 mean ~58.5%; featured-product + social-proof render EMPTY (live DOM textLen=0). Target: both sections render their content."
---

> **SUPERSEDED 2026-06-02 by `.claude/plans/2026-06-02-container-wrapper-standardisation.md` (D152).** NB this plan is about CONTENT-ROUTING (sections rendering EMPTY — G1 leaf-text lifting, G2 wrapper-to-leaf guard, G3 array-slot emission, G4 block_composition refresh), NOT the width/full-bleed work. Disposition: **G4 (block_composition data refresh) SHIPPED as Workstream A (D152)**; **G1/G2 content-routing largely shipped earlier** (commit `1fcb0742`, see parking P-CONVERTER-CONTENT-ROUTING-FIX); any residual converter leaf-routing / slot-alias / array-slot (G1/G3) defects fold into **WS-2 (converter/router truth)** of the standardisation programme. The width/full-bleed + content-width work is a SEPARATE concern owned by **WS-1** — this plan did not target it. Branch `feat/fr22-6-content-render` groundwork (`c9c6544d`) retained for diagnostic context.

# Phase plan — Converter content-routing fix

## Why (plain English)

The cloning pipeline produces near-empty product and testimonial sections. The
container blocks were migrated to render their inner content (committed WIP on
this branch), but content still doesn't appear because the **converter/walker
never runs the FR-22-2 content-routing layer**. Three precise defects:

1. **Wrapper mis-resolves to a leaf.** `sgs-product-card__body` resolves to
   `sgs/text` because the `slots` table lists `"body"/"intro"/"description"` as
   aliases of the `text` slot. The walker then nests the heading/price/pills
   inside that leaf, which ignores its children → all swallowed.
2. **Leaf text not placed in the content attr.** The walker emits a leaf's text
   as inner markup between delimiters, but `sgs/text`/`sgs/label` read a scalar
   `text` attribute → render empty.
3. **Array items not emitted.** `packSizes` etc. never become child blocks.

This is a **converter fix in 1–2 files**, NOT a 61-block migration. The leaf
blocks (`sgs/text`, `sgs/label`) MUST stay leaves; the converter feeds their
attribute (R-22-14: no `$content` fallbacks on leaves). Full diagnosis: the
investigation report in this session's handoff + decisions D-entry.

## Architectural primitive (quote before any fix)

"A node's BEM class tells you which block it is. If that block can hold child
blocks, its content children become InnerBlocks; if it's a leaf, its text
becomes the value of that leaf's content attribute — never inner markup. A
wrapper div must never resolve to a leaf."

## Pre-flight (run first, every step)

- Read Spec 22 §0, §FR-22-2..2.5, §FR-22-6, §6 (R-22-1..R-22-14) END-TO-END.
- `git checkout feat/fr22-6-content-render` (groundwork is here; main is clean).
- Per-section pixel-diff gate on ALL 7 body sections per change (R-22-4); live
  DOM verify (R-22-11) — check `textLen`, not crop %. (Empty sections score a
  FALSE win on cropped pixel-diff — see captured lesson.)
- /qc-council before each commit (blub.db 255); hardest on G2 (alias prune).

## Groups (sequential except G4)

### G4 — block_composition data refresh (FIRST; independent; ~10 min)
- Run `/sgs-update` Stage 1. `sgs/testimonial` + `sgs/testimonial-slider` are now
  migrated (echo $content / iterate inner_blocks) but the table may still list
  them `leaf`. Refresh so G2's `composition_role` guard reads truth.
- Accept: `composition_role` for testimonial + slider = content-block/wrapper-shell.

### G1 — Lift leaf text into the content attr (~40 min)
- File: `convert.py` walk() universal path (~1684–1713); reuse `_atomic_attrs_for`
  (1488–1571) logic; `db_lookup.py` helper to return a leaf's content attr by role.
- When resolved slug is a leaf with a `role:content`/text attr (query
  `block_attributes`), set `attrs[content_attr] = rich_text(node)` and do NOT
  recurse text children into inner markup.
- **Check first:** `sgs/star-rating` has no scalar text attr — its content is
  star glyphs; it likely needs a numeric `rating` derivation, not a text lift.
  Read star-rating/block.json + render.php before coding G1.
- Accept: extract.json shows `sgs/text`/`sgs/label` carrying `{"text":"…"}` in the
  attr; social-proof testimonial quotes render on the live page (textLen > 0).

### G2 — Wrapper-to-leaf guard + XS-3 extension + slots alias prune (~50 min, HIGH blast radius)
- Files: `convert.py` (`_is_layout_bearing_wrapper` + universal path),
  `db_lookup.py` (`get_block_composition_role`); `slots` table data via direct
  sqlite (wrapper aliases `body`/`intro`/`inner`/`content-preview`/`row`/`group`
  pruned from the `text`/`split` slot alias lists — R-22-1 data not code).
- Guard: before emitting a node as its resolved slug, if
  `composition_role(slug)=='leaf'` AND node has ≥1 element child → route through
  `_emit_layout_container` (neutral className-only `sgs/container`) and recurse
  children as InnerBlocks. This is the XS-3 extension (R-22-3 refinement of
  FR-22-4, NOT a 4th branch). **This is the fix for "XS-3 didn't catch container
  routing" — XS-3 only fired on slug=None; this extends it to leaf-misresolution.**
- Accept: `sgs-product-card__body` no longer emits `sgs/text`; product-card
  children survive into the rendered card (live DOM). Per-section pixel-diff on
  all 7 sections shows no regression from the alias prune.

### G3 — Array-slot emission (~25 min)
- File: `convert.py` universal path; wire `db.array_item_slot_for()`.
- Emit one child block per array item. **Pills → `sgs/button` (interactive
  selector), NOT `sgs/label` (eyebrow block)** — per Bean. Confirm the target
  via the block's `canonical_slot`, not a hardcoded map (R-22-1).
- Accept: pill-group emits N buttons each with its label; no blank labels.

## Acceptance (phase)

- featured-product + social-proof render their real content on live page 144
  (live DOM textLen > 0; product name/price/description + testimonial quotes visible).
- Per-section pixel-diff drops materially on those two sections (verify the drop
  is real content, not a crop artefact — compare live DOM, not just the number).
- No regression on the other 5 body sections (R-22-4, all 7 checked).
- /qc-council PASS on the converter changes.
- Then: build + deploy, generate passing visual-diff reports for the 3 migrated
  blocks, and MERGE feat/fr22-6-content-render → main (the block migrations'
  visual gate will pass once content renders).

## Then (Spec 24 Phase A proper)
- Deploy CPT + seed the 2 products (work around the `wp eval-file` content-guard
  hook: create via `wp post create` over SSH or wp.data via Playwright).
- Decide per-site opt-in gating for the CPT.
- Build dual-mode card binding (FR-24-2/3) once Typed mode renders.

## Risk / guardrails
- G2 alias prune has cross-section blast radius — measure all 7 sections, qc-council hardest here.
- Roll back fast on regression (STOP #19); refine across a session boundary, don't iterate inline.
- block_composition must be refreshed (G4) BEFORE G2's guard relies on it.
