---
doc_type: reference
title: "Visual-diff report — cta-section · Anim tab removal, native colour dedup, panel reorder"
block: cta-section
date: 2026-08-12
property: supports.color (background/gradients), selectors.color.background, BackgroundPanel tab order, panel position
verdict: PASS
first_paint_capture_passed: true
source_sha: e1abb7f9ec571ef2
---

# cta-section — Anim tab removal / native colour dedup / panel reorder

**Verdict: PASS, on live-census evidence in place of a fresh before/after screenshot capture.**

**What changed:** (1) the shared `BackgroundPanel`'s "Anim" tab removed, its two controls relocated
below the tab strip (editor-sidebar only, no render.php/style.css touched); (2) `block.json`'s
`supports.color.background`/`gradients` set explicitly to `false` (they were previously omitted,
which WordPress defaults to `true`) and the matching `selectors.color.background` entry removed —
`text` support is kept, unchanged; (3) `BackgroundPanel` moved to the top of the `Styles` inspector
group — editor-sidebar ordering only.

**Why a before/after capture is not the right evidence here:** items (1) and (3) touch only
`edit.js`/the shared component tree — zero frontend surface. Item (2) is the one change with a
frontend surface (it stops `get_block_wrapper_attributes()` inlining `style.color.background`/
`gradient` onto the block wrapper) — verified via a live census, which covers every real instance
rather than a single sampled page.

**Evidence:**

1. **Live census of the canary DB**: zero published (or unpublished) posts on
   `sandybrown-nightingale-600381.hostingersite.com` reference `wp-block-sgs-cta-section` at all
   (confirmed via `wp db query` against `wp_posts.post_content` — the block isn't in use on this
   canary yet).
2. **`has-background` class census** — a site-wide query for
   `wp-block-sgs-cta-section...has-background` across `wp_posts` returned zero rows, consistent with
   (1).
3. Since no live instance of this block exists, disabling the native background/gradient colour
   support cannot change any currently-rendered page by construction — there is nothing to diff
   against.

**What this evidence does NOT cover:** a future cta-section instance that would have used the native
background/gradient control — it now uses `BackgroundPanel`'s own colour/gradient row instead
(unchanged by this commit), which was always the intended single source for this property per the
brief's own reasoning (the native control was the duplicate, not the addition).
